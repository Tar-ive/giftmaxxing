// Giftmaxxing — shared UI atoms
"use client"

import type { CSSProperties, ReactNode } from "react"
import { GRADS, U, P, type User, type Product } from "@/lib/data"
import { Icons } from "@/components/icons"

export const grad = (key: string, angle = 145) => {
  const g = GRADS[key] || GRADS.peach
  return `linear-gradient(${angle}deg, ${g[0]}, ${g[1]})`
}

export const cardStyle = (extra: CSSProperties = {}): CSSProperties => ({
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  ...extra,
})

function resolveUser(user: string | User | undefined): User | undefined {
  return typeof user === "string" ? U[user] : user
}
function resolveProduct(product: string | Product | undefined): Product | undefined {
  return typeof product === "string" ? P[product] : product
}

export function Avatar({
  user,
  size = 44,
  ring = false,
  ringColor,
  dim = false,
}: {
  user: string | User
  size?: number
  ring?: boolean
  ringColor?: string
  dim?: boolean
}) {
  const u = resolveUser(user)
  const initials = (u?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
  const inner = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: grad(u?.grad || "peach"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.95)",
        fontWeight: 700,
        fontFamily: "var(--font-ui)",
        fontSize: size * 0.36,
        letterSpacing: "-0.02em",
        flexShrink: 0,
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.12)",
        opacity: dim ? 0.5 : 1,
      }}
    >
      {initials}
    </div>
  )
  if (!ring) return inner
  return (
    <div
      style={{
        padding: 2.5,
        borderRadius: "50%",
        flexShrink: 0,
        background: ringColor || `linear-gradient(135deg, var(--accent), #FFC24B)`,
      }}
    >
      <div style={{ padding: 2, borderRadius: "50%", background: "var(--bg)" }}>{inner}</div>
    </div>
  )
}

// gradient placeholder tile standing in for a product photo
export function ProductTile({
  product,
  height = 200,
  radius = "var(--radius)",
  tag = true,
  children,
}: {
  product: string | Product
  height?: number
  radius?: string
  tag?: boolean
  children?: ReactNode
}) {
  const p = resolveProduct(product)
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: radius,
        background: grad(p?.grad || "peach"),
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* soft highlight blobs to give the placeholder depth */}
      <div
        style={{
          position: "absolute",
          width: "60%",
          height: "60%",
          right: "-12%",
          top: "-14%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.28)",
          filter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "40%",
          height: "40%",
          left: "-8%",
          bottom: "-10%",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.06)",
          filter: "blur(10px)",
        }}
      />
      {tag && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            fontFamily: 'ui-monospace, "SF Mono", monospace',
            fontSize: 9.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.92)",
            background: "rgba(0,0,0,0.18)",
            padding: "3px 7px",
            borderRadius: 6,
            backdropFilter: "blur(4px)",
          }}
        >
          {p?.cat || "gift"}
        </div>
      )}
      {/* product-name plate (placeholder for a real photo) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--display-weight)" as unknown as number,
            fontStyle: "var(--display-style)",
            color: "#fff",
            fontSize: 20,
            lineHeight: 1.1,
            textShadow: "0 1px 8px rgba(0,0,0,0.18)",
          }}
        >
          {p?.name}
        </div>
      </div>
      {children}
    </div>
  )
}

export function Price({ product, size = 15 }: { product: string | Product; size?: number }) {
  const p = resolveProduct(product)
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, fontFamily: "var(--font-ui)" }}>
      <span style={{ fontWeight: 700, fontSize: size, color: "var(--text)" }}>${p?.price}</span>
      {p?.was && (
        <span style={{ fontSize: size * 0.82, color: "var(--text-3)", textDecoration: "line-through" }}>${p.was}</span>
      )}
      {p?.was && (
        <span
          style={{
            fontSize: size * 0.7,
            fontWeight: 700,
            color: "var(--accent)",
            background: "var(--accent-soft)",
            padding: "1px 6px",
            borderRadius: 999,
          }}
        >
          -{Math.round((1 - p.price / p.was) * 100)}%
        </span>
      )}
    </span>
  )
}

export function Chip({
  children,
  active = false,
  accent = false,
  onClick,
  style,
}: {
  children: ReactNode
  active?: boolean
  accent?: boolean
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 13px",
        borderRadius: 999,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid " + (active || accent ? "transparent" : "var(--line)"),
        background: accent ? "var(--accent)" : active ? "var(--text)" : "var(--surface)",
        color: accent ? "#fff" : active ? "var(--bg)" : "var(--text-2)",
        transition: "all .15s ease",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Btn({
  children,
  kind = "accent",
  size = "md",
  onClick,
  full = false,
  icon,
  style,
}: {
  children: ReactNode
  kind?: "accent" | "solid" | "ghost" | "quiet"
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  full?: boolean
  icon?: ReactNode
  style?: CSSProperties
}) {
  const pad = size === "sm" ? "8px 14px" : size === "lg" ? "15px 22px" : "12px 18px"
  const fs = size === "sm" ? 13 : size === "lg" ? 16 : 14.5
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: pad,
    fontSize: fs,
    fontWeight: 700,
    fontFamily: "var(--font-ui)",
    whiteSpace: "nowrap",
    borderRadius: 999,
    cursor: "pointer",
    border: "1px solid transparent",
    width: full ? "100%" : undefined,
    transition: "transform .12s ease, opacity .15s",
    ...style,
  }
  const kinds: Record<string, CSSProperties> = {
    accent: { background: "var(--accent)", color: "#fff", boxShadow: "0 6px 18px var(--accent-glow)" },
    solid: { background: "var(--text)", color: "var(--bg)" },
    ghost: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)" },
    quiet: { background: "var(--accent-soft)", color: "var(--accent)" },
  }
  return (
    <button
      onClick={onClick}
      style={{ ...base, ...kinds[kind] }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconBtn({
  icon,
  onClick,
  size = 38,
  active = false,
  badge = false,
  style,
  "aria-label": ariaLabel,
}: {
  icon: ReactNode
  onClick?: () => void
  size?: number
  active?: boolean
  badge?: boolean
  style?: CSSProperties
  "aria-label"?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: active ? "var(--accent-soft)" : "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--accent)" : "var(--text)",
        ...style,
      }}
    >
      {icon}
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 7,
            right: 7,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent)",
            border: "1.5px solid var(--bg)",
          }}
        />
      )}
    </button>
  )
}

export function Progress({ value, goal, height = 8 }: { value: number; goal: number; height?: number }) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height, borderRadius: 999, background: "var(--accent-soft)", overflow: "hidden" }}>
        <div
          style={{
            width: pct + "%",
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, var(--accent), #FFC24B)`,
          }}
        />
      </div>
    </div>
  )
}

export function CountdownPill({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--accent)",
        background: "var(--accent-soft)",
        padding: "4px 9px",
        borderRadius: 999,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

// Section header used across screens
export function SectionHead({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 12px" }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontWeight: "var(--display-weight)" as unknown as number,
          fontStyle: "var(--display-style)",
          fontSize: 22,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--accent)",
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

// Shared screen header (used by detail/overlay screens)
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 8,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <IconBtn icon={<Icons.back size={24} />} onClick={onBack} />
      <div
        style={{
          flex: 1,
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--text)",
          textAlign: "center",
        }}
      >
        {title}
      </div>
      <div style={{ width: 38, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  )
}
