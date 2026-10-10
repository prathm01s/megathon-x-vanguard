"use client";

// NGO Admin Dashboard (§4.7, §9.2 #19, §15.6 #11). Owner: Prathmesh.
import { useState, useEffect } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/lib/data";
import {
  generateStudentCodes,
  revokeStudentCode,
  resetStudentPassword,
  signUpNgo,
  loginUser,
  sendJoinRequestByPlayerId,
  getOrgJoinRequests,
  createOrgGroup,
  getOrgGroups,
} from "@/lib/auth/actions";
import { content } from "@/lib/content";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  KeyRound,
  BarChart3,
  BookOpen,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
  Printer,
  UserPlus,
  Send,
  X,
} from "lucide-react";
import { uuid } from "@/lib/uuid";

export default function AdminPage() {
  const session = useSession();
  const [tab, setTab] = useState<"overview" | "codes" | "students" | "prompts">("overview");

  // Registration & Auth states if not signed in as ngo_admin
  const [ngoName, setNgoName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminNickname, setAdminNickname] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Code generation state
  const [codeCount, setCodeCount] = useState(5);
  const [codeLabel, setCodeLabel] = useState("");
  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<string[]>([]);
  const [codeLoading, setCodeLoading] = useState(false);

  // Groups / Batches state (§4.1, §4.6)
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([
    { id: "batch-a", name: "Batch A" },
    { id: "batch-b", name: "Batch B" },
  ]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Link personal learner state (§4.4)
  const [joinPlayerId, setJoinPlayerId] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [joinRequestsList, setJoinRequestsList] = useState<
    Array<{ id: string; status: string; createdAt: string; nickname: string; playerId: string }>
  >([
    {
      id: "req-1",
      status: "pending",
      createdAt: "Today",
      nickname: "Vikram",
      playerId: "TL-5M29R",
    },
  ]);

  // Print handouts sheet state (§4.3)
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Reset password modal state
  const [resetStudentId, setResetStudentId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Live Stats from Supabase Views or Mock
  const [stats, setStats] = useState({
    totalStudents: 34,
    active7d: 28,
    chaptersCompleted: 52,
    avgHealthScore: 74,
    scamFallRate: 18.5,
    preVsPost: {
      plan: { pre: 1.4, post: 3.1 },
      risk: { pre: 0.8, post: 1.6 },
      know: { pre: 2.2, post: 4.8 },
    },
    personas: [
      { name: "Safe Keeper", count: 14, color: "bg-blue-500" },
      { name: "Smart Planner", count: 11, color: "bg-emerald-500" },
      { name: "Moment Maker", count: 6, color: "bg-amber-500" },
      { name: "Thrill Seeker", count: 3, color: "bg-rose-500" },
    ],
  });

  const [codesList, setCodesList] = useState<
    { id: string; code: string; status: string; label: string | null; date: string }[]
  >([
    { id: "1", code: "ABCD-EFGH", status: "pending", label: "Batch A - Roll 1", date: "Today" },
    { id: "2", code: "JKMN-PQR2", status: "active", label: "Batch A - Roll 2", date: "Yesterday" },
    { id: "3", code: "STUV-WXYZ", status: "active", label: "Batch A - Roll 3", date: "2 days ago" },
  ]);

  const [studentsList, setStudentsList] = useState<
    {
      id: string;
      nickname: string;
      playerId: string;
      persona: string;
      chapter: string;
      score: number;
      badges: number;
    }[]
  >([
    {
      id: "s1",
      nickname: "Aarav",
      playerId: "TL-7K92M",
      persona: "Safe Keeper",
      chapter: "Ch 2",
      score: 82,
      badges: 3,
    },
    {
      id: "s2",
      nickname: "Fatima",
      playerId: "TL-3P49X",
      persona: "Smart Planner",
      chapter: "Ch 2",
      score: 88,
      badges: 4,
    },
    {
      id: "s3",
      nickname: "Rohan",
      playerId: "TL-8Q11W",
      persona: "Moment Maker",
      chapter: "Ch 2",
      score: 65,
      badges: 2,
    },
    {
      id: "s4",
      nickname: "Sneha",
      playerId: "TL-9B54Z",
      persona: "Thrill Seeker",
      chapter: "Ch 1",
      score: 58,
      badges: 1,
    },
  ]);

  // Load live data from Supabase if admin is logged in
  useEffect(() => {
    async function loadAdminData() {
      if (!session.user || session.role !== "ngo_admin") return;
      try {
        const supabase = createClient();

        // Query student codes
        const { data: codes } = await supabase
          .from("student_codes")
          .select("id, code_last4, status, label, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (codes && codes.length > 0) {
          setCodesList(
            codes.map((c) => ({
              id: c.id,
              code: `••••-${c.code_last4}`,
              status: c.status,
              label: c.label,
              date: new Date(c.created_at).toLocaleDateString(),
            })),
          );
        }

        // Students with their real persona, chapter, score and badges (org_student_detail_v).
        const { data: students } = await supabase
          .from("org_student_detail_v")
          .select(
            "user_id, nickname, player_id, persona_id, latest_chapter_id, avg_health_score, badges_count",
          )
          .order("nickname")
          .limit(200);

        const personaName = (id: string | null) =>
          content.personas.personas.find((p) => p.id === id)?.name.en ?? "Not assessed";
        const chapterLabel = (id: string | null) => {
          const ch = content.chapters.find((c) => c.id === id);
          return ch ? `Ch ${ch.order}` : "—";
        };

        if (students) {
          setStudentsList(
            students.map((s) => ({
              id: s.user_id ?? "",
              nickname: s.nickname ?? "",
              playerId: s.player_id ?? "",
              persona: personaName(s.persona_id),
              chapter: chapterLabel(s.latest_chapter_id),
              score: Math.round(Number(s.avg_health_score ?? 0)),
              badges: Number(s.badges_count ?? 0),
            })),
          );
        }

        // Class statistics from the dashboard views (§4.7). The initial numbers above are only
        // sample data for running without Supabase.
        const [engagement, chapters, scams, gain, personas] = await Promise.all([
          supabase.from("org_engagement_v").select("*").maybeSingle(),
          supabase.from("org_chapter_stats_v").select("*"),
          supabase.from("org_scam_stats_v").select("*").maybeSingle(),
          supabase.from("org_learning_gain_v").select("*").maybeSingle(),
          supabase.from("org_persona_distribution_v").select("*"),
        ]);

        const chapterRows = chapters.data ?? [];
        const attempts = chapterRows.reduce((n, r) => n + Number(r.attempts_count ?? 0), 0);
        const weightedScore = chapterRows.reduce(
          (n, r) => n + Number(r.avg_health_score ?? 0) * Number(r.attempts_count ?? 0),
          0,
        );
        const PERSONA_COLORS: Record<string, string> = {
          "safe-keeper": "bg-blue-500",
          "smart-planner": "bg-emerald-500",
          "moment-maker": "bg-amber-500",
          "thrill-seeker": "bg-rose-500",
        };
        const round1 = (x: unknown) => Math.round(Number(x ?? 0) * 10) / 10;

        setStats((prev) => ({
          ...prev,
          totalStudents: Number(engagement.data?.total_students ?? students?.length ?? 0),
          active7d: Number(engagement.data?.active_students_7d ?? 0),
          chaptersCompleted: Number(engagement.data?.completed_chapters ?? 0),
          avgHealthScore: attempts ? Math.round(weightedScore / attempts) : 0,
          scamFallRate: round1(scams.data?.fall_rate),
          preVsPost: {
            plan: { pre: round1(gain.data?.pre_avg_plan), post: round1(gain.data?.post_avg_plan) },
            risk: { pre: round1(gain.data?.pre_avg_risk), post: round1(gain.data?.post_avg_risk) },
            know: { pre: round1(gain.data?.pre_avg_know), post: round1(gain.data?.post_avg_know) },
          },
          personas: (personas.data ?? [])
            .filter((p) => p.persona_id !== "unassigned")
            .sort((a, b) => Number(b.student_count ?? 0) - Number(a.student_count ?? 0))
            .map((p) => ({
              name: personaName(p.persona_id),
              count: Number(p.student_count ?? 0),
              color: PERSONA_COLORS[p.persona_id ?? ""] ?? "bg-slate-500",
            })),
        }));
        // Query groups
        const groupsRes = await getOrgGroups();
        if (groupsRes.success && groupsRes.data && groupsRes.data.length > 0) {
          setGroupsList(groupsRes.data);
        }

        // Query join requests
        const reqRes = await getOrgJoinRequests();
        if (reqRes.success && reqRes.data) {
          setJoinRequestsList(reqRes.data);
        }
      } catch (err) {
        console.warn("Could not fetch remote admin stats:", err);
      }
    }
    loadAdminData();
  }, [session.user, session.role]);

  // Handle Group Creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const res = await createOrgGroup(newGroupName.trim());
    if (res.success && res.data) {
      setGroupsList((prev) => [...prev, res.data!]);
      setSelectedGroupId(res.data.id);
      setNewGroupName("");
      setIsCreatingGroup(false);
    }
  };

  // Handle Send Join Request
  const handleSendJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPlayerId.trim()) return;
    setJoinLoading(true);
    setJoinMessage(null);
    const res = await sendJoinRequestByPlayerId(joinPlayerId);
    setJoinLoading(false);
    if (!res.success) {
      setJoinMessage({ text: res.error || "Failed to send request.", error: true });
    } else {
      setJoinMessage({
        text: `Invitation sent to ${res.data?.nickname}! Pending their approval in-app.`,
      });
      setJoinPlayerId("");
      const reqRes = await getOrgJoinRequests();
      if (reqRes.success && reqRes.data) {
        setJoinRequestsList(reqRes.data);
      }
    }
  };

  // Handle NGO Signup
  const handleNgoRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await signUpNgo({
      ngoName,
      adminEmail,
      username: adminUsername,
      nickname: adminNickname,
      password: adminPassword,
    });
    if (!res.success) {
      setAuthError(res.error || "Failed to register NGO.");
    } else {
      setAuthSuccess("NGO account created! Signing in...");
      window.location.reload();
    }
  };

  // Handle NGO Login
  const handleNgoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await loginUser({
      identifier: adminEmail,
      password: adminPassword,
    });
    if (!res.success) {
      setAuthError(res.error || "Login failed.");
    } else {
      window.location.reload();
    }
  };

  // Handle Code Generation
  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeLoading(true);
    const groupName = groupsList.find((g) => g.id === selectedGroupId)?.name;
    const effectiveLabel = codeLabel.trim() || groupName || null;
    const res = await generateStudentCodes({
      count: codeCount,
      label: effectiveLabel || undefined,
      groupId: selectedGroupId !== "all" ? selectedGroupId : undefined,
    });
    setCodeLoading(false);
    if (res.success && res.data?.codes) {
      setNewlyGeneratedCodes(res.data.codes);
      const newItems = res.data.codes.map((c) => ({
        id: uuid(),
        code: c,
        status: "pending",
        label: effectiveLabel,
        date: "Just now",
      }));
      setCodesList((prev) => [...newItems, ...prev]);
    }
  };

  // Handle Revoke
  const handleRevoke = async (id: string) => {
    await revokeStudentCode(id);
    setCodesList((prev) => prev.map((c) => (c.id === id ? { ...c, status: "revoked" } : c)));
  };

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudentId || !newPassword) return;
    const res = await resetStudentPassword(resetStudentId, newPassword);
    if (res.success) {
      setResetMessage("Password reset successfully!");
      setTimeout(() => {
        setResetStudentId(null);
        setNewPassword("");
        setResetMessage(null);
      }, 1500);
    } else {
      setResetMessage(res.error || "Failed to reset password.");
    }
  };

  // Export CSV helper
  const exportCodesCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Code,Status,Label,Date"]
        .concat(codesList.map((c) => `"${c.code}","${c.status}","${c.label || ""}","${c.date}"`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "toss_life_student_codes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user is not logged in as NGO Admin, show NGO login/signup
  const isNgoAdmin = session.role === "ngo_admin";

  return (
    <AppShell>
      <div className="flex flex-1 flex-col gap-4 py-2">
        {!isNgoAdmin ? (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold">NGO Facilitator Portal</h1>
              <p className="text-sm text-muted-foreground">
                Manage student cohorts, generate single-use codes, and view learning impact
                analytics (§4.7).
              </p>
            </div>

            {authError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            <Card className="p-5">
              <div className="mb-4 flex border-b border-border pb-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors ${
                    !isRegistering
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  Admin Log In
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors ${
                    isRegistering
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  Register New NGO
                </button>
              </div>

              {!isRegistering ? (
                <form onSubmit={handleNgoLogin} className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      ADMIN EMAIL
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="admin@ngo.org"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">PASSWORD</label>
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full mt-2">
                    Log In to Dashboard
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleNgoRegister} className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      ORGANISATION NAME
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Hyderabad Youth Trust"
                      value={ngoName}
                      onChange={(e) => setNgoName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      ADMIN EMAIL
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="admin@hyderabadtrust.org"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        USERNAME
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="hyt_admin"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        NICKNAME
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Kavitha M."
                        value={adminNickname}
                        onChange={(e) => setAdminNickname(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">PASSWORD</label>
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full mt-2">
                    Create NGO Account
                  </Button>
                </form>
              )}
            </Card>
          </div>
        ) : (
          /* Logged In NGO Admin Portal */
          <div className="flex flex-col gap-4">
            {/* Top Navigation Tabs */}
            <div className="flex overflow-x-auto rounded-lg bg-muted p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTab("overview")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 whitespace-nowrap transition-all ${
                  tab === "overview"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <BarChart3 className="size-3.5" />
                Overview
              </button>
              <button
                type="button"
                onClick={() => setTab("codes")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 whitespace-nowrap transition-all ${
                  tab === "codes"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <KeyRound className="size-3.5" />
                Codes & Seats
              </button>
              <button
                type="button"
                onClick={() => setTab("students")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 whitespace-nowrap transition-all ${
                  tab === "students"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <Users className="size-3.5" />
                Students
              </button>
              <button
                type="button"
                onClick={() => setTab("prompts")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 whitespace-nowrap transition-all ${
                  tab === "prompts"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <BookOpen className="size-3.5" />
                Prompts
              </button>
            </div>

            {/* TAB 1: OVERVIEW & STATS */}
            {tab === "overview" && (
              <div className="flex flex-col gap-4">
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground font-medium">ENROLLED</p>
                    <p className="text-2xl font-black mt-1">{stats.totalStudents}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      {stats.active7d} active this week
                    </p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground font-medium">AVG HEALTH</p>
                    <p className="text-2xl font-black mt-1 text-primary">
                      {stats.avgHealthScore}/100
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {stats.chaptersCompleted} chapters passed
                    </p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground font-medium">SCAM SAFETY</p>
                    <p className="text-2xl font-black mt-1 text-rose-600">{stats.scamFallRate}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Scam fall rate</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground font-medium">SEATS LEFT</p>
                    <p className="text-2xl font-black mt-1">16</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Pending codes</p>
                  </Card>
                </div>

                {/* Learning Gain Card (§4.7) */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">Learning Gain (Pre vs Post)</h3>
                    <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      +118% Avg Gain
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-muted-foreground">
                          Planning & Budgeting
                        </span>
                        <span className="font-bold">
                          {stats.preVsPost.plan.pre} → {stats.preVsPost.plan.post} / 4.0
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                        <div
                          className="bg-primary/40 h-full"
                          style={{ width: `${(stats.preVsPost.plan.pre / 4) * 100}%` }}
                        />
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${((stats.preVsPost.plan.post - stats.preVsPost.plan.pre) / 4) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-muted-foreground">
                          Risk Understanding
                        </span>
                        <span className="font-bold">
                          {stats.preVsPost.risk.pre} → {stats.preVsPost.risk.post} / 2.0
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                        <div
                          className="bg-primary/40 h-full"
                          style={{ width: `${(stats.preVsPost.risk.pre / 2) * 100}%` }}
                        />
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${((stats.preVsPost.risk.post - stats.preVsPost.risk.pre) / 2) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-muted-foreground">
                          Investing & Safety Knowledge
                        </span>
                        <span className="font-bold">
                          {stats.preVsPost.know.pre} → {stats.preVsPost.know.post} / 6.0
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                        <div
                          className="bg-primary/40 h-full"
                          style={{ width: `${(stats.preVsPost.know.pre / 6) * 100}%` }}
                        />
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${((stats.preVsPost.know.post - stats.preVsPost.know.pre) / 6) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Persona Distribution */}
                <Card className="p-4">
                  <h3 className="font-bold text-sm mb-3">Money Mindset Personas</h3>
                  <div className="flex flex-col gap-2">
                    {stats.personas.map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`size-2.5 rounded-full ${p.color}`} />
                          <span className="font-medium">{p.name}</span>
                        </div>
                        <span className="font-bold">
                          {p.count} students ({Math.round((p.count / stats.totalStudents) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 2: CODES & SEATS (§4.3) */}
            {tab === "codes" && (
              <div className="flex flex-col gap-4">
                <Card className="p-4">
                  <h3 className="font-bold text-sm mb-2">Generate Student Codes</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Generate single-use codes (XXXX-XXXX) to hand out to students.
                  </p>
                  <form onSubmit={handleGenerateCodes} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">
                          QUANTITY
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={codeCount}
                          onChange={(e) => setCodeCount(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-muted-foreground">
                            BATCH / GROUP
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                            className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="size-3" />
                            {isCreatingGroup ? "Cancel" : "New"}
                          </button>
                        </div>
                        {isCreatingGroup ? (
                          <div className="mt-1 flex gap-1">
                            <input
                              type="text"
                              placeholder="Batch name"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                            />
                            <Button
                              type="button"
                              size="default"
                              className="h-[34px] px-2.5 text-xs shrink-0"
                              onClick={handleCreateGroup}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <select
                            value={selectedGroupId}
                            onChange={(e) => {
                              setSelectedGroupId(e.target.value);
                              if (e.target.value !== "all") {
                                const g = groupsList.find((grp) => grp.id === e.target.value);
                                if (g) setCodeLabel(g.name);
                              }
                            }}
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="all">None / Custom</option>
                            {groupsList.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    {selectedGroupId === "all" && !isCreatingGroup && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">
                          CUSTOM LABEL (OPTIONAL)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Batch A or Morning Cohort"
                          value={codeLabel}
                          onChange={(e) => setCodeLabel(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    )}
                    <Button type="submit" disabled={codeLoading} className="w-full">
                      <Plus className="size-4" />
                      {codeLoading ? "Generating..." : `Generate ${codeCount} Codes`}
                    </Button>
                  </form>

                  {newlyGeneratedCodes.length > 0 && (
                    <div className="mt-4 rounded-lg bg-primary/10 border border-primary/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-primary">New Codes Generated:</p>
                        <Button
                          size="default"
                          variant="ghost"
                          onClick={() => setShowPrintModal(true)}
                          className="h-6 text-[11px] font-bold text-primary gap-1"
                        >
                          <Printer className="size-3" />
                          Print Slips
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-xs font-bold">
                        {newlyGeneratedCodes.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-background px-2 py-1 border text-center"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Codes list */}
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Issued Codes ({codesList.length})</h3>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="default"
                      variant="outline"
                      onClick={() => setShowPrintModal(true)}
                      className="h-8 text-xs gap-1"
                    >
                      <Printer className="size-3.5" />
                      Print Slips
                    </Button>
                    <Button
                      size="default"
                      variant="outline"
                      onClick={exportCodesCsv}
                      className="h-8 text-xs gap-1"
                    >
                      <Download className="size-3.5" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {codesList.map((c) => (
                    <Card key={c.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-mono font-bold text-sm">{c.code}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {c.label || "No label"} • {c.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            c.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : c.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.status}
                        </span>
                        {c.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(c.id)}
                            className="text-destructive font-semibold hover:underline text-[11px]"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: STUDENTS LIST (§4.7) */}
            {tab === "students" && (
              <div className="flex flex-col gap-3">
                {/* Link Personal Learner Card (§4.4) */}
                <Card className="p-4 border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="size-4 text-primary" />
                    <h4 className="font-bold text-sm text-primary">Link Personal Learner</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Students who registered on their own can share their Player ID (e.g. TL-8M29R).
                    Sending an invitation links them to your NGO cohort once accepted in their
                    Profile.
                  </p>
                  <form onSubmit={handleSendJoinRequest} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Player ID (e.g. TL-5M29R)"
                      value={joinPlayerId}
                      onChange={(e) => setJoinPlayerId(e.target.value.toUpperCase())}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono uppercase focus:border-primary focus:outline-none"
                    />
                    <Button
                      type="submit"
                      size="default"
                      disabled={joinLoading}
                      className="h-8 text-xs font-bold gap-1 shrink-0"
                    >
                      <Send className="size-3" />
                      {joinLoading ? "Sending..." : "Send Invite"}
                    </Button>
                  </form>

                  {joinMessage && (
                    <div
                      className={`mt-2 flex items-center gap-1.5 text-xs font-medium p-2 rounded-md ${
                        joinMessage.error
                          ? "bg-destructive/10 text-destructive"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {joinMessage.error ? (
                        <AlertCircle className="size-3.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      )}
                      <span>{joinMessage.text}</span>
                    </div>
                  )}

                  {/* Sent Invitations Table/List */}
                  {joinRequestsList.length > 0 && (
                    <div className="mt-4 border-t border-border/60 pt-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Sent Join Invitations ({joinRequestsList.length})
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {joinRequestsList.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between rounded-lg bg-background border px-3 py-1.5 text-xs"
                          >
                            <div>
                              <span className="font-bold">{req.nickname}</span>
                              <span className="text-[10px] font-mono text-muted-foreground ml-2">
                                {req.playerId}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                  req.status === "pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : req.status === "accepted"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {req.status}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {req.createdAt}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm">Students Cohort</h3>
                    <span className="text-xs text-muted-foreground">
                      {studentsList.length} learners
                    </span>
                  </div>
                  {groupsList.length > 0 && (
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
                    >
                      <option value="all">All Batches</option>
                      {groupsList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {studentsList.map((s) => (
                    <Card key={s.id} className="p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">{s.nickname}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {s.playerId} • {s.persona}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-sm">{s.score} pts</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.badges} badges earned
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setResetStudentId(s.id)}
                          className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                        >
                          <Lock className="size-3" />
                          Reset Password
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Password reset dialog */}
                {resetStudentId && (
                  <Card className="p-4 border-primary">
                    <h4 className="font-bold text-xs mb-2">Set New Password for Student</h4>
                    <form onSubmit={handleResetPassword} className="flex flex-col gap-2">
                      <input
                        required
                        type="password"
                        placeholder="New password (min 4 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded border border-input bg-background px-3 py-1.5 text-xs"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="default" className="h-8 text-xs flex-1">
                          Confirm Reset
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setResetStudentId(null)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                      {resetMessage && (
                        <p className="text-xs text-primary font-semibold mt-1">{resetMessage}</p>
                      )}
                    </form>
                  </Card>
                )}
              </div>
            )}

            {/* TAB 4: DISCUSSION PROMPTS (§8.15) */}
            {tab === "prompts" && (
              <div className="flex flex-col gap-3">
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <h3 className="font-bold text-sm text-primary mb-1">
                    Chapter 2 Discussion Guide
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Use these prompts during NGO classroom reflection after students play Chapter 2.
                  </p>
                </Card>

                <Card className="p-4 flex flex-col gap-1.5">
                  <p className="font-bold text-xs text-primary">1. Investment Trade-offs</p>
                  <p className="text-sm">
                    &quot;Who chose an FD and who chose a SIP? How did the market storm feel when it
                    hit?&quot;
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Goal: Highlight patience during market dips vs. cash loss to inflation.
                  </p>
                </Card>

                <Card className="p-4 flex flex-col gap-1.5">
                  <p className="font-bold text-xs text-primary">2. Peer Loans</p>
                  <p className="text-sm">
                    &quot;Did anyone lend money to a peer? Was the interest rate fair, or did anyone
                    face a default?&quot;
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Goal: Discuss trust scores and lending obligations.
                  </p>
                </Card>

                <Card className="p-4 flex flex-col gap-1.5">
                  <p className="font-bold text-xs text-primary">3. Scam Safety</p>
                  <p className="text-sm">
                    &quot;Which scam almost fooled you, and what red flags gave it away?&quot;
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Goal: Reinforce that banks never ask for OTPs or upfront processing fees.
                  </p>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* PRINTABLE SLIPS MODAL (§4.3, §15.6 #6) */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm overflow-y-auto p-4 sm:p-8">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-slips-container, #printable-slips-container * {
                  visibility: visible !important;
                }
                #printable-slips-container {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  padding: 8mm !important;
                  margin: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* Modal Controls Bar (Hidden during print) */}
            <div className="no-print flex items-center justify-between border-b pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold">Printable Student Access Passes</h2>
                <p className="text-xs text-muted-foreground">
                  Cut along the dotted guidelines and hand out to students for onboarding at /join.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="default"
                  onClick={() => window.print()}
                  className="h-9 gap-1.5 font-bold"
                >
                  <Printer className="size-4" />
                  Print Passes
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => setShowPrintModal(false)}
                  className="h-9 px-3"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Printable Slips Grid */}
            <div
              id="printable-slips-container"
              className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:m-0"
            >
              {codesList
                .filter((c) => c.status === "pending")
                .map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border-2 border-dashed border-primary/40 bg-card p-5 text-card-foreground shadow-sm flex flex-col justify-between break-inside-avoid print:border-gray-400 print:text-black print:bg-white"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black tracking-tight text-primary print:text-black">
                            TOSS LIFE
                          </span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted print:border print:border-gray-300">
                            Student Pass
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {c.label || "Cohort Batch"}
                        </span>
                      </div>

                      <div className="text-center py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Single-Use Access Code
                        </p>
                        <p className="text-2xl font-mono font-black tracking-widest text-primary print:text-black bg-primary/5 py-2 rounded-lg border border-primary/20 print:border-gray-300">
                          {c.code}
                        </p>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                        <p className="font-semibold text-foreground print:text-black">
                          How to join the simulator:
                        </p>
                        <p>
                          1. Open your browser and go to{" "}
                          <strong className="text-primary font-mono print:text-black">/join</strong>
                        </p>
                        <p>2. Enter your 8-digit access code above</p>
                        <p>3. Choose your secret username and password</p>
                        <p>4. Complete the mindset check and start Chapter 1!</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-dashed border-border/60 text-[10px] text-muted-foreground flex justify-between items-center print:border-gray-300">
                      <span>✂️ Cut along dashed line</span>
                      <span>Single-use code • Keep private</span>
                    </div>
                  </div>
                ))}

              {codesList.filter((c) => c.status === "pending").length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">
                  No pending codes available to print. Generate a new batch of codes first!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
