// Meera, the in-game guide: an original flat SVG character (navy outline, teal kurta, gold
// dupatta, side braid). Her face changes with the moment.
const INK = "#1e2a4a";
const SKIN = "#b9784a";
const HAIR = "#2a2238";

export type GuideMood = "happy" | "alert" | "cheer" | "worried";

export function GuideArt({ mood = "happy", className }: { mood?: GuideMood; className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      {/* braid behind the shoulder */}
      <path
        d="M36 50 C26 70 30 92 36 110"
        stroke={HAIR}
        strokeWidth="11"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M36 50 C26 70 30 92 36 110"
        stroke={INK}
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 6"
      />
      <circle cx="36" cy="112" r="5" fill="#f472b6" stroke={INK} strokeWidth="2" />

      {/* body: kurta + dupatta */}
      <path
        d="M30 150 L34 104 Q60 92 86 104 L90 150 Z"
        fill="#14b8a6"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M52 100 L60 116 L68 100"
        fill="none"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M34 108 Q60 132 90 112 L90 124 Q60 144 34 122 Z"
        fill="#facc15"
        stroke={INK}
        strokeWidth="2.5"
      />

      {/* waving arm */}
      <path
        d="M86 108 Q102 96 104 76"
        stroke={SKIN}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="104" cy="72" r="8" fill={SKIN} stroke={INK} strokeWidth="2.5" />
      <path
        d="M90 104 Q100 94 101 80"
        stroke="#14b8a6"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M90 104 Q100 94 101 80"
        stroke={INK}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* neck + head */}
      <rect
        x="53"
        y="82"
        width="14"
        height="14"
        rx="4"
        fill={SKIN}
        stroke={INK}
        strokeWidth="2.5"
      />
      <circle cx="60" cy="58" r="28" fill={SKIN} stroke={INK} strokeWidth="3" />
      {/* hair */}
      <path
        d="M32 60 C30 34 48 24 62 26 C80 26 92 40 88 60 C82 46 70 40 60 42 C50 42 40 48 32 60 Z"
        fill={HAIR}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="34" r="6" fill="#f472b6" stroke={INK} strokeWidth="2" />

      {/* face */}
      <circle cx="46" cy="68" r="4" fill="#f9a8b6" opacity="0.7" />
      <circle cx="74" cy="68" r="4" fill="#f9a8b6" opacity="0.7" />
      {mood === "alert" || mood === "worried" ? (
        <>
          <path
            d="M44 50 L54 53 M76 50 L66 53"
            stroke={INK}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="50" cy="60" r="3.5" fill={INK} />
          <circle cx="70" cy="60" r="3.5" fill={INK} />
          {mood === "alert" ? (
            <ellipse
              cx="60"
              cy="73"
              rx="4.5"
              ry="5.5"
              fill="#7a2550"
              stroke={INK}
              strokeWidth="2"
            />
          ) : (
            <path
              d="M52 76 Q60 70 68 76"
              stroke={INK}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </>
      ) : (
        <>
          <path
            d="M45 52 Q50 49 55 52 M65 52 Q70 49 75 52"
            stroke={INK}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {mood === "cheer" ? (
            <>
              <path
                d="M46 61 Q50 56 54 61 M66 61 Q70 56 74 61"
                stroke={INK}
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M50 70 Q60 82 70 70 Z"
                fill="#7a2550"
                stroke={INK}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              <circle cx="50" cy="60" r="3.5" fill={INK} />
              <circle cx="70" cy="60" r="3.5" fill={INK} />
              <path
                d="M51 71 Q60 79 69 71"
                stroke={INK}
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </>
          )}
        </>
      )}
    </svg>
  );
}
