/**
 * The homepage hero's one flat graphic: a map pin over a dotted compass ring, slightly rotated.
 * Hand-authored SVG in the accent color (no external assets). Decorative only.
 */
export function HeroMark({ size = 160, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(-8 80 80)">
        <circle
          cx="92"
          cy="74"
          r="54"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeDasharray="1 9"
          strokeLinecap="round"
        />
        <path d="M92 16 L98 74 L92 132 L86 74 Z" fill="var(--bg-elev-2)" stroke="var(--accent)" strokeWidth="2" />
        <path
          d="M62 34 a30 30 0 0 1 30 30 c0 24 -30 58 -30 58 s-30 -34 -30 -58 a30 30 0 0 1 30 -30 Z"
          fill="var(--accent)"
          stroke="#000"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="62" cy="64" r="11" fill="var(--bg)" stroke="#000" strokeWidth="3" />
      </g>
    </svg>
  )
}
