"use client"

import { useState } from "react"
import { Icons } from "@/components/icons"
import { IconBtn, ScreenHeader } from "@/components/ui-atoms"

function SettingsRow({
  icon,
  label,
  value,
  chevron,
  danger,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  chevron?: boolean
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "13px 16px",
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--line)",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: danger ? "rgba(220,60,60,0.12)" : "var(--accent-soft)",
          color: danger ? "#DC3C3C" : "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          flex: 1,
          fontFamily: "var(--font-ui)",
          fontSize: 14.5,
          fontWeight: 600,
          color: danger ? "#DC3C3C" : "var(--text)",
        }}
      >
        {label}
      </span>
      {value && (
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-3)" }}>{value}</span>
      )}
      {chevron && <Icons.chevronR size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />}
    </button>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={on ? "Turn off" : "Turn on"}
      style={{
        width: 46,
        height: 27,
        borderRadius: 999,
        background: on ? "var(--accent)" : "var(--line)",
        border: "none",
        cursor: "pointer",
        padding: 3,
        transition: "background .2s",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <div
        style={{
          width: 21,
          height: 21,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          transform: on ? "translateX(19px)" : "translateX(0)",
          transition: "transform .2s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </button>
  )
}

function ToggleRow({
  icon,
  label,
  sublabel,
  defaultOn = false,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  defaultOn?: boolean
}) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--accent-soft)",
          color: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <Toggle on={on} onToggle={() => setOn((v) => !v)} />
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-3)",
        padding: "20px 16px 6px",
      }}
    >
      {children}
    </div>
  )
}

export function Settings({
  onBack,
  onPrivacyPolicy,
}: {
  onBack: () => void
  onPrivacyPolicy: () => void
}) {
  return (
    <div>
      <ScreenHeader title="Settings" onBack={onBack} />

      {/* ── Account ── */}
      <SectionLabel>Account</SectionLabel>
      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--line)",
          backdropFilter: "blur(20px)",
        }}
      >
        <SettingsRow icon={<Icons.user size={18} />} label="Edit profile" chevron onClick={onBack} />
        <SettingsRow icon={<Icons.link size={18} />} label="Connected accounts" value="3 linked" chevron />
        <SettingsRow icon={<Icons.share size={18} />} label="Your public link" value="giftmaxxing.me/alex" chevron />
      </div>

      {/* ── Notifications ── */}
      <SectionLabel>Notifications</SectionLabel>
      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--line)",
          backdropFilter: "blur(20px)",
        }}
      >
        <ToggleRow
          icon={<Icons.bell size={18} />}
          label="Push notifications"
          sublabel="Alerts for birthdays, price drops, group gifts"
          defaultOn
        />
        <ToggleRow
          icon={<Icons.bolt size={18} />}
          label="Maxi nudges"
          sublabel="Let Maxi ping you before an event"
          defaultOn
        />
        <ToggleRow
          icon={<Icons.trend size={18} />}
          label="Price drop alerts"
          sublabel="When wishlisted items go on sale"
          defaultOn
        />
        <ToggleRow
          icon={<Icons.heart size={18} />}
          label="Friend activity"
          sublabel="Likes, follows, and claims"
        />
      </div>

      {/* ── Privacy ── */}
      <SectionLabel>Privacy</SectionLabel>
      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--line)",
          backdropFilter: "blur(20px)",
        }}
      >
        <ToggleRow
          icon={<Icons.eye size={18} />}
          label="Public profile"
          sublabel="Anyone can view your lists and finds"
          defaultOn
        />
        <ToggleRow
          icon={<Icons.sparkle size={18} />}
          label="Personalised recommendations"
          sublabel="Maxi uses your linked taste data"
          defaultOn
        />
        <ToggleRow
          icon={<Icons.group size={18} />}
          label="Show in friend suggestions"
        />
        <SettingsRow
          icon={<Icons.lock size={18} />}
          label="Privacy Policy"
          chevron
          onClick={onPrivacyPolicy}
        />
        <SettingsRow
          icon={<Icons.check size={18} />}
          label="Terms of Service"
          chevron
        />
      </div>

      {/* ── Support ── */}
      <SectionLabel>Support</SectionLabel>
      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--line)",
          backdropFilter: "blur(20px)",
        }}
      >
        <SettingsRow icon={<Icons.sparkle size={18} />} label="Send feedback" chevron />
        <SettingsRow icon={<Icons.share size={18} />} label="Rate the app" chevron />
        <SettingsRow
          icon={<Icons.more size={18} />}
          label="Version"
          value="1.0.0 (web)"
        />
      </div>

      {/* ── Danger zone ── */}
      <SectionLabel>Account actions</SectionLabel>
      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--line)",
          backdropFilter: "blur(20px)",
          marginBottom: 32,
        }}
      >
        <SettingsRow icon={<Icons.back size={18} />} label="Log out" danger chevron />
        <SettingsRow icon={<Icons.close size={18} />} label="Delete account" danger chevron />
      </div>
    </div>
  )
}
