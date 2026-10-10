"use server";

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions for Auth, Code Management, and Admin Operations (§4, §15.6)
// Owner: Prathmesh
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// Alphabet for student codes and player IDs (§4.3, no 0/O/1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let result = "";
  for (let i = 0; i < len; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

export async function hashString(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Redeem a student code to create a student account linked to the NGO (§4.3, Request 17)
 * Uses atomic Postgres RPC to prevent race conditions and enforce 5 attempts/min rate limit.
 */
export async function redeemStudentCode(formData: {
  code: string;
  username: string;
  nickname: string;
  password: string;
  avatarId?: string;
}): Promise<ActionResult<{ userId: string }>> {
  try {
    const { code, username, nickname, password, avatarId = "avatar-1" } = formData;
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    if (cleanCode.length !== 8) {
      return { success: false, error: "Code must be 8 characters (e.g. ABCD-EFGH)." };
    }

    const normalizedUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return {
        success: false,
        error: "Username must be 3-20 characters with letters, numbers, and underscores only.",
      };
    }

    // Extract client IP for persistent rate limiting (§4.3: 5 attempts/min)
    let clientIp = "127.0.0.1";
    try {
      const headerList = await headers();
      const forwarded = headerList.get("x-forwarded-for");
      if (forwarded) {
        clientIp = forwarded.split(",")[0]?.trim() || "127.0.0.1";
      } else {
        clientIp = headerList.get("x-real-ip") || "127.0.0.1";
      }
    } catch {
      clientIp = "127.0.0.1";
    }

    const codeHash = await hashString(cleanCode);
    const admin = createAdminClient();

    // 1. Atomically claim code using SECURITY DEFINER stored procedure
    const { data: claimData, error: claimErr } = await admin.rpc(
      "redeem_student_code_claim",
      {
        p_code_hash: codeHash,
        p_ip: clientIp,
      },
    );

    if (claimErr) {
      const msg = claimErr.message || "";
      if (msg.includes("rate_limit_exceeded")) {
        return { success: false, error: "Too many attempts. Please wait 60 seconds and try again." };
      }
      if (msg.includes("code_expired")) {
        return { success: false, error: "This student code has expired." };
      }
      if (msg.includes("code_already_used")) {
        return { success: false, error: "This student code has already been redeemed." };
      }
      if (msg.includes("code_revoked")) {
        return { success: false, error: "This student code has been revoked." };
      }
      return { success: false, error: "Student code not found or invalid." };
    }

    const claimRows = (claimData as Array<{ code_id: string; org_id: string; group_id: string | null }>) || [];
    if (!claimRows || claimRows.length === 0) {
      return { success: false, error: "Student code not found or invalid." };
    }

    const { code_id: codeId, org_id: orgId, group_id: groupId } = claimRows[0]!;

    // 2. Create synthetic student email
    const studentDomain = process.env.STUDENT_EMAIL_DOMAIN || "students.tosslife.invalid";
    const syntheticEmail = `${normalizedUsername}@${studentDomain}`;

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: normalizedUsername,
        nickname: nickname.trim(),
      },
    });

    if (authErr || !authUser.user) {
      // Rollback code claim if auth user creation fails
      await admin.rpc("redeem_student_code_revert", { p_code_id: codeId });
      return {
        success: false,
        error: authErr?.message || "Could not create user account. Username may be taken.",
      };
    }

    const userId = authUser.user.id;

    // 3. Create profile linked to NGO
    const { error: profileErr } = await admin.from("profiles").insert({
      user_id: userId,
      role: "student",
      org_id: orgId,
      username: normalizedUsername,
      nickname: nickname.trim().slice(0, 30),
      avatar_id: avatarId,
      locale: "en",
      has_recovery_email: false,
    });

    if (profileErr) {
      await admin.auth.admin.deleteUser(userId);
      await admin.rpc("redeem_student_code_revert", { p_code_id: codeId });
      return { success: false, error: `Failed to create student profile: ${profileErr.message}` };
    }

    // 4. Finalize code with redeemed user id
    await admin.rpc("redeem_student_code_finalize", {
      p_code_id: codeId,
      p_user_id: userId,
    });

    // 5. Add to group if specified
    if (groupId) {
      await admin.from("group_members").insert({
        group_id: groupId,
        student_user_id: userId,
      });
    }

    // 6. Sign the user in
    const client = await createClient();
    await client.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    return { success: true, data: { userId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error during redemption.",
    };
  }
}

/**
 * NGO Admin registration (§4.2)
 */
