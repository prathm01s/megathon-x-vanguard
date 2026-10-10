"use client";

import {
  Award,
  Building2,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { useSession } from "@/lib/data";
import { GameGate } from "./game-gate";
import { ContentIcon } from "./icon";
import { PersonaAvatar } from "./persona-reveal";
import { useGameStore } from "./store";
import { useLocalize } from "./use-localize";

export function ProfileScreen() {
  return (
    <GameGate>
      <ProfileView />
    </GameGate>
  );
}

function ProfileView() {
  const t = useTranslations("profile");
  const l = useLocalize();
  const session = useSession();

  const personaId = useGameStore((s) => s.personaId);
  const results = useGameStore((s) => s.results);
  const reset = useGameStore((s) => s.reset);

  const persona = content.personas.personas.find((p) => p.id === personaId);

  const [copied, setCopied] = useState(false);

  // All badges earned across chapters
  const allBadgeIds = Array.from(
    new Set(Object.values(results).flatMap((r) => r.badgesEarned ?? [])),
  );

  function copyPlayerId() {
    if (!session.profile?.playerId) return;
    void navigator.clipboard.writeText(session.profile.playerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const router = useRouter();

  function handleReset() {
    if (confirm(t("resetConfirm"))) {
      reset();
      router.push("/");
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 pb-12">
      <h1 className="text-2xl font-black">{t("title")}</h1>

      {/* Profile Card */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          {persona ? (
            <PersonaAvatar hint={persona.avatarHint} className="size-16 ring-4" />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-accent text-foreground">
              <User className="size-8" />
            </span>
          )}
          <div>
            <h2 className="text-xl font-extrabold">{session.profile?.nickname ?? "Student"}</h2>
            <p className="text-xs text-muted-foreground">@{session.profile?.username ?? "player"}</p>
          </div>
        </div>

        {/* Public Player ID for NGO linking (§4.4) */}
        <div className="rounded-xl border border-border bg-accent/30 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              {t("playerId")}
            </span>
            <button
              type="button"
              onClick={copyPlayerId}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <p className="font-mono text-lg font-black tracking-wider text-foreground">
            {session.profile?.playerId ?? "TL-7KQ2M"}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("playerIdHelp")}</p>
        </div>
      </Card>

      {/* NGO Status */}
      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
          <Building2 className="size-4" />
          <span>{t("ngo")}</span>
        </div>
        <p className="text-sm font-semibold">
          {session.org ? t("linkedNgo", { name: session.org.name }) : t("noNgo")}
        </p>
      </Card>

      {/* Persona Info */}
      {persona && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
            <Sparkles className="size-4 text-secondary" />
            <span>{t("persona")}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-extrabold">{l(persona.name)}</p>
              <p className="text-xs text-muted-foreground">{l(persona.strength)}</p>
            </div>
            <Link href="/persona">
              <Button size="default" variant="outline" className="h-8 text-xs font-bold">
                View Details
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Badges Collection */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
            <Award className="size-4 text-coin" />
            <span>{t("badges")}</span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {allBadgeIds.length} / {content.badges.badges.length}
          </span>
        </div>

        {allBadgeIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noBadges")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {allBadgeIds.map((id) => {
              const b = content.badges.badges.find((x) => x.id === id);
              if (!b) return null;
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border p-2.5 flex items-center gap-2 text-xs bg-accent/20"
                >
                  <span className="grid size-7 place-items-center rounded-lg bg-coin text-foreground shrink-0 shadow-sm">
                    <ContentIcon name={b.icon} className="size-3.5" />
                  </span>
                  <p className="font-bold leading-tight">{l(b.title)}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Settings / Danger Zone */}
      <Card className="space-y-3 p-4 border-loss/20">
        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          {t("settings")}
        </h3>
        <Button
          variant="outline"
          className="w-full text-xs font-bold text-loss hover:bg-loss/10 hover:text-loss border-loss/30"
          onClick={handleReset}
        >
          <RotateCcw className="size-4" /> {t("reset")}
        </Button>
      </Card>
    </div>
  );
}
