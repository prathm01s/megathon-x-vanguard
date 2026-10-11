"use client";

// The Time Machine: every chapter attempt is saved step by step. Students reopen a session,
// see what happened each year, ask "what if I hadn't?" about any choice, and replay from any
// point on a new branch. The engine is deterministic, so all of it is computed from the log.
import type { Locale } from "@toss/content";
import {
  replaySession,
  whatIfWithout,
  type AlternateOutcome,
  type ReplayPoint,
} from "@toss/engine";
import { GitBranch, History, MessageCircle, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { GameButton } from "@/components/ui/game-button";
import { Link, useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { formatShort } from "@/lib/format";
import { GAME_TEXT, INK, MUTED, PANEL } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import { GameGate } from "../game-gate";
import { MeeraChat } from "../guide/meera-chat";
import { ContentIcon } from "../icon";
import { useGameStore, type SavedSession } from "../store";
import { useLocalize } from "../use-localize";
import { LevelScene } from "../village/scenes";
import { actionIcon, describeAction } from "./describe";

function starsFor(r: SavedSession["result"]): number {
  if (!r?.passed) return 0;
  return r.healthScore >= 90 ? 3 : r.healthScore >= 75 ? 2 : 1;
}

export function SessionsList() {
  return (
    <GameGate>
      <List />
    </GameGate>
  );
}

function List() {
  const t = useTranslations("timeMachine");
  const l = useLocalize();
  const sessions = useGameStore((s) => s.sessions);
  return (
    <section className="flex flex-col gap-3 py-3 pb-28">
      <h1 className={cn(GAME_TEXT, "flex items-center gap-2 text-2xl")}>
        <History className="size-7 text-[#7c3aed]" aria-hidden /> {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      {sessions.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed p-4 text-center text-sm font-semibold text-muted-foreground">
          {t("empty")}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {sessions.map((s) => {
          const chapter = content.chapters.find((c) => c.id === s.chapterId);
          const stars = starsFor(s.result);
          return (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="flex items-stretch overflow-hidden rounded-2xl border-[3px] shadow-sm"
                style={{ borderColor: INK, background: PANEL, color: INK }}
              >
                <LevelScene scene={chapter?.scene} className="h-auto w-24 shrink-0" />
                <div className="min-w-0 flex-1 p-2.5">
                  <p className={cn(GAME_TEXT, "truncate text-lg leading-tight")}>
                    {chapter ? l(chapter.title) : s.chapterId}
                  </p>
                  <p className="text-xs font-bold" style={{ color: MUTED }}>
                    {new Date(s.startedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold">
                    {s.result ? (
                      <>
                        <span className="text-[#f5a524]">{"★".repeat(stars)}</span>
                        <span className="text-[#cbd5e1]">{"★".repeat(3 - stars)}</span>
                        <span>{t("score", { score: s.result.healthScore })}</span>
                      </>
                    ) : (
                      <span className="rounded-full bg-[#fff3b0] px-2">{t("inProgress")}</span>
                    )}
                    {s.branchOf && (
                      <span className="flex items-center gap-1 rounded-full bg-[#ede9fe] px-2 text-xs text-[#6d28d9]">
                        <GitBranch className="size-3" /> {t("branch")}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface TurnGroup {
  /** Index of the `advance` step that closes this period (undefined: not reached yet). */
  advance?: ReplayPoint;
  /** Decisions taken during this period, before the toss. */
  decisions: ReplayPoint[];
  turnNumber: number;
}

function groupByTurn(points: ReplayPoint[]): TurnGroup[] {
  const groups: TurnGroup[] = [];
  let current: TurnGroup = { decisions: [], turnNumber: 1 };
  for (const p of points) {
    if (p.step.kind === "act") current.decisions.push(p);
    else {
      current.advance = p;
      groups.push(current);
      current = { decisions: [], turnNumber: current.turnNumber + 1 };
    }
  }
  if (current.decisions.length > 0) groups.push(current);
  return groups;
}

/** Tiny line chart of wealth after each toss. */
function WealthChart({ points }: { points: ReplayPoint[] }) {
  const values = points.filter((p) => p.step.kind === "advance").map((p) => p.wealth);
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 300;
  const h = 70;
  const xy = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - ((v - min) / (max - min || 1)) * (h - 8) - 4,
  ]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full" aria-hidden>
      <polyline
        points={xy.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="#16a34a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#ffffff" stroke={INK} strokeWidth="2" />
      ))}
    </svg>
  );
}

export function SessionDetail({ id }: { id: string }) {
  return (
    <GameGate>
      <Detail id={id} />
    </GameGate>
  );
}

function Detail({ id }: { id: string }) {
  const t = useTranslations("timeMachine");
  const l = useLocalize();
  const locale = useLocale() as Locale;
  const router = useRouter();
  // "latest" opens the most recent session.
  const session = useGameStore((s) =>
    id === "latest" ? s.sessions[0] : s.sessions.find((x) => x.id === id),
  );
  const branchFrom = useGameStore((s) => s.branchFrom);
  const [whatIfs, setWhatIfs] = useState<Record<number, AlternateOutcome | "error">>({});
  const [chatOpen, setChatOpen] = useState(false);

  const replay = useMemo(() => {
    if (!session) return null;
    try {
      return replaySession(session.log, content);
    } catch {
      return null;
    }
  }, [session]);

  if (!session || !replay) {
    return <p className="py-16 text-center text-muted-foreground">{t("notFound")}</p>;
  }
  const chapter = content.chapters.find((c) => c.id === session.chapterId);
  const groups = groupByTurn(replay.points);
  const unit = chapter?.turnUnit ?? "year";

  function askWhatIf(stepIndex: number) {
    if (!session) return;
    try {
      setWhatIfs((w) => ({ ...w, [stepIndex]: whatIfWithout(session.log, stepIndex, content) }));
    } catch {
      setWhatIfs((w) => ({ ...w, [stepIndex]: "error" }));
    }
  }

  async function replayFrom(stepIndex: number) {
    if (!session) return;
    if (await branchFrom(session.id, stepIndex)) router.push("/play");
  }

  return (
    <section className="flex flex-col gap-3 py-3 pb-28" style={{ color: INK }}>
      <header
        className="overflow-hidden rounded-3xl border-[3px]"
        style={{ borderColor: INK, background: PANEL }}
      >
        <LevelScene scene={chapter?.scene} className="block h-24 w-full" />
        <div className="p-3">
          <h1 className={cn(GAME_TEXT, "text-2xl leading-tight")}>
            {chapter ? l(chapter.title) : session.chapterId}
          </h1>
          <p className="text-sm font-bold" style={{ color: MUTED }}>
            {session.result ? t("score", { score: session.result.healthScore }) : t("inProgress")} ·{" "}
            {t("finalWealth", { amount: formatShort(replay.points.at(-1)?.wealth ?? 0) })}
          </p>
          <WealthChart points={replay.points} />
          <GameButton tone="blue" className="mt-1 w-full" onClick={() => setChatOpen(true)}>
            <MessageCircle aria-hidden /> {t("askMeera")}
          </GameButton>
        </div>
      </header>

      <p className="text-sm font-semibold text-muted-foreground">{t("howTo")}</p>

      <ol className="flex flex-col gap-3">
        {groups.map((g) => {
          const lifeEvents = (g.advance?.events ?? []).filter((e) => e.type === "life_event");
          const market = g.advance?.toss?.marketState;
          return (
            <li
              key={g.turnNumber}
              className="rounded-2xl border-[3px] p-3"
              style={{ borderColor: INK, background: PANEL }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className={cn(GAME_TEXT, "text-lg")}>
                  {t("period", { unit, n: g.turnNumber })}
                </h2>
                {market && (
                  <span
                    className={cn(
                      "rounded-full px-2 text-xs font-extrabold",
                      market === "crash"
                        ? "bg-[#fde8e8] text-[#b91c1c]"
                        : market === "boom"
                          ? "bg-[#e3f8e8] text-[#15803d]"
                          : "bg-[#e2ecff] text-[#1d4ed8]",
                    )}
                  >
                    {l(content.market.states.find((m) => m.id === market)?.label) || market}
                  </span>
                )}
              </div>

              {g.decisions.length === 0 && (
                <p className="mt-1 text-sm" style={{ color: MUTED }}>
                  {t("noDecisions")}
                </p>
              )}
              <ul className="mt-2 flex flex-col gap-2">
                {g.decisions.map((p) => {
                  if (p.step.kind !== "act") return null;
                  const result = whatIfs[p.stepIndex];
                  return (
                    <li
                      key={p.stepIndex}
                      className="rounded-xl border-2 border-[#1e2a4a]/20 bg-white p-2"
                    >
                      <p className="flex items-center gap-2 text-sm font-bold">
                        <ContentIcon name={actionIcon(p.step.action)} className="size-4 shrink-0" />
                        {describeAction(p.step.action, content, session.chapterId, locale)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => askWhatIf(p.stepIndex)}
                          className="flex min-h-9 items-center gap-1 rounded-full border-2 border-[#7c3aed]/40 bg-[#ede9fe] px-2.5 text-xs font-extrabold text-[#6d28d9]"
                        >
                          <Undo2 className="size-3.5" /> {t("whatIfNot")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void replayFrom(p.stepIndex)}
                          className="flex min-h-9 items-center gap-1 rounded-full border-2 border-[#16a34a]/40 bg-[#e3f8e8] px-2.5 text-xs font-extrabold text-[#15803d]"
                        >
                          <GitBranch className="size-3.5" /> {t("replayFromHere")}
                        </button>
                      </div>
                      {result && result !== "error" && (
                        <p className="mt-1.5 rounded-lg bg-[#f5f3ff] p-2 text-xs font-bold">
                          {t("whatIfResult", {
                            score: result.alternate.healthScore,
                            actualScore: result.actual.healthScore,
                            diff:
                              (result.realWealthDifference >= 0 ? "+" : "−") +
                              formatShort(Math.abs(result.realWealthDifference)),
                          })}
                        </p>
                      )}
                      {result === "error" && (
                        <p className="mt-1.5 text-xs font-bold text-[#b91c1c]">
                          {t("whatIfError")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {lifeEvents.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {lifeEvents.map((e, i) => {
                    if (e.type !== "life_event") return null;
                    const ev = content.lifeEvents.events.find((x) => x.id === e.eventId);
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm font-semibold">
                        <ContentIcon name={ev?.icon} className="size-4" />
                        {ev ? l(ev.title) : e.eventId}
                        {e.amount > 0 && (
                          <span
                            className={ev?.type === "good" ? "text-[#15803d]" : "text-[#b91c1c]"}
                          >
                            {ev?.type === "good" ? "+" : "−"}
                            {formatShort(e.amount)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {g.advance && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#1e2a4a]/15 pt-2">
                  <span className="text-xs font-bold" style={{ color: MUTED }}>
                    {t("afterToss", { amount: formatShort(g.advance.wealth) })}
                  </span>
                  <button
                    type="button"
                    onClick={() => void replayFrom(g.advance!.stepIndex)}
                    className="flex min-h-9 items-center gap-1 rounded-full border-2 border-[#16a34a]/40 bg-[#e3f8e8] px-2.5 text-xs font-extrabold text-[#15803d]"
                  >
                    <GitBranch className="size-3.5" /> {t("replayBeforeToss")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {chatOpen && <MeeraChat session={session} onClose={() => setChatOpen(false)} />}
    </section>
  );
}
