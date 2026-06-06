// Giftmaxxing — theme system
// Three "look" directions × light/dark × warm accent palettes.
// gmTheme(look, dark, accent) -> flat map of CSS custom properties applied on the app root.

export type AccentKey = "coral" | "marigold" | "guava" | "persimmon"
export type LookKey = "editorial" | "glass" | "mono"

export const GM_ACCENTS: Record<AccentKey, { name: string; hex: string; ink: string; soft: string; glow: string }> = {
  coral: { name: "Coral", hex: "#FB6F52", ink: "#3a1206", soft: "rgba(251,111,82,0.14)", glow: "rgba(251,111,82,0.45)" },
  marigold: { name: "Marigold", hex: "#F4A12A", ink: "#3a2603", soft: "rgba(244,161,42,0.16)", glow: "rgba(244,161,42,0.45)" },
  guava: { name: "Guava", hex: "#FF5C8A", ink: "#3a0717", soft: "rgba(255,92,138,0.14)", glow: "rgba(255,92,138,0.42)" },
  persimmon: { name: "Persimmon", hex: "#E8552F", ink: "#330d04", soft: "rgba(232,85,47,0.14)", glow: "rgba(232,85,47,0.42)" },
}

type Mode = {
  bg: string
  bgImage: string
  surface: string
  surface2: string
  text: string
  text2: string
  text3: string
  line: string
  glassBg: string
  glassBorder: string
  navBg: string
  shadow: string
  shadowLg: string
}

type Look = {
  label: string
  fontDisplay: string
  fontUI: string
  displayWeight: number
  displayItalic: boolean
  radius: number
  radiusLg: number
  radiusSm: number
  surfaceStyle: string
  light: Mode
  dark: Mode
}

