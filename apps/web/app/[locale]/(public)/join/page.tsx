"use client";

// Student path choice → Student Code entry, personal signup, or login (§4.2). Owner: Prathmesh.
import { useState } from "react";
// Locale-aware router: keeps /te, /hi, /ur on redirects.
import { useRouter } from "@/i18n/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  redeemStudentCode,
  signUpPersonal,
  loginUser,
} from "@/lib/auth/actions";
import { GraduationCap, User, LogIn, CheckCircle2, AlertCircle } from "lucide-react";

const AVATARS = [
  { id: "avatar-1", emoji: "🦊", label: "Fox" },
  { id: "avatar-2", emoji: "🦉", label: "Owl" },
  { id: "avatar-3", emoji: "🐯", label: "Tiger" },
  { id: "avatar-4", emoji: "🐬", label: "Dolphin" },
  { id: "avatar-5", emoji: "🚀", label: "Rocket" },
];

export default function JoinPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"ngo" | "personal" | "login">("ngo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState("avatar-1");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const handleNgoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Auto-generate a username if student only gave a nickname
    const generatedUsername =
      username.trim() ||
      `${nickname.toLowerCase().replace(/[^a-z0-9_]/g, "")}_${code.slice(-4).toLowerCase()}`;

    const res = await redeemStudentCode({
      code: code.trim(),
      username: generatedUsername,
      nickname: nickname.trim(),
      password,
      avatarId,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to redeem code.");
    } else {
      setSuccess("Account created successfully! Redirecting...");
      // New students start with the Money Mindset Check (§4.2).
      setTimeout(() => router.push("/mindset"), 1000);
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signUpPersonal({
      username: username.trim(),
      nickname: nickname.trim(),
      password,
      email: email.trim() || undefined,
      avatarId,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to create personal account.");
    } else {
      setSuccess("Account created! Redirecting to game...");
      setTimeout(() => router.push("/mindset"), 1000);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await loginUser({
      identifier: username.trim(),
      password,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || "Invalid username or password.");
    } else {
      setSuccess("Logged in! Redirecting...");
      setTimeout(() => router.push(res.data?.redirect || "/play"), 800);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-1 flex-col justify-start gap-4 py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Start Your Journey</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "ngo" && "Enter your 8-digit Student Code from your NGO"}
            {tab === "personal" && "Create your personal learner profile"}
            {tab === "login" && "Welcome back! Enter your details"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-muted p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setTab("ngo");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 transition-all ${
              tab === "ngo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <GraduationCap className="size-4" />
            NGO Code
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("personal");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 transition-all ${
              tab === "personal" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <User className="size-4" />
            Personal
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 transition-all ${
              tab === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <LogIn className="size-4" />
            Log In
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form Container */}
        <Card className="flex flex-col gap-4 p-5">
          {tab === "ngo" && (
            <form onSubmit={handleNgoSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">STUDENT CODE</label>
                <input
                  required
                  type="text"
                  maxLength={9}
                  placeholder="XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg font-mono font-bold uppercase tracking-wider focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">8-character code given by your NGO facilitator</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">CHOOSE AN AVATAR</label>
                <div className="mt-1 flex justify-between gap-1">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvatarId(av.id)}
                      className={`size-11 rounded-full border text-xl flex items-center justify-center transition-transform ${
                        avatarId === av.id
                          ? "border-primary bg-primary/20 scale-110 shadow-sm"
                          : "border-border bg-muted/50"
                      }`}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">NICKNAME</label>
                <input
                  required
                  type="text"
                  maxLength={30}
                  placeholder="e.g. Sunny or Priya"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <p className="mt-0.5 text-[11px] text-muted-foreground">Avoid full names to protect your privacy (§6)</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">PASSWORD</label>
                <input
                  required
                  type="password"
                  minLength={4}
                  placeholder="At least 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
                {loading ? "Joining NGO..." : "Redeem Code & Start Playing"}
              </Button>
            </form>
          )}

          {tab === "personal" && (
            <form onSubmit={handlePersonalSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">USERNAME</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. coin_master24"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">CHOOSE AN AVATAR</label>
                <div className="mt-1 flex justify-between gap-1">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvatarId(av.id)}
                      className={`size-11 rounded-full border text-xl flex items-center justify-center transition-transform ${
                        avatarId === av.id
                          ? "border-primary bg-primary/20 scale-110 shadow-sm"
                          : "border-border bg-muted/50"
                      }`}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">NICKNAME</label>
                <input
                  required
                  type="text"
                  placeholder="How friends will see you"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">PASSWORD</label>
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">EMAIL (OPTIONAL FOR RECOVERY)</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          )}

          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">USERNAME OR EMAIL</label>
                <input
                  required
                  type="text"
                  placeholder="Your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">PASSWORD</label>
                <input
                  required
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
                {loading ? "Signing In..." : "Log In"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