export async function signUpNgo(formData: {
  ngoName: string;
  adminEmail: string;
  password: string;
  username: string;
  nickname: string;
}): Promise<ActionResult<{ orgId: string }>> {
  try {
    const { ngoName, adminEmail, password, username, nickname } = formData;
    const client = await createClient();

    const { data: authData, error: authErr } = await client.auth.signUp({
      email: adminEmail,
      password,
    });

    if (authErr || !authData.user) {
      return { success: false, error: authErr?.message || "Failed to create admin user." };
    }

    // Call stored procedure to atomically create organisation and admin profile
    const admin = createAdminClient();
    const { data: orgId, error: rpcErr } = await admin.rpc("create_organization", {
      p_name: ngoName.trim(),
      p_username: username.toLowerCase().trim(),
      p_nickname: nickname.trim(),
    });

    if (rpcErr || !orgId) {
      return { success: false, error: rpcErr?.message || "Failed to set up organisation." };
    }

    return { success: true, data: { orgId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating NGO." };
  }
}

/**
 * Personal student registration without NGO (§4.2)
 */
export async function signUpPersonal(formData: {
  username: string;
  nickname: string;
  password: string;
  email?: string;
  avatarId?: string;
}): Promise<ActionResult<{ userId: string }>> {
  try {
    const { username, nickname, password, email, avatarId = "avatar-1" } = formData;
    const normalizedUsername = username.toLowerCase().trim();

    const studentDomain = process.env.STUDENT_EMAIL_DOMAIN || "students.tosslife.invalid";
    const syntheticEmail = email?.trim() || `${normalizedUsername}@${studentDomain}`;

    const admin = createAdminClient();
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { username: normalizedUsername, nickname: nickname.trim() },
    });

    if (authErr || !authUser.user) {
      return {
        success: false,
        error: authErr?.message || "Registration failed. Username may exist.",
      };
    }

    const userId = authUser.user.id;
    const { error: profileErr } = await admin.from("profiles").insert({
      user_id: userId,
      role: "student",
      org_id: null,
      username: normalizedUsername,
      nickname: nickname.trim(),
      avatar_id: avatarId,
      locale: "en",
      has_recovery_email: Boolean(email),
    });

    if (profileErr) {
      await admin.auth.admin.deleteUser(userId);
      return { success: false, error: profileErr.message };
    }

    const client = await createClient();
    await client.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    return { success: true, data: { userId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Registration error." };
  }
}

/**
 * Universal Login for students (by username or email) and NGO admins (§4.2, Requests 18 & 19)
 */
export async function loginUser(formData: {
  identifier: string;
  password: string;
}): Promise<ActionResult<{ role: string; redirect: string }>> {
  try {
    const { identifier, password } = formData;
    const studentDomain = process.env.STUDENT_EMAIL_DOMAIN || "students.tosslife.invalid";

    let emailToUse = identifier.trim();

    // If identifier doesn't contain '@', look up username in profiles
    // This allows personal learners who signed up with a real email to log in via username (§4.5, Request 18)
    if (!identifier.includes("@")) {
      const normalizedUsername = identifier.toLowerCase().trim();
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (profile?.user_id) {
        const { data: authUser } = await admin.auth.admin.getUserById(profile.user_id);
        if (authUser?.user?.email) {
          emailToUse = authUser.user.email;
        } else {
          emailToUse = `${normalizedUsername}@${studentDomain}`;
        }
      } else {
        emailToUse = `${normalizedUsername}@${studentDomain}`;
      }
    }

    const client = await createClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error || !data.user) {
      return { success: false, error: "Invalid username/email or password." };
    }

    // Fetch profile role
    const { data: profile } = await client
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    const role = profile?.role || "student";

    // Dynamic routing (§4.2, Request 19):
    // NGO admins route to /admin
    // Students without a completed mindset check or playthrough route to /mindset
    let redirect = "/admin";
    if (role === "student") {
      const { data: mindset } = await client
        .from("mindset_responses")
        .select("id")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();

      if (!mindset) {
        const { data: playthrough } = await client
          .from("playthroughs")
          .select("id")
          .eq("user_id", data.user.id)
          .limit(1)
          .maybeSingle();

        redirect = !playthrough ? "/mindset" : "/play";
      } else {
        redirect = "/play";
      }
    }

    return { success: true, data: { role, redirect } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Login failed." };
  }
}

/**
 * Log out
 */
export async function signOutUser(): Promise<void> {
  const client = await createClient();
  await client.auth.signOut();
}

/**
 * Admin: Generate single or bulk student codes (§4.3)
 */
export async function generateStudentCodes(params: {
  count: number;
  label?: string;
  groupId?: string;
  expiryDays?: number;
}): Promise<ActionResult<{ codes: string[] }>> {
  try {
    const client = await createClient();
    const { data: user } = await client.auth.getUser();
    if (!user.user) return { success: false, error: "Not authenticated" };

    const { data: org } = await client
      .from("organizations")
      .select("id, settings")
      .eq("admin_user_id", user.user.id)
      .single();

    if (!org) return { success: false, error: "Only NGO admins can generate codes." };

    const count = Math.min(Math.max(params.count || 1, 1), 100);
    const expiryDays = params.expiryDays ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const generatedCodes: string[] = [];
    const rowsToInsert = [];

    for (let i = 0; i < count; i++) {
      const raw = generateCode(8);
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
      generatedCodes.push(formatted);

      const codeHash = await hashString(raw);
      rowsToInsert.push({
        org_id: org.id,
        code_hash: codeHash,
        code_last4: raw.slice(4),
        label: params.label?.trim() || null,
        group_id: params.groupId || null,
        status: "pending" as const,
        expires_at: expiresAt.toISOString(),
        created_by: user.user.id,
      });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("student_codes").insert(rowsToInsert);
    if (error) return { success: false, error: error.message };

    revalidatePath("/[locale]/admin");
    return { success: true, data: { codes: generatedCodes } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate codes.",
    };
  }
}

/**
 * Admin: Revoke a pending student code (§4.3)
 */
export async function revokeStudentCode(codeId: string): Promise<ActionResult> {
  try {
    const client = await createClient();
    const { error } = await client
      .from("student_codes")
      .update({ status: "revoked" })
      .eq("id", codeId)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };
    revalidatePath("/[locale]/admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Revoke failed" };
  }
}

/**
 * Admin: Reset a student's password (§4.5)
 */
export async function resetStudentPassword(
  studentUserId: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    const client = await createClient();
    const { data: user } = await client.auth.getUser();
    if (!user.user) return { success: false, error: "Not authenticated" };

    const { data: isAuth } = await client.rpc("is_admin_of_student", {
      student_id: studentUserId,
    });

    if (!isAuth) return { success: false, error: "Unauthorized to manage this student." };

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(studentUserId, {
      password: newPassword,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Password reset failed" };
  }
}
