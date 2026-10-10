"use client";

import { ArrowRight, Gavel, Handshake, Plus, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { useRouter } from "@/i18n/navigation";

export default function RoomJoinPage() {
  const t = useTranslations("room");
  const router = useRouter();

  const [code, setCode] = useState("TOSS42");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/room/${code.trim().toUpperCase()}`);
    }
  }

  function handleCreate() {
    router.push("/room/TOSS42");
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col gap-5 py-4">
        {/* Header */}
        <div className="space-y-1 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Users className="size-3.5" />
            <span>Multiplayer Classroom</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("subtitle")}</p>
        </div>

        {/* Join form card */}
        <Card className="p-5 space-y-4 border-2 border-primary/30 shadow-lg bg-card">
          <form onSubmit={handleJoin} className="space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("enterCode")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TOSS42"
                className="w-full uppercase font-mono tracking-widest text-lg font-black rounded-xl border-2 border-border bg-background px-3 py-2 text-center focus:border-primary focus:outline-none"
              />
              <Button type="submit" size="lg" className="shrink-0 font-extrabold px-5">
                {t("join")}
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-2 text-[10px] uppercase font-bold text-muted-foreground absolute">
              or
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleCreate}
            className="w-full font-bold border-2 border-border"
          >
            <Plus className="size-4 mr-1.5 text-primary" />
            {t("create")} (Chapter 2)
          </Button>
        </Card>

        {/* What happens in Friends' Room */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Multiplayer Features
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            <Card className="p-3.5 flex items-start gap-3 border border-border">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Handshake className="size-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <h3 className="font-extrabold text-foreground">Peer Lending & Trust Score</h3>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Borrow from friends or institutional banks. Repaying on time builds your Trust
                  Score; predatory loan apps charge toxic 15% interest.
                </p>
              </div>
            </Card>

            <Card className="p-3.5 flex items-start gap-3 border border-border">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary">
                <Gavel className="size-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <h3 className="font-extrabold text-foreground">Opportunity Auctions</h3>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Place sealed bids on delivery bikes, commercial shops, and rental flats to earn
                  passive cash flow each turn.
                </p>
              </div>
            </Card>

            <Card className="p-3.5 flex items-start gap-3 border border-border">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gain/15 text-gain">
                <Sparkles className="size-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <h3 className="font-extrabold text-foreground">Mutual Fund Pooling</h3>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Can&apos;t afford a big asset alone? Pool money with friends to co-own assets and
                  split recurring profits proportionally.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
