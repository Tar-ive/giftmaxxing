// Giftmaxxing — Profile + style profile
"use client"

import type { ReactNode } from "react"
import { COLLECTIONS, STYLE_TAGS } from "@/lib/data"
import { Icons, Maxi } from "@/components/icons"
import { Avatar, Btn, Chip, IconBtn, SectionHead, grad, cardStyle } from "@/components/ui-atoms"

function StatBlock({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--display-weight)" as unknown as number,
          fontStyle: "var(--display-style)",
          fontSize: 22,
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        {n}
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>{label}</div>
    </div>
  )
}

function SocialLink({
  icon,
  name,
  handle,
  connected,
}: {
  icon: ReactNode
  name: string
  handle: string
  connected: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        marginBottom: 8,
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
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
        <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{name}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)" }}>
          {connected ? handle : "Not connected"}
        </div>
      </div>
      {connected ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            fontWeight: 700,
            color: "#2E8B57",
            background: "rgba(46,139,87,0.12)",
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          <Icons.check size={12} />
          Synced
        </span>
      ) : (
        <button
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            fontWeight: 700,
            color: "#fff",
            background: "var(--accent)",
            border: "none",
            padding: "6px 14px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          Connect
        </button>
      )}
    </div>
  )
}

export function Profile({
  onOpenMaxi,
  onOpenCollection,
  onOpenGroup,
  onSettings,
}: {
  onOpenMaxi: () => void
  onOpenCollection: (c: any) => void
  onOpenGroup: (id: string) => void
  onSettings?: () => void
}) {
  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 8,
          padding: "8px 16px",
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 16, color: "var(--text)" }}>@you</span>
        <div style={{ display: "flex", gap: 2 }}>
          <IconBtn icon={<Icons.share size={22} />} />
          <IconBtn icon={<Icons.more size={22} />} onClick={onSettings} aria-label="Settings" />
        </div>
      </div>

      <div style={{ padding: "18px 16px 8px" }}>
        {/* hero */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar user="you" size={84} ring />
          <div style={{ flex: 1, display: "flex" }}>
            <StatBlock n="6" label="lists" />
            <StatBlock n="41" label="gifts given" />
            <StatBlock n="128" label="friends" />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 15, color: "var(--text)" }}>
            Alex Rivera
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--text-2)",
              marginTop: 3,
              lineHeight: 1.45,
            }}
          >
            certified gift gremlin 🎁 · never gives mid · ask me what to get them
            <br />
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>giftmaxxing.me/alex</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Btn kind="ghost" full icon={<Icons.user size={15} />}>
            Edit profile
          </Btn>
          <Btn kind="ghost" full icon={<Icons.share size={15} />}>
            Share list
          </Btn>
        </div>

        {/* gifting streak */}
        <div style={{ ...cardStyle({ padding: 14, marginTop: 16 }), display: "flex", alignItems: "center", gap: 13 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--accent), #FFB14B)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <Icons.bolt size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 14.5, color: "var(--text)" }}>
              7-event giftmaxx streak
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)" }}>
              Never missed a birthday this year 🔥
            </div>
          </div>
        </div>

        {/* style profile */}
        <div style={{ marginTop: 22 }}>
          <SectionHead title="Style profile" action="Tune" />
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--text-2)",
              marginBottom: 12,
              lineHeight: 1.45,
            }}
          >
            Maxi reads your linked accounts to match gifts to real taste — yours and your friends&apos;.
          </div>
          <SocialLink icon={<Icons.camera size={20} />} name="Instagram" handle="@alexr · 3 collections" connected />
          <SocialLink icon={<Icons.pin size={20} />} name="Pinterest" handle="6 boards synced" connected />
          <SocialLink icon={<Icons.link size={20} />} name="Spotify" handle="Sync your wrapped taste" connected={false} />
        </div>

        {/* vibe tags */}
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--text)",
              marginBottom: 10,
            }}
          >
            Your vibe
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STYLE_TAGS.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
            <Chip accent>
              <Icons.plus size={13} />
              Add
            </Chip>
          </div>
        </div>

        {/* lists grid */}
        <div style={{ marginTop: 22 }}>
          <SectionHead title="Your lists" action="See all" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {COLLECTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => (c.group ? onOpenGroup("g_sam") : onOpenCollection(c))}
                style={{ padding: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div
                  style={{
                    height: 92,
                    borderRadius: "var(--radius-sm)",
                    background: grad(c.cover),
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {c.group && (
                    <span style={{ position: "absolute", top: 8, left: 8, color: "#fff" }}>
                      <Icons.group size={16} />
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text)",
                    marginTop: 7,
                  }}
                >
                  {c.title}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--text-3)" }}>
                  {c.items} items
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ask maxi */}
        <button
          onClick={onOpenMaxi}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            width: "100%",
            marginTop: 18,
            background: "var(--accent-soft)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: 14,
            cursor: "pointer",
          }}
        >
          <Maxi size={42} />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 14.5, color: "var(--text)" }}>
              Ask Maxi
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-2)" }}>
              Stuck on a gift? I&apos;ve got you.
            </div>
          </div>
          <Icons.chevronR size={20} style={{ color: "var(--text-3)" }} />
        </button>
      </div>
    </div>
  )
}
