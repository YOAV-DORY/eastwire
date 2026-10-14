/**
 * Simplified flags for the four covered countries, drawn here as inline SVG (emoji flags do
 * not render on Windows). Decorative: the country code or name is always shown next to them.
 */
export function Flag({ country, size = 16 }: { country: string; size?: number }) {
  const height = Math.round((size * 2) / 3)
  return (
    <svg width={size} height={height} viewBox="0 0 24 16" aria-hidden="true" focusable="false" style={{ borderRadius: 2 }}>
      {flagShapes(country)}
    </svg>
  )
}

function flagShapes(country: string) {
  switch (country) {
    case 'JP':
      return (
        <>
          <rect width="24" height="16" fill="#fff" />
          <circle cx="12" cy="8" r="4.8" fill="#bc002d" />
        </>
      )
    case 'CN':
      return (
        <>
          <rect width="24" height="16" fill="#de2910" />
          <polygon points="4.6,2.2 5.4,4.6 7.9,4.6 5.9,6.1 6.7,8.5 4.6,7 2.6,8.5 3.4,6.1 1.4,4.6 3.8,4.6" fill="#ffde00" />
          <circle cx="9.6" cy="1.8" r="0.7" fill="#ffde00" />
          <circle cx="11" cy="3.6" r="0.7" fill="#ffde00" />
          <circle cx="11" cy="6" r="0.7" fill="#ffde00" />
          <circle cx="9.6" cy="7.6" r="0.7" fill="#ffde00" />
        </>
      )
    case 'IN':
      return (
        <>
          <rect width="24" height="16" fill="#fff" />
          <rect width="24" height="5.33" fill="#ff9933" />
          <rect y="10.67" width="24" height="5.33" fill="#138808" />
          <circle cx="12" cy="8" r="2" fill="none" stroke="#000080" strokeWidth="0.6" />
        </>
      )
    case 'KR':
      return (
        <>
          <rect width="24" height="16" fill="#fff" />
          <path d="M8.5 8 a3.5 3.5 0 0 1 7 0 Z" fill="#cd2e3a" />
          <path d="M8.5 8 a3.5 3.5 0 0 0 7 0 Z" fill="#0047a0" />
          <g stroke="#000" strokeWidth="0.8">
            <path d="M3 3.5 l2 -1.5 M3.6 4.3 l2 -1.5 M4.2 5.1 l2 -1.5" />
            <path d="M18 2 l2 1.5 M18.6 1.2 l2 1.5 M17.8 3.3 l2 1.5" />
            <path d="M3 12.5 l2 1.5 M3.6 11.7 l2 1.5 M4.2 10.9 l2 1.5" />
            <path d="M18 14 l2 -1.5 M18.6 14.8 l2 -1.5 M17.8 12.7 l2 -1.5" />
          </g>
        </>
      )
    default:
      return <rect width="24" height="16" fill="var(--bg-elev-2)" />
  }
}
