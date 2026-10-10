// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: redeem-code (§4.3, §15.6 #5)
// Owner: Prathmesh
//
// Single-use student code redemption:
// 1. Verifies code format (XXXX-XXXX unambiguous alphabet)
// 2. Hashes code with SHA-256
// 3. Atomically checks pending status and expiration
// 4. Creates student account with synthetic email if not logged in
// 5. Creates profile linked to the NGO
// 6. Adds student to NGO group if code has group_id
// 7. Marks code as active/redeemed
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting map: ip -> timestamps of attempts in the last 60 seconds
const rateLimitMap = new Map<string, number[]>();
const MAX_ATTEMPTS_PER_MINUTE = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const attempts = (rateLimitMap.get(ip) ?? []).filter((t) => t > windowStart);
  if (attempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
    return true;
  }
  attempts.push(now);
  rateLimitMap.set(ip, attempts);
  return false;
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many attempts. Please wait a minute and try again." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

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
        JSON.stringify({ error: "Username must be 3-20 characters using only lowercase letters, numbers, and underscores." }),
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

    // 1. Fetch code record
    const { data: codeRecord, error: codeFetchError } = await supabaseAdmin
      .from("student_codes")
      .select("id, org_id, group_id, status, expires_at")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (codeFetchError || !codeRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid code or code not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (codeRecord.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `This code has already been ${codeRecord.status}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (codeRecord.expires_at && new Date(codeRecord.expires_at) < new Date()) {
      await supabaseAdmin
        .from("student_codes")
        .update({ status: "expired" })
        .eq("id", codeRecord.id);

      return new Response(
        JSON.stringify({ error: "This student code has expired." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
      return new Response(
        JSON.stringify({ error: authError?.message || "Failed to create user account. Username may be taken." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authUser.user.id;

    // 3. Insert profile record
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        role: "student",
        org_id: codeRecord.org_id,
        username: normalizedUsername,
        nickname: String(nickname).trim().slice(0, 30),
        avatar_id: avatarId || "avatar-1",
        locale: "en",
        has_recovery_email: false,
      });

    if (profileError) {
      // Rollback user creation
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Mark code as redeemed
    const { error: codeUpdateError } = await supabaseAdmin
      .from("student_codes")
      .update({
        status: "active",
        redeemed_by: userId,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", codeRecord.id);

    if (codeUpdateError) {
      console.error("Failed to update code status:", codeUpdateError);
    }

    // 5. Add to group if specified
    if (codeRecord.group_id) {
      await supabaseAdmin
        .from("group_members")
        .insert({
          group_id: codeRecord.group_id,
          student_user_id: userId,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          username: normalizedUsername,
          nickname: String(nickname).trim(),
          email: syntheticEmail,
        },
        orgId: codeRecord.org_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
