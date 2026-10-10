// Village art for the turn screen: original flat SVGs in a chunky "strategy village" style
// (thick dark outlines, bright fills). No third-party game art (docs/plan-v2.md, legal note).

const INK = "#1e2a4a";

export type PlotStage = "flag" | "scaffold" | "building" | "ruins";
export type TaskKind = "need" | "goal" | "want" | "safety";

const KIND_COLOR: Record<TaskKind, string> = {
  need: "#3b82f6", // blue roof: a home
  goal: "#f97316", // orange roof: a workshop
  want: "#ec4899", // pink tent: a celebration
  safety: "#16a34a", // green banner: a vault
};

function Ground() {
  return (
    <g>
      <ellipse cx="50" cy="76" rx="44" ry="12" fill="#a8743f" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="50" cy="73" rx="40" ry="9" fill="#c99556" />
      <path
        d="M14 74 l3 -6 l2 6 M84 74 l3 -6 l2 6"
        stroke="#3f7d20"
        strokeWidth="2.5"
        fill="none"
      />
    </g>
  );
}

function Flag({ color }: { color: string }) {
  return (
    <g>
      <rect
        x="47"
        y="20"
        width="5"
        height="54"
        rx="2"
        fill="#7a4b24"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        d="M52 22 L80 30 L52 40 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="49.5" cy="19" r="4" fill="#facc15" stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Scaffold({ color }: { color: string }) {
  return (
    <g>
      <rect x="24" y="52" width="52" height="20" fill="#f1dfbd" stroke={INK} strokeWidth="2.5" />
      <path
        d="M22 72 V30 M78 72 V30 M22 30 H78 M22 44 H78 M22 30 L78 72 M78 30 L22 72"
        stroke="#8a5a2b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="40" y="24" width="20" height="8" rx="2" fill={color} stroke={INK} strokeWidth="2" />
    </g>
  );
}

function House({ color }: { color: string }) {
  return (
    <g>
      <rect
        x="22"
        y="40"
        width="56"
        height="34"
        rx="2"
        fill="#f6e7c8"
        stroke={INK}
        strokeWidth="2.5"
      />
      <path
        d="M14 44 L50 14 L86 44 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 44 L50 21 L78 44"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="3"
      />
      <rect
        x="43"
        y="56"
        width="14"
        height="18"
        rx="6"
        fill="#7a4b24"
        stroke={INK}
        strokeWidth="2"
      />
    </g>
  );
}

function Workshop({ color }: { color: string }) {
  return (
    <g>
      <rect x="64" y="16" width="9" height="20" fill="#9ca3af" stroke={INK} strokeWidth="2" />
      <rect
        x="18"
        y="38"
        width="64"
        height="36"
        rx="2"
        fill="#f3d6a4"
        stroke={INK}
        strokeWidth="2.5"
      />
      <path
        d="M12 42 L28 22 H72 L88 42 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="40" y="54" width="20" height="20" fill="#7a4b24" stroke={INK} strokeWidth="2" />
      <path d="M40 60 H60 M40 66 H60" stroke={INK} strokeWidth="1.5" />
    </g>
  );
}

function Tent({ color }: { color: string }) {
  return (
    <g>
      <path
        d="M12 74 L50 18 L88 74 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M50 18 L38 74 M50 18 L62 74" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="5" />
      <path d="M42 74 L50 52 L58 74 Z" fill="#7a2550" stroke={INK} strokeWidth="2" />
      <path d="M50 18 V8 L62 12 L50 16" fill="#facc15" stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Vault({ color }: { color: string }) {
  return (
    <g>
      <path
        d="M18 74 V34 H26 V28 H34 V34 H46 V28 H54 V34 H66 V28 H74 V34 H82 V74 Z"
        fill="#b7bcc4"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M18 50 H82 M30 62 H70" stroke="#8b929b" strokeWidth="2" />
      <path d="M38 74 V58 a12 12 0 0 1 24 0 V74 Z" fill="#5b6470" stroke={INK} strokeWidth="2" />
      <rect x="47" y="12" width="4" height="18" fill="#7a4b24" stroke={INK} strokeWidth="1.5" />
      <path d="M51 13 L66 18 L51 23 Z" fill={color} stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Ruins() {
  return (
    <g>
      <path
        d="M24 74 V50 L32 44 L36 56 L44 48 V74 Z"
        fill="#9ca3af"
        stroke={INK}
        strokeWidth="2.5"
      />
      <path d="M56 74 V58 L64 52 L72 60 L76 74 Z" fill="#9ca3af" stroke={INK} strokeWidth="2.5" />
      <circle cx="50" cy="70" r="4" fill="#6b7280" stroke={INK} strokeWidth="1.5" />
    </g>
  );
}

/** One task plot: a flag to build, scaffolding while paying, the finished building, or ruins. */
export function PlotArt({
  stage,
  kind,
  late = false,
  className,
}: {
  stage: PlotStage;
  kind: TaskKind;
  late?: boolean;
  className?: string;
}) {
  const color = late ? "#dc2626" : KIND_COLOR[kind];
  return (
    <svg viewBox="0 0 100 90" className={className} aria-hidden>
      <Ground />
      {stage === "flag" && <Flag color={color} />}
      {stage === "scaffold" && <Scaffold color={color} />}
      {stage === "ruins" && <Ruins />}
      {stage === "building" &&
        (kind === "need" ? (
          <House color={color} />
        ) : kind === "goal" ? (
          <Workshop color={color} />
        ) : kind === "want" ? (
          <Tent color={color} />
        ) : (
          <Vault color={color} />
        ))}
    </svg>
  );
}

/** The chapter's home base; its level is the chapter number. */
export function LevelBaseArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 110" className={className} aria-hidden>
      <ellipse cx="70" cy="96" rx="62" ry="12" fill="#a8743f" stroke={INK} strokeWidth="2.5" />
      <path
        d="M22 94 V48 H32 V40 H44 V48 H96 V40 H108 V48 H118 V94 Z"
        fill="#e6ebf7"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M22 64 H118 M22 80 H118" stroke="#c3cbe0" strokeWidth="2" />
      <path
        d="M40 50 L70 18 L100 50 Z"
        fill="#7c3aed"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M48 50 L70 26 L92 50"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="3"
      />
      <rect x="67" y="4" width="4" height="18" fill="#7a4b24" stroke={INK} strokeWidth="1.5" />
      <path d="M71 5 L88 10 L71 15 Z" fill="#facc15" stroke={INK} strokeWidth="2" />
      <path d="M56 94 V74 a14 14 0 0 1 28 0 V94 Z" fill="#7a4b24" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}