export const GM_LOOKS: Record<LookKey, Look> = {
  // 1 — Editorial: warm ivory, serif display, generous whitespace, soft solid cards
  editorial: {
    label: "Editorial",
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontUI: '"Hanken Grotesk", -apple-system, system-ui, sans-serif',
    displayWeight: 400,
    displayItalic: false,
    radius: 20,
    radiusLg: 30,
    radiusSm: 12,
    surfaceStyle: "solid",
    light: {
      bg: "#F7F2EB",
      bgImage: "none",
      surface: "#FFFFFF",
      surface2: "#FBF7F1",
      text: "#211A14",
      text2: "rgba(33,26,20,0.62)",
      text3: "rgba(33,26,20,0.40)",
      line: "rgba(33,26,20,0.10)",
      glassBg: "rgba(255,255,255,0.72)",
      glassBorder: "rgba(255,255,255,0.8)",
      navBg: "rgba(247,242,235,0.82)",
      shadow: "0 1px 2px rgba(60,40,20,0.04), 0 8px 24px rgba(60,40,20,0.06)",
      shadowLg: "0 18px 50px rgba(60,40,20,0.12)",
    },
    dark: {
      bg: "#161210",
      bgImage: "none",
      surface: "#211C18",
      surface2: "#1A1613",
      text: "#F6EFE7",
      text2: "rgba(246,239,231,0.60)",
      text3: "rgba(246,239,231,0.38)",
      line: "rgba(246,239,231,0.10)",
      glassBg: "rgba(40,34,29,0.7)",
      glassBorder: "rgba(255,255,255,0.08)",
      navBg: "rgba(22,18,16,0.82)",
      shadow: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4)",
      shadowLg: "0 20px 50px rgba(0,0,0,0.55)",
    },
  },
  // 2 — Soft Glass: warm gradient mesh, frosted translucent cards, rounded, trendy display
  glass: {
    label: "Soft Glass",
    fontDisplay: '"Bricolage Grotesque", -apple-system, system-ui, sans-serif',
    fontUI: '"Hanken Grotesk", -apple-system, system-ui, sans-serif',
    displayWeight: 700,
    displayItalic: false,
    radius: 26,
    radiusLg: 36,
    radiusSm: 16,
    surfaceStyle: "glass",
    light: {
      bg: "#FBEFE9",
      bgImage:
        "radial-gradient(120% 90% at 12% 2%, rgba(255,180,150,0.55), transparent 55%), radial-gradient(110% 80% at 95% 8%, rgba(255,150,190,0.45), transparent 50%), radial-gradient(120% 100% at 50% 110%, rgba(190,170,255,0.40), transparent 55%)",
      surface: "rgba(255,255,255,0.55)",
      surface2: "rgba(255,255,255,0.40)",
      text: "#2a1d22",
      text2: "rgba(42,29,34,0.62)",
      text3: "rgba(42,29,34,0.42)",
      line: "rgba(255,255,255,0.55)",
      glassBg: "rgba(255,255,255,0.45)",
      glassBorder: "rgba(255,255,255,0.7)",
      navBg: "rgba(255,255,255,0.40)",
      shadow: "0 2px 8px rgba(120,60,80,0.08), 0 14px 40px rgba(120,60,80,0.12)",
      shadowLg: "0 24px 60px rgba(120,60,80,0.20)",
    },
    dark: {
      bg: "#17121A",
      bgImage:
        "radial-gradient(120% 90% at 12% 2%, rgba(200,90,70,0.40), transparent 55%), radial-gradient(110% 80% at 95% 8%, rgba(190,60,120,0.34), transparent 50%), radial-gradient(120% 100% at 50% 110%, rgba(110,80,200,0.34), transparent 55%)",
      surface: "rgba(255,255,255,0.08)",
      surface2: "rgba(255,255,255,0.05)",
      text: "#F6ECF1",
      text2: "rgba(246,236,241,0.62)",
      text3: "rgba(246,236,241,0.40)",
      line: "rgba(255,255,255,0.12)",
      glassBg: "rgba(40,30,40,0.45)",
      glassBorder: "rgba(255,255,255,0.14)",
      navBg: "rgba(30,22,32,0.45)",
      shadow: "0 2px 8px rgba(0,0,0,0.3), 0 14px 40px rgba(0,0,0,0.45)",
      shadowLg: "0 24px 60px rgba(0,0,0,0.6)",
    },
  },
  // 3 — Mono Lux: near-monochrome warm bone/charcoal, tight grid, hairline borders, grotesk display
  mono: {
    label: "Mono Lux",
    fontDisplay: '"Space Grotesk", -apple-system, system-ui, sans-serif',
    fontUI: '"Hanken Grotesk", -apple-system, system-ui, sans-serif',
    displayWeight: 600,
    displayItalic: false,
    radius: 12,
    radiusLg: 18,
    radiusSm: 8,
    surfaceStyle: "flat",
    light: {
      bg: "#EFEAE3",
      bgImage: "none",
      surface: "#F7F4EF",
      surface2: "#EFEAE3",
      text: "#1A1714",
      text2: "rgba(26,23,20,0.58)",
      text3: "rgba(26,23,20,0.38)",
      line: "rgba(26,23,20,0.14)",
      glassBg: "rgba(247,244,239,0.78)",
      glassBorder: "rgba(26,23,20,0.10)",
      navBg: "rgba(239,234,227,0.85)",
      shadow: "none",
      shadowLg: "0 12px 36px rgba(40,30,20,0.10)",
    },
    dark: {
      bg: "#121110",
      bgImage: "none",
      surface: "#1B1917",
      surface2: "#161412",
      text: "#EFEAE3",
      text2: "rgba(239,234,227,0.56)",
      text3: "rgba(239,234,227,0.36)",
      line: "rgba(239,234,227,0.14)",
      glassBg: "rgba(27,25,23,0.82)",
      glassBorder: "rgba(239,234,227,0.12)",
      navBg: "rgba(18,17,16,0.85)",
      shadow: "none",
      shadowLg: "0 14px 40px rgba(0,0,0,0.5)",
    },
  },
}

export function gmTheme(look: LookKey, dark: boolean, accentKey: AccentKey): Record<string, string> {
  const L = GM_LOOKS[look] || GM_LOOKS.editorial
  const mode = dark ? L.dark : L.light
  const acc = GM_ACCENTS[accentKey] || GM_ACCENTS.coral
  return {
    "--bg": mode.bg,
    "--bg-image": mode.bgImage,
    "--surface": mode.surface,
    "--surface-2": mode.surface2,
    "--text": mode.text,
    "--text-2": mode.text2,
    "--text-3": mode.text3,
    "--line": mode.line,
    "--glass-bg": mode.glassBg,
    "--glass-border": mode.glassBorder,
    "--nav-bg": mode.navBg,
    "--shadow": mode.shadow,
    "--shadow-lg": mode.shadowLg,
    "--accent": acc.hex,
    "--accent-ink": acc.ink,
    "--accent-soft": acc.soft,
    "--accent-glow": acc.glow,
    "--radius": L.radius + "px",
    "--radius-lg": L.radiusLg + "px",
    "--radius-sm": L.radiusSm + "px",
    "--font-display": L.fontDisplay,
    "--font-ui": L.fontUI,
    "--display-weight": String(L.displayWeight),
    "--display-style": L.displayItalic ? "italic" : "normal",
    "--surface-style": L.surfaceStyle,
  }
}
