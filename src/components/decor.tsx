/* Decorative classical-garden SVG elements. Purely presentational. */

export function GreekKeyDivider({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`greek-key w-full ${className}`} />;
}

/** Slim weathered column wrapped in ivy, used to flank the welcome hero. */
export function IvyColumn({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 220"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <rect x="8" y="206" width="44" height="9" rx="3" className="fill-secondary" />
      <rect x="13" y="197" width="34" height="9" rx="3" className="fill-muted" />
      <rect x="17" y="22" width="26" height="176" className="fill-secondary" />
      <path
        d="M23 24 v172 M30 24 v172 M37 24 v172"
        className="stroke-border"
        strokeWidth="1.6"
        fill="none"
      />
      <rect x="10" y="14" width="40" height="7" rx="2.5" className="fill-muted" />
      <rect x="14" y="21" width="32" height="5" rx="2" className="fill-secondary" />
      <circle cx="13" cy="18" r="3.5" className="fill-border" />
      <circle cx="47" cy="18" r="3.5" className="fill-border" />
      <g className="animate-sway">
        <path
          d="M20 196 C 44 178 18 160 40 142 C 18 124 44 106 24 88 C 40 74 28 52 36 34"
          fill="none"
          className="stroke-moss"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <g className="fill-moss">
          <path d="M24 184 q-9 -1 -11 -10 q10 0 13 8 z" />
          <path d="M36 156 q9 -3 15 3 q-8 6 -15 1 z" />
          <path d="M26 132 q-10 0 -13 -9 q10 -1 15 6 z" />
          <path d="M32 102 q8 -4 14 1 q-6 7 -14 4 z" />
          <path d="M28 72 q-9 -1 -11 -9 q10 -1 13 7 z" />
          <path d="M34 46 q7 -4 13 -1 q-5 7 -13 5 z" />
        </g>
      </g>
    </svg>
  );
}

/** Small trailing vine sprig for card corners. */
export function VineSprig({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 80 40" className={className}>
      <path
        d="M2 36 C 22 30 30 18 50 16 C 62 15 70 10 78 4"
        fill="none"
        className="stroke-moss/70"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g className="fill-moss/70">
        <path d="M18 30 q-7 1 -10 -5 q8 -2 10 5 z" />
        <path d="M40 19 q-3 -7 3 -11 q4 7 -3 11 z" />
        <path d="M62 12 q-2 -6 3 -9 q4 6 -3 9 z" />
      </g>
    </svg>
  );
}

/** Laurel wreath halves framing a centerpiece (welcome page). */
export function LaurelFrame({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 60" className={className}>
      <g className="stroke-gold" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M14 8 C 4 24 6 42 22 54" />
        <path d="M106 8 C 116 24 114 42 98 54" />
      </g>
      <g className="fill-gold/80">
        <path d="M12 16 q-8 -2 -9 -10 q9 1 9 10 z" />
        <path d="M8 28 q-8 0 -10 -8 q9 -1 10 8 z" />
        <path d="M9 40 q-8 2 -11 -6 q9 -3 11 6 z" />
        <path d="M108 16 q8 -2 9 -10 q-9 1 -9 10 z" />
        <path d="M112 28 q8 0 10 -8 q-9 -1 -10 8 z" />
        <path d="M111 40 q8 2 11 -6 q-9 -3 -11 6 z" />
      </g>
    </svg>
  );
}
