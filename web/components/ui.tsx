import { GRADIENTS, type Grad, type Product } from "@/lib/data";

/* Maxi — the AI gift companion mascot (matches the prototype's gift-box face) */
export function Maxi({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <rect width="100" height="100" rx="24" fill="#FB6F52" />
      <rect x="28" y="42" width="44" height="38" rx="9" fill="#fff" />
      <rect x="46" y="42" width="8" height="38" fill="#FB6F52" opacity="0.4" />
      <ellipse cx="41" cy="36" rx="10" ry="8" fill="#fff" />
      <ellipse cx="59" cy="36" rx="10" ry="8" fill="#fff" />
      <circle cx="43" cy="60" r="3.6" fill="#2a1d18" />
      <circle cx="57" cy="60" r="3.6" fill="#2a1d18" />
      <path d="M44 68 q6 5 12 0" stroke="#2a1d18" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Avatar({ grad, label, size = 36 }: { grad: Grad; label: string; size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-full font-bold text-white shadow-sm"
      style={{ width: size, height: size, background: GRADIENTS[grad], fontSize: size * 0.4 }}
      aria-hidden
    >
      {label.charAt(0)}
    </div>
  );
}

export function ProductTile({ product, height = 150 }: { product: Product; height?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div
        className="relative grid place-items-center"
        style={{ height, background: GRADIENTS[product.grad] }}
      >
        <span style={{ fontSize: height * 0.32 }}>{product.emoji}</span>
        {product.was ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white">
            {Math.round((1 - product.price / product.was) * 100)}% off
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate text-[13px] font-bold text-ink">{product.name}</p>
        <p className="text-[11px] text-ink-faint">{product.brand}</p>
        <p className="mt-1 text-[13px] font-bold text-ink">
          ${product.price}
          {product.was ? (
            <span className="ml-1.5 text-[11px] font-medium text-ink-faint line-through">${product.was}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-semibold text-ink-soft backdrop-blur">
      {children}
    </span>
  );
}

/* Minimal stroke icons */
type IconProps = { size?: number; className?: string };
const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
});

export const Icons = {
  gift: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M5 12v9h14v-9" />
      <path d="M12 8S10 3 7.5 3 5 5.5 5 6.5 6 8 7.5 8H12zM12 8s2-5 4.5-5S19 5.5 19 6.5 18 8 16.5 8H12z" />
    </svg>
  ),
  sparkle: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  ),
  users: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-2.4-4.5" />
    </svg>
  ),
  calendar: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  ),
  heart: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M12 20s-7-4.4-9.2-8.6C1.2 8 3 4.5 6.3 4.5c2 0 3.2 1.2 3.7 2.2.5-1 1.7-2.2 3.7-2.2C20 4.5 22.8 8 21.2 11.4 19 15.6 12 20 12 20z" />
    </svg>
  ),
  trend: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M3 17l6-6 4 4 7-8" />
      <path d="M16 7h5v5" />
    </svg>
  ),
  check: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M4 12.5l5 5 11-12" />
    </svg>
  ),
  arrow: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  home: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M3.5 10.5 12 3l8.5 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  ),
  homeFill: ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.3 2.7 3 10.2c-.3.3-.5.7-.5 1.1V20a1 1 0 0 0 1 1h5v-6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6h5a1 1 0 0 0 1-1v-8.7c0-.4-.2-.8-.5-1.1l-8.3-7.5a1 1 0 0 0-1.4 0z" />
    </svg>
  ),
  search: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5 21 21" />
    </svg>
  ),
  compass: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2z" />
    </svg>
  ),
  film: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M3 8.5h18M8.5 3l2.5 5.5M14 3l2.5 5.5" />
      <path d="m10.5 11.5 4 2.5-4 2.5z" />
    </svg>
  ),
  message: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.2A8 8 0 1 1 21 11.5z" />
    </svg>
  ),
  comment: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.2A8 8 0 1 1 21 11.5z" />
    </svg>
  ),
  share: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M22 3 11 14M22 3l-7 19-4-8-8-4 19-7z" />
    </svg>
  ),
  bookmark: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z" />
    </svg>
  ),
  bookmarkFill: ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z" />
    </svg>
  ),
  heartFill: ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 20s-7-4.4-9.2-8.6C1.2 8 3 4.5 6.3 4.5c2 0 3.2 1.2 3.7 2.2.5-1 1.7-2.2 3.7-2.2C20 4.5 22.8 8 21.2 11.4 19 15.6 12 20 12 20z" />
    </svg>
  ),
  plusSquare: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  ),
  more: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  ),
  menu: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  back: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  ),
  close: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  chevronL: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  chevronR: ({ size = 24, className }: IconProps) => (
    <svg {...base(size, className)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
};
