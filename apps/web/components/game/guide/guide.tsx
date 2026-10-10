"use client";

// Meera, the guide who sits in the bottom-left corner of every student screen (team request
// 2026-10-11). She pops up to deliver scam messages and, at the end of a level, to explain what
// went well and what could be better. Tap her any time for a tip.
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { content } from "@/lib/content";
import { GAME_TEXT, INK, PANEL } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import { useGameStore } from "../store";
import { useLocalize } from "../use-localize";
import { GuideArt, type GuideMood } from "./guide-art";

/** Full-screen moment: Meera pops up from the bottom-left with a speech bubble. */
export function GuideScene({
  mood,
  children,
  label,
}: {
  mood: GuideMood;
  children: ReactNode;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="relative mx-auto w-full max-w-md">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="relative mb-[92px] max-h-[70dvh] overflow-y-auto rounded-3xl border-[3px] p-4 shadow-2xl"
          style={{ borderColor: INK, background: PANEL, color: INK }}
        >
          {children}
        </motion.div>
        {/* bubble tail pointing at Meera */}
        <div
          aria-hidden
          className="absolute bottom-[80px] left-14 size-5 rotate-45 border-b-[3px] border-r-[3px]"
          style={{ borderColor: INK, background: PANEL }}
        />
        <motion.div
          initial={reduce ? false : { y: 120 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="absolute -bottom-3 -left-2 w-28"
        >
          <GuideArt mood={mood} className="w-full drop-shadow-lg" />
        </motion.div>
      </div>
    </div>
  );
}

/** Meera's name tag + one line, used at the top of her speech bubbles. */
export function GuideLine({ children }: { children: ReactNode }) {
  const t = useTranslations("guide");
  return (
    <p className="text-sm font-bold">
      <span className={cn(GAME_TEXT, "me-1 text-base text-[#0f766e]")}>{t("name")}:</span>
      {children}
    </p>
  );
}

/** Meera sitting in the corner. Tap her for a tip that fits your persona. */
export function GuideDock() {
  const t = useTranslations("guide");
  const l = useLocalize();
  const personaId = useGameStore((s) => s.personaId);
  const [tip, setTip] = useState<string | null>(null);
  const reduce = useReducedMotion();

  function nextTip() {
    const persona = content.personas.personas.find((p) => p.id === personaId);
    const tips = [
      ...(persona?.mentorTips.map((m) => l(m)) ?? []),
      t("tipBuild"),
      t("tipInvest"),
      t("tipScam"),
    ];
    setTip((prev) => {
      const others = tips.filter((x) => x !== prev);
      return others[Math.floor(Math.random() * others.length)] ?? tips[0] ?? null;
    });
  }

  return (
    <div className="pointer-events-none fixed bottom-24 left-0 z-30 flex items-end">
      <motion.button
        type="button"
        onClick={() => (tip ? setTip(null) : nextTip())}
        aria-label={t("tapForTip")}
        className="pointer-events-auto -ms-2 w-14 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#14b8a6]/60"
        animate={reduce ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <GuideArt mood={tip ? "cheer" : "happy"} className="w-full drop-shadow-md" />
      </motion.button>
      {tip && (
        <button
          type="button"
          onClick={() => setTip(null)}
          className="pointer-events-auto mb-8 ms-1 max-w-[230px] rounded-2xl border-[3px] p-2.5 text-start text-sm font-bold shadow-lg"
          style={{ borderColor: INK, background: PANEL, color: INK }}
        >
          {tip}
        </button>
      )}
    </div>
  );
}
