// Giftmaxxing — icon set + Maxi mascot
// Line icons inherit currentColor. strokeWidth tuned for a refined, premium feel.
import type { CSSProperties, ReactNode } from "react"

type IconProps = { size?: number; sw?: number; fill?: string; style?: CSSProperties }

const GMIcon = ({
  d,
  size = 24,
  sw = 1.8,
  fill = "none",
  children,
  style,
}: IconProps & { d?: string; children?: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {d ? <path d={d} /> : children}
  </svg>
)

export const Icons: Record<string, (p?: IconProps) => ReactNode> = {
  home: (p) => <GMIcon {...p} d="M3.5 10.2 12 3.5l8.5 6.7M5.5 9v10.5h13V9" />,
  homeFill: (p) => (
    <GMIcon {...p} fill="currentColor" sw={0}>
      <path d="M12 2.7 2.6 10v.9h2.1v10.4h5v-6.1h4.6v6.1h5V10.9h2.1V10z" stroke="none" />
    </GMIcon>
  ),
  explore: (p) => (
    <GMIcon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" />
    </GMIcon>
  ),
  exploreFill: (p) => (
    <GMIcon {...p} fill="currentColor">
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.4" />
      <path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" stroke="none" />
    </GMIcon>
  ),
  calendar: (p) => (
    <GMIcon {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </GMIcon>
  ),
  calendarFill: (p) => (
    <GMIcon {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="currentColor" stroke="none" />
      <path d="M3.5 9.5h17" stroke="var(--bg)" />
      <path d="M8 3v3M16 3v3" />
    </GMIcon>
  ),
  gift: (p) => (
    <GMIcon {...p}>
      <rect x="3.5" y="9" width="17" height="11.5" rx="2" />
      <path d="M3.5 9h17M12 9v11.5M12 9C12 9 12 4.5 8.8 4.5 6.8 4.5 6.8 8 8 9 9 9.8 12 9 12 9zM12 9C12 9 12 4.5 15.2 4.5 17.2 4.5 17.2 8 16 9 15 9.8 12 9 12 9z" />
    </GMIcon>
  ),
  giftFill: (p) => (
    <GMIcon {...p}>
      <rect x="3.5" y="9.5" width="17" height="11" rx="2" fill="currentColor" stroke="none" />
      <path d="M10.5 9.5v11M13.5 9.5v11" stroke="var(--bg)" strokeWidth="1.4" />
      <path d="M3.5 9.5h17M12 9.5C12 9.5 12 4.5 8.8 4.5 6.8 4.5 6.8 8 8 9.5 9 9.5 12 9.5 12 9.5zM12 9.5C12 9.5 12 4.5 15.2 4.5 17.2 4.5 17.2 8 16 9.5 15 9.5 12 9.5 12 9.5z" />
    </GMIcon>
  ),
  heart: (p) => (
    <GMIcon
      {...p}
      d="M12 20.5C12 20.5 3.5 15.2 3.5 9.2 3.5 6.3 5.8 4.5 8 4.5c1.8 0 3.2 1 4 2.3.8-1.3 2.2-2.3 4-2.3 2.2 0 4.5 1.8 4.5 4.7 0 6-8.5 11.3-8.5 11.3z"
    />
  ),
  heartFill: (p) => (
    <GMIcon
      {...p}
      fill="currentColor"
      sw={0}
      d="M12 20.5C12 20.5 3.5 15.2 3.5 9.2 3.5 6.3 5.8 4.5 8 4.5c1.8 0 3.2 1 4 2.3.8-1.3 2.2-2.3 4-2.3 2.2 0 4.5 1.8 4.5 4.7 0 6-8.5 11.3-8.5 11.3z"
    />
  ),
  user: (p) => (
    <GMIcon {...p}>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" />
    </GMIcon>
  ),
  userFill: (p) => (
    <GMIcon {...p} fill="currentColor" sw={0}>
      <circle cx="12" cy="8.2" r="3.9" stroke="none" />
      <path d="M4.5 20.5c.4-4 3.6-6.2 7.5-6.2s7.1 2.2 7.5 6.2z" stroke="none" />
    </GMIcon>
  ),
  plus: (p) => <GMIcon {...p} d="M12 5v14M5 12h14" sw={2} />,
  back: (p) => <GMIcon {...p} d="M15 4.5 7.5 12l7.5 7.5" sw={2} />,
  chevronR: (p) => <GMIcon {...p} d="M9 5l7 7-7 7" sw={1.6} />,
  chevronD: (p) => <GMIcon {...p} d="M5 9l7 7 7-7" sw={1.8} />,
  search: (p) => (
    <GMIcon {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </GMIcon>
  ),
  share: (p) => <GMIcon {...p} d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4z" />,
  bookmark: (p) => <GMIcon {...p} d="M6 4.5h12v15.5l-6-4-6 4z" />,
  bookmarkFill: (p) => <GMIcon {...p} fill="currentColor" sw={0} d="M6 4.5h12v15.5l-6-4-6 4z" />,
  more: (p) => (
    <GMIcon {...p} fill="currentColor" sw={0}>
      <circle cx="5" cy="12" r="1.8" stroke="none" />
      <circle cx="12" cy="12" r="1.8" stroke="none" />
      <circle cx="19" cy="12" r="1.8" stroke="none" />
    </GMIcon>
  ),
  check: (p) => <GMIcon {...p} d="M4.5 12.5 9.5 17.5 19.5 6.5" sw={2.2} />,
  close: (p) => <GMIcon {...p} d="M6 6l12 12M18 6 6 18" sw={2} />,
  sparkle: (p) => (
    <GMIcon {...p} fill="currentColor" sw={0}>
      <path
        d="M12 2.5c.6 4.7 1.8 5.9 6.5 6.5-4.7.6-5.9 1.8-6.5 6.5-.6-4.7-1.8-5.9-6.5-6.5C10.2 8.4 11.4 7.2 12 2.5z"
        stroke="none"
      />
      <path
        d="M18.5 14c.3 2.2.9 2.8 3.1 3.1-2.2.3-2.8.9-3.1 3.1-.3-2.2-.9-2.8-3.1-3.1 2.2-.3 2.8-.9 3.1-3.1z"
        stroke="none"
      />
    </GMIcon>
  ),
  bell: (p) => (
    <GMIcon {...p}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 14 6 9.5z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </GMIcon>
  ),
  tag: (p) => (
    <GMIcon {...p}>
      <path d="M3.5 11.5 11 4h7.5v7.5L11 19l-7.5-7.5z" />
      <circle cx="15" cy="8.5" r="1.4" />
    </GMIcon>
  ),
  group: (p) => (
    <GMIcon {...p}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.6M17 19c-.3-2-1.1-3.6-2.4-4.6 2.6.1 4.5 1.9 4.9 4.6z" />
    </GMIcon>
  ),
  link: (p) => (
    <GMIcon {...p}>
      <path d="M9.5 14.5 14.5 9.5M10.5 7.5l1.2-1.2a3.5 3.5 0 0 1 5 5l-1.2 1.2M13.5 16.5l-1.2 1.2a3.5 3.5 0 0 1-5-5l1.2-1.2" />
    </GMIcon>
  ),
  bolt: (p) => <GMIcon {...p} fill="currentColor" sw={0} d="M13 2 4 13.5h6L9 22l9-12h-6z" />,
  trend: (p) => <GMIcon {...p} d="M3.5 16.5 9 11l3.5 3.5L20.5 6.5M20.5 6.5h-4.5M20.5 6.5V11" />,
  clock: (p) => (
    <GMIcon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </GMIcon>
  ),
  camera: (p) => (
    <GMIcon {...p}>
      <rect x="3" y="7" width="18" height="13" rx="3" />
      <circle cx="12" cy="13.5" r="3.5" />
      <path d="M8 7l1.5-2.5h5L16 7" />
    </GMIcon>
  ),
  send: (p) => <GMIcon {...p} d="M4 11.5 20 4l-5.5 16-3-7z" />,
  wallet: (p) => (
    <GMIcon {...p}>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="M16 12h2.5" />
      <path d="M3 9.5h18" />
    </GMIcon>
  ),
  scissors: (p) => (
    <GMIcon {...p}>
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <path d="M8.5 8 20 18M8.5 16 20 6" />
    </GMIcon>
  ),
  pin: (p) => (
    <GMIcon {...p}>
      <path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </GMIcon>
  ),
  eye: (p) => (
    <GMIcon {...p}>
      <path d="M3.5 12S7 5.5 12 5.5 20.5 12 20.5 12 17 18.5 12 18.5 3.5 12 3.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </GMIcon>
  ),
  lock: (p) => (
    <GMIcon {...p}>
      <rect x="5" y="11" width="14" height="10" rx="3" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </GMIcon>
  ),
}

// ── Maxi — the Giftmaxxing companion (geometric gift-box character)
export function Maxi({
  size = 56,
  mood = "happy",
  style,
}: {
  size?: number
  mood?: "happy" | "wink" | "think"
  style?: CSSProperties
}) {
  const s = { display: "block", ...style }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={s} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="maxiBox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.82" />
        </linearGradient>
      </defs>
      {/* shadow */}
      <ellipse cx="32" cy="59" rx="16" ry="2.6" fill="rgba(0,0,0,0.12)" />
      {/* bow */}
      <ellipse cx="24" cy="15" rx="7.5" ry="6" fill="var(--accent)" />
      <ellipse cx="40" cy="15" rx="7.5" ry="6" fill="var(--accent)" />
      <ellipse cx="24" cy="15" rx="3.4" ry="2.6" fill="rgba(255,255,255,0.35)" />
      <ellipse cx="40" cy="15" rx="3.4" ry="2.6" fill="rgba(255,255,255,0.35)" />
      {/* box body */}
      <rect x="13" y="22" width="38" height="33" rx="9" fill="url(#maxiBox)" />
      {/* ribbon */}
      <rect x="29" y="22" width="6" height="33" rx="2" fill="rgba(255,255,255,0.28)" />
      <circle cx="32" cy="20" r="3.6" fill="var(--accent)" />
      {/* face plate */}
      <rect x="18" y="30" width="28" height="18" rx="9" fill="rgba(255,255,255,0.92)" />
      {/* eyes */}
      {mood === "wink" ? (
        <>
          <path d="M23 39c1.2-1.4 3.2-1.4 4.4 0" stroke="#2a1d18" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="39" cy="38.5" r="2.5" fill="#2a1d18" />
        </>
      ) : mood === "think" ? (
        <>
          <circle cx="25" cy="37" r="2.4" fill="#2a1d18" />
          <circle cx="38" cy="37" r="2.4" fill="#2a1d18" />
        </>
      ) : (
        <>
          <circle cx="25" cy="38.5" r="2.7" fill="#2a1d18" />
          <circle cx="39" cy="38.5" r="2.7" fill="#2a1d18" />
          <circle cx="26" cy="37.6" r="0.9" fill="#fff" />
          <circle cx="40" cy="37.6" r="0.9" fill="#fff" />
        </>
      )}
      {/* cheeks */}
      <ellipse cx="21.5" cy="43" rx="2.2" ry="1.4" fill="var(--accent)" opacity="0.5" />
      <ellipse cx="42.5" cy="43" rx="2.2" ry="1.4" fill="var(--accent)" opacity="0.5" />
      {/* mouth */}
      {mood === "think" ? (
        <circle cx="32" cy="44" r="1.6" fill="none" stroke="#2a1d18" strokeWidth="1.8" />
      ) : (
        <path d="M29 43.5c1.2 1.8 4.8 1.8 6 0" stroke="#2a1d18" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  )
}
