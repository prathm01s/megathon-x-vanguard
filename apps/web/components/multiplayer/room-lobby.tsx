"use client";

import { Bot, Check, CheckCircle2, Clock, Copy, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RoomMember, RoomState } from "@toss/engine";

export interface RoomLobbyProps {
  room: RoomState;
  me: RoomMember | null;
  onToggleReady: () => void;
}

export function RoomLobby({ room, me, onToggleReady }: RoomLobbyProps) {
  const t = useTranslations("room");
  const [copied, setCopied] = useState(false);

  function copyCode() {
    void navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Room code card */}
      <Card className="space-y-3 p-5 text-center border-2 border-primary/40 bg-accent/20 shadow-md">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("code")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-4xl font-black tracking-widest text-foreground">
            {room.code}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={copyCode}
            aria-label={t("shareCode")}
            className="size-10 shrink-0"
          >
            {copied ? <Check className="size-5 text-gain" /> : <Copy className="size-5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("shareCode")}</p>
      </Card>

      {/* Roster of members */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Users className="size-4" />
            {t("players", { count: room.members.length, max: 6 })}
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {room.members.filter((m) => m.ready).length} / {room.members.length} {t("ready")}
          </span>
        </div>

        <ul className="space-y-2">
          {room.members.map((member) => {
            const isMe = member.id === me?.id;
            return (
              <li key={member.id}>
                <Card
                  className={`p-3.5 flex items-center justify-between transition-colors ${
                    member.ready ? "border-gain/40 bg-gain/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-accent text-foreground font-bold">
                      {member.isBot ? <Bot className="size-5 text-secondary" /> : member.nickname.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm leading-tight">
                          {member.nickname}
                        </span>
                        {isMe && (
                          <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                            {t("you")}
                          </span>
                        )}
                        {member.isBot && (
                          <span className="rounded bg-secondary/20 px-1.5 py-0.2 text-[10px] font-bold text-secondary">
                            {t("bot")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium mt-0.5">
                        <Shield className="size-3 text-coin" />
                        <span>Trust: {member.trustScore}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      member.ready
                        ? "bg-gain/20 text-gain"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {member.ready ? (
                      <>
                        <CheckCircle2 className="size-3.5" /> {t("ready")}
                      </>
                    ) : (
                      <>
                        <Clock className="size-3.5" /> {t("waiting")}
                      </>
                    )}
                  </span>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Ready Action Button */}
      <div className="pt-2">
        <Button
          size="lg"
          variant={me?.ready ? "outline" : "default"}
          className="w-full text-base font-extrabold shadow-lg"
          onClick={onToggleReady}
        >
          {me?.ready ? "Cancel Ready" : "I&apos;m Ready to Play!"}
        </Button>
      </div>
    </div>
  );
}
