// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: redeem-code (§4.3, §15.6 #5, Request 17, 20)
// Owner: Prathmesh
//
// Single-use student code redemption:
// 1. Verifies code format (XXXX-XXXX unambiguous alphabet)
// 2. Hashes code with SHA-256
// 3. Atomically checks pending status, expiration, and rate limit via RPC
// 4. Creates student account with synthetic email
// 5. Creates profile linked to the NGO
// 6. Finalizes code claim and adds to group if specified
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "127.0.0.1";

  try {
    const { code, username, nickname, avatarId, password } = await req.json();

    if (!code || !username || !nickname || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: code, username, nickname, password." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clean code: remove dashes, spaces, uppercase
    const cleanCode = String(code).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (cleanCode.length !== 8) {
      return new Response(
        JSON.stringify({ error: "Invalid code format. Expected 8-character code (XXXX-XXXX)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate username: 3-20 characters, lowercase letters, digits, underscore (§4.5)
    const normalizedUsername = String(username).toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return new Response(
        JSON.stringify({
          error: "Username must be 3-20 characters using only lowercase letters, numbers, and underscores.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const codeHash = await sha256(cleanCode);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const studentDomain = Deno.env.get("STUDENT_EMAIL_DOMAIN") || "students.tosslife.invalid";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Atomically claim code using SECURITY DEFINER RPC
    const { data: claimData, error: claimErr } = await supabaseAdmin.rpc(
      "redeem_student_code_claim",
      {
        p_code_hash: codeHash,
        p_ip: clientIp,
      },
    );

    if (claimErr) {
      const msg = claimErr.message || "";
      if (msg.includes("rate_limit_exceeded")) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please wait 60 seconds and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (msg.includes("code_expired")) {
        return new Response(
          JSON.stringify({ error: "This student code has expired." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (msg.includes("code_already_used")) {
        return new Response(
          JSON.stringify({ error: "This student code has already been redeemed." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (msg.includes("code_revoked")) {
        return new Response(
          JSON.stringify({ error: "This student code has been revoked." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Invalid code or code not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const claimRows = (claimData as Array<{ code_id: string; org_id: string; group_id: string | null }>) || [];
    if (!claimRows || claimRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid code or code not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { code_id: codeId, org_id: orgId, group_id: groupId } = claimRows[0]!;

    // 2. Create synthetic email user in Supabase Auth
    const syntheticEmail = `${normalizedUsername}@${studentDomain}`;

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        username: normalizedUsername,
        nickname: String(nickname).trim(),
      },
    });

    if (authError || !authUser.user) {
      await supabaseAdmin.rpc("redeem_student_code_revert", { p_code_id: codeId });
      return new Response(
        JSON.stringify({
          error: authError?.message || "Failed to create user account. Username may be taken.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authUser.user.id;

    // 3. Insert profile record
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      role: "student",
      org_id: orgId,
      username: normalizedUsername,
      nickname: String(nickname).trim().slice(0, 30),
      avatar_id: avatarId || "avatar-1",
      locale: "en",
      has_recovery_email: false,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.rpc("redeem_student_code_revert", { p_code_id: codeId });
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Finalize code with redeemed user id
    await supabaseAdmin.rpc("redeem_student_code_finalize", {
      p_code_id: codeId,
      p_user_id: userId,
    });

    // 5. Add to group if specified
    if (groupId) {
      await supabaseAdmin.from("group_members").insert({
        group_id: groupId,
        student_user_id: userId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        orgId,
        username: normalizedUsername,
        nickname: String(nickname).trim(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
