"use client";

import { Compass, Rocket, Shield, PartyPopper, Sparkles, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { cn } from "@/lib/utils";
import { GameGate } from "./game-gate";
import { useGameStore } from "./store";
import { useLocalize } from "./use-localize";

const AVATARS: Record<string, LucideIcon> = {
  party: PartyPopper,
  shield: Shield,
  rocket: Rocket,
  compass: Compass,
};

/** Big friendly persona avatar from the persona's `avatarHint`. */
export function PersonaAvatar({ hint, className }: { hint: string; className?: string }) {
  const Icon = AVATARS[hint] ?? Sparkles;
  return (
    <span
      aria-hidden
      className={cn(
        "grid place-items-center rounded-full bg-coin text-foreground shadow-lg ring-8 ring-coin/30",
        className,
      )}
    >
      <Icon className="size-1/2" />
    </span>
  );
}

/** Persona reveal (§9.2 #7): strength + blind spot, framed kindly — never "good" or "bad". */
export function PersonaReveal() {
  return (
    <GameGate>
      <Reveal />
    </GameGate>
  );
}

function Reveal() {
  const t = useTranslations("persona");
  const tm = useTranslations("mindset");
  const l = useLocalize();
  const reduceMotion = useReducedMotion();
  const personaId = useGameStore((s) => s.personaId);
  const persona = content.personas.personas.find((p) => p.id === personaId);

  if (!persona) {
    return (
      <Card className="mt-6 space-y-4 text-center">
        <p>{t("missing")}</p>
        <Link href="/mindset" className={buttonVariants()}>
          {tm("start")}
        </Link>
      </Card>
    );
  }

  const techniques = persona.highlightTechniques
    .map((id) => content.techniques.techniques.find((x) => x.id === id))
    .filter((x) => x !== undefined);

  return (
    <section className="flex flex-1 flex-col gap-5 py-4">
      <motion.div
        initial={reduceMotion ? false : { scale: 0.6, opacity: 0, rotateY: 180 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 14 }}
        className="flex flex-col items-center gap-3 pt-4 text-center"
      >
        <PersonaAvatar hint={persona.avatarHint} className="size-28" />
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-extrabold">{l(persona.name)}</h1>
      </motion.div>

      <Card className="space-y-1 border-gain/40">
        <h2 className="text-sm font-bold text-gain">{t("strength")}</h2>
        <p className="text-lg font-semibold">{l(persona.strength)}</p>
      </Card>
      <Card className="space-y-1 border-primary/40">
        <h2 className="text-sm font-bold text-primary">{t("blindSpot")}</h2>
        <p className="text-lg font-semibold">{l(persona.blindSpot)}</p>
      </Card>
      {techniques.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground">{t("focus")}</h2>
          <ul className="flex flex-wrap gap-2">
            {techniques.map((tech) => (
              <li
                key={tech.id}
                className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground"
              >
                {l(tech.title)}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-center text-sm text-muted-foreground">{t("note")}</p>
      <Link href="/ladder" className={cn(buttonVariants({ size: "lg" }), "mt-auto")}>
        {t("toLadder")}
      </Link>
    </section>
  );
}
