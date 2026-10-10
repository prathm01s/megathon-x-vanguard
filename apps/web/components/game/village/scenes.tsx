// Level-map pictures: one small original scene per life stage (navy outlines, flat colours).
const INK = "#1e2a4a";

export type SceneId = "campus" | "office" | "family-home" | "shop" | "sunset-home";

function Sky({ from, to }: { from: string; to: string }) {
  const id = `sky-${from.slice(1)}-${to.slice(1)}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${id})`} />
    </>
  );
}

function Ground({ color = "#6cbf4a" }: { color?: string }) {
  return <path d="M0 80 Q80 70 160 80 V100 H0 Z" fill={color} stroke={INK} strokeWidth="2" />;
}

function Cloud({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#ffffff" stroke={INK} strokeWidth="1.5" opacity="0.95">
      <ellipse cx={x} cy={y} rx="12" ry="6" />
      <ellipse cx={x + 9} cy={y - 3} rx="8" ry="6" />
    </g>
  );
}

function Campus() {
  return (
    <>
      <Sky from="#9fd8ff" to="#e6f6ff" />
      <Cloud x={30} y={20} />
      <Cloud x={128} y={16} />
      <path
        d="M44 40 L80 22 L116 40 Z"
        fill="#7c3aed"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="48" y="40" width="64" height="38" fill="#f1f5ff" stroke={INK} strokeWidth="2.5" />
      {[54, 66, 88, 100].map((x) => (
        <rect
          key={x}
          x={x}
          y="44"
          width="6"
          height="34"
          fill="#c7d2fe"
          stroke={INK}
          strokeWidth="1.5"
        />
      ))}
      <rect
        x="74"
        y="58"
        width="12"
        height="20"
        rx="5"
        fill="#7a4b24"
        stroke={INK}
        strokeWidth="2"
      />
      <rect x="79" y="10" width="2" height="14" fill={INK} />
      <path d="M81 10 L92 13 L81 16 Z" fill="#facc15" stroke={INK} strokeWidth="1.5" />
      <Ground />
      {/* books */}
      <rect x="18" y="74" width="20" height="5" fill="#ef4444" stroke={INK} strokeWidth="1.5" />
      <rect x="20" y="69" width="18" height="5" fill="#3b82f6" stroke={INK} strokeWidth="1.5" />
      <rect x="22" y="64" width="14" height="5" fill="#facc15" stroke={INK} strokeWidth="1.5" />
    </>
  );
}

function Office() {
  return (
    <>
      <Sky from="#8ec5ff" to="#e3f1ff" />
      <Cloud x={26} y={18} />
      <rect x="56" y="14" width="48" height="66" fill="#dbeafe" stroke={INK} strokeWidth="2.5" />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={62 + c * 14}
            y={20 + r * 11}
            width="9"
            height="7"
            fill={(r + c) % 3 === 0 ? "#fde68a" : "#93c5fd"}
            stroke={INK}
            strokeWidth="1"
          />
        )),
      )}
      <rect x="112" y="40" width="30" height="40" fill="#c7d2fe" stroke={INK} strokeWidth="2.5" />
      <Ground />
      {/* briefcase */}
      <rect
        x="18"
        y="64"
        width="28"
        height="18"
        rx="3"
        fill="#92400e"
        stroke={INK}
        strokeWidth="2.5"
      />
      <path d="M27 64 V60 H37 V64" fill="none" stroke={INK} strokeWidth="2.5" />
      <rect x="30" y="70" width="4" height="4" fill="#facc15" stroke={INK} strokeWidth="1" />
    </>
  );
}

function FamilyHome() {
  return (
    <>
      <Sky from="#a5e3ff" to="#effaff" />
      <circle cx="132" cy="20" r="9" fill="#facc15" stroke={INK} strokeWidth="2" />
      <path
        d="M40 46 L72 22 L104 46 Z"
        fill="#ef4444"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="46" y="46" width="52" height="34" fill="#fff7ed" stroke={INK} strokeWidth="2.5" />
      <rect x="54" y="54" width="12" height="10" fill="#93c5fd" stroke={INK} strokeWidth="1.5" />
      <rect
        x="76"
        y="58"
        width="12"
        height="22"
        rx="4"
        fill="#7a4b24"
        stroke={INK}
        strokeWidth="2"
      />
      <Ground />
      {/* car */}
      <path
        d="M106 80 V72 L112 66 H132 L138 72 V80 Z"
        fill="#3b82f6"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="114" cy="81" r="4" fill={INK} />
      <circle cx="130" cy="81" r="4" fill={INK} />
    </>
  );
}

function Shop() {
  return (
    <>
      <Sky from="#bae6fd" to="#f0f9ff" />
      <Cloud x={130} y={20} />
      <rect x="34" y="36" width="92" height="44" fill="#fef3c7" stroke={INK} strokeWidth="2.5" />
      <path
        d="M30 36 H130 L124 50 H36 Z"
        fill="#ffffff"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${36 + i * 18} 50 L${44 + i * 18} 36 H${52 + i * 18} L${46 + i * 18} 50 Z`}
          fill="#ef4444"
        />
      ))}
      <rect x="44" y="56" width="30" height="18" fill="#93c5fd" stroke={INK} strokeWidth="2" />
      <rect x="86" y="56" width="16" height="24" fill="#7a4b24" stroke={INK} strokeWidth="2" />
      <rect
        x="62"
        y="24"
        width="36"
        height="10"
        rx="3"
        fill="#16a34a"
        stroke={INK}
        strokeWidth="2"
      />
      <Ground />
    </>
  );
}

function SunsetHome() {
  return (
    <>
      <Sky from="#fdba74" to="#fde68a" />
      <circle cx="120" cy="56" r="16" fill="#fb923c" stroke={INK} strokeWidth="2" />
      <path
        d="M30 48 L60 26 L90 48 Z"
        fill="#7c3aed"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="36" y="48" width="48" height="32" fill="#fff7ed" stroke={INK} strokeWidth="2.5" />
      <rect
        x="54"
        y="58"
        width="12"
        height="22"
        rx="4"
        fill="#7a4b24"
        stroke={INK}
        strokeWidth="2"
      />
      <Ground color="#84cc16" />
      {/* tree */}
      <rect x="104" y="66" width="6" height="14" fill="#7a4b24" stroke={INK} strokeWidth="1.5" />
      <circle cx="107" cy="60" r="11" fill="#16a34a" stroke={INK} strokeWidth="2" />
      {/* bench */}
      <path d="M128 76 H150 M130 76 V82 M148 76 V82 M128 72 H150" stroke={INK} strokeWidth="2.5" />
    </>
  );
}

export function LevelScene({
  scene,
  className,
}: {
  scene: SceneId | undefined;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 100"
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      {scene === "office" ? (
        <Office />
      ) : scene === "family-home" ? (
        <FamilyHome />
      ) : scene === "shop" ? (
        <Shop />
      ) : scene === "sunset-home" ? (
        <SunsetHome />
      ) : (
        <Campus />
      )}
    </svg>
  );
}
