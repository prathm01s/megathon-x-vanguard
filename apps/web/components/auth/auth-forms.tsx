"use client";

// Email + password accounts for students and NGOs (§4.2, simplified 2026-10-11):
// Log in · Create account · Set up your profile. Owner: Prathmesh (public flow).
import { AlertCircle, Building2, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import {
  completeNgoProfile,
  completeStudentProfile,
  loginUser,
  signUpWithEmail,
} from "@/lib/auth/actions";
import { AVATARS, homeFor } from "@/lib/auth/account";
import { refreshSession, useSession } from "@/lib/data";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full min-h-12 rounded-lg border-2 border-border bg-background px-3 text-base focus:border-primary focus:outline-none";

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {help && <span className="text-xs text-muted-foreground">{help}</span>}
    </label>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertCircle className="size-4 shrink-0" />
      {message}
    </p>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** Signed-in users who open log in / sign up go straight to where they belong. */
function useRedirectIfSignedIn() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session.status === "ready" || session.status === "needs-setup") {
      router.replace(homeFor(session));
    }
  }, [session, router]);
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  useRedirectIfSignedIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await loginUser({ identifier: email, password });
    if (!res.success || !res.data) {
      setError(res.error ?? t("genericError"));
      setBusy(false);
      return;
    }
    await refreshSession();
    router.replace(res.data.redirect);
  }

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 py-6">
      <Heading title={t("loginTitle")} subtitle={t("loginSubtitle")} />
      <Card className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t("email")}>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={inputClass}
            />
          </Field>
          <Field label={t("password")}>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className={inputClass}
            />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? t("loggingIn") : t("loginButton")}
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-bold text-primary underline underline-offset-4">
          {t("createOne")}
        </Link>
      </p>
    </section>
  );
}

export function SignupForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  useRedirectIfSignedIn();
  const [accountType, setAccountType] = useState<"student" | "ngo_admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signUpWithEmail({ email, password, accountType });
    if (!res.success || !res.data) {
      setError(res.error ?? t("genericError"));
      setBusy(false);
      return;
    }
    await refreshSession();
    router.replace(res.data.redirect);
  }

  const types = [
    { id: "student" as const, label: t("student"), Icon: GraduationCap },
    { id: "ngo_admin" as const, label: t("ngo"), Icon: Building2 },
  ];

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 py-6">
      <Heading title={t("signupTitle")} subtitle={t("signupSubtitle")} />
      <Card className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">{t("iAm")}</span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("iAm")}>
              {types.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={accountType === id}
                  onClick={() => setAccountType(id)}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 font-bold transition-colors",
                    accountType === id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Field label={t("email")}>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={inputClass}
            />
          </Field>
          <Field label={t("password")}>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("newPasswordPlaceholder")}
              className={inputClass}
            />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? t("creating") : t("signupButton")}
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-bold text-primary underline underline-offset-4">
          {t("logIn")}
        </Link>
      </p>
    </section>
  );
}

export function ProfileSetupForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const session = useSession();
  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState<string>(AVATARS[0].id);
  const [code, setCode] = useState("");
  const [ngoName, setNgoName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only for signed-in users without a profile.
  useEffect(() => {
    if (session.status === "signed-out" || session.status === "ready") {
      router.replace(homeFor(session));
    }
  }, [session, router]);

  if (session.status !== "needs-setup") {
    return <p className="py-16 text-center text-muted-foreground">{t("loading")}</p>;
  }
  const isNgo = session.accountType === "ngo_admin";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = isNgo
      ? await completeNgoProfile({ ngoName, nickname })
      : await completeStudentProfile({ nickname, avatarId, code });
    if (!res.success || !res.data) {
      setError(res.error ?? t("genericError"));
      setBusy(false);
      return;
    }
    await refreshSession();
    router.replace(res.data.redirect);
  }

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 py-6">
      <Heading
        title={t("setupTitle")}
        subtitle={isNgo ? t("setupNgoSubtitle") : t("setupStudentSubtitle")}
      />
      <Card className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          {isNgo ? (
            <>
              <Field label={t("ngoName")}>
                <input
                  required
                  maxLength={80}
                  value={ngoName}
                  onChange={(e) => setNgoName(e.target.value)}
                  placeholder={t("ngoNamePlaceholder")}
                  className={inputClass}
                />
              </Field>
              <Field label={t("yourName")}>
                <input
                  required
                  maxLength={30}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t("yourNamePlaceholder")}
                  className={inputClass}
                />
              </Field>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">{t("avatar")}</span>
                <div
                  className="flex justify-between gap-2"
                  role="radiogroup"
                  aria-label={t("avatar")}
                >
                  {AVATARS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={avatarId === a.id}
                      aria-label={a.label}
                      onClick={() => setAvatarId(a.id)}
                      className={cn(
                        "grid size-14 place-items-center rounded-full border-2 text-3xl transition-transform",
                        avatarId === a.id
                          ? "scale-110 border-primary bg-primary/10"
                          : "border-border bg-card",
                      )}
                    >
                      <span aria-hidden>{a.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Field label={t("nickname")} help={t("nicknameHelp")}>
                <input
                  required
                  maxLength={30}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t("nicknamePlaceholder")}
                  className={inputClass}
                />
              </Field>
              <Field label={t("ngoCode")} help={t("ngoCodeHelp")}>
                <input
                  maxLength={9}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  autoCapitalize="characters"
                  className={cn(inputClass, "font-mono tracking-widest uppercase")}
                />
              </Field>
            </>
          )}
          <ErrorNote message={error} />
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? t("saving") : t("saveProfile")}
          </Button>
        </form>
      </Card>
    </section>
  );
}
