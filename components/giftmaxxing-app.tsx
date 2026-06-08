// Giftmaxxing — app shell + router (responsive web)
"use client"

import { useState, type ReactNode } from "react"
import { P, U } from "@/lib/data"
import { gmTheme } from "@/lib/theme"
import { Icons, Maxi } from "@/components/icons"
import { Avatar, ProductTile, Price, Chip, IconBtn, ScreenHeader } from "@/components/ui-atoms"
import { HomeFeed } from "@/components/screens/home-feed"
import { Calendar } from "@/components/screens/calendar"
import { Wishlist } from "@/components/screens/wishlist"
import { Profile } from "@/components/screens/profile"
import { GiftDetail, GroupDetail } from "@/components/screens/detail"
import { Companion } from "@/components/screens/companion"

const NAV: { id: string; icon: string; label: string; center?: boolean }[] = [
  { id: "home", icon: "home", label: "Home" },
  { id: "calendar", icon: "calendar", label: "Events" },
  { id: "add", icon: "plus", label: "", center: true },
  { id: "wishlist", icon: "gift", label: "Lists" },
  { id: "profile", icon: "user", label: "You" },
]

function BottomNav({ tab, onTab, onAdd }: { tab: string; onTab: (id: string) => void; onAdd: () => void }) {
  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "10px 14px 22px",
        background: "var(--nav-bg)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid var(--line)",
      }}
    >
      {NAV.map((n) => {
        if (n.center)
          return (
            <button
              key={n.id}
              onClick={onAdd}
              aria-label="Create"
              style={{
                width: 50,
                height: 38,
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
                background: "var(--accent)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px var(--accent-glow)",
              }}
            >
              <Icons.plus size={24} />
            </button>
          )
        const active = tab === n.id
        const Ico = (Icons as any)[n.icon + (active ? "Fill" : "")] || (Icons as any)[n.icon]
        return (
          <button
            key={n.id}
            onClick={() => onTab(n.id)}
            aria-label={n.label}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              width: 54,
              color: active ? "var(--accent)" : "var(--text-2)",
            }}
          >
            <Ico size={26} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: active ? 700 : 600 }}>{n.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function MaxiFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Ask Maxi"
      style={{
        position: "absolute",
        right: 16,
        bottom: 92,
        zIndex: 30,
        width: 60,
        height: 60,
        borderRadius: "50%",
        cursor: "pointer",
        background: "var(--surface)",
        boxShadow: "0 8px 24px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <Maxi size={48} mood="wink" />
      <span
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#2E8B57",
          border: "2px solid var(--surface)",
        }}
      />
    </button>
  )
}

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        background: "rgba(0,0,0,0.4)",
        animation: "gmFade .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--bg)",
          backgroundImage: "var(--bg-image)",
          borderRadius: "28px 28px 0 0",
          padding: "10px 16px 30px",
          animation: "gmSlideUp .28s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--line)", margin: "0 auto 16px" }} />
        {children}
      </div>
    </div>
  )
}

function AddSheet({
  open,
  onClose,
  onGroup,
  onMaxi,
}: {
  open: boolean
  onClose: () => void
  onGroup: () => void
  onMaxi: () => void
}) {
  const opts = [
    { i: <Icons.gift size={22} />, t: "Post a find", s: "Share a gift-worthy thing you spotted", a: onClose },
    { i: <Icons.group size={22} />, t: "Start a group gift", s: "Pool money with friends for one big gift", a: onGroup },
    { i: <Icons.heart size={22} />, t: "New wishlist", s: "Build a list for an event or yourself", a: onClose },
    { i: <Icons.sparkle size={22} />, t: "Ask Maxi for ideas", s: "Let your companion do the work", a: onMaxi },
  ]
  return (
    <Sheet open={open} onClose={onClose}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--display-weight)" as unknown as number,
          fontStyle: "var(--display-style)",
          fontSize: 24,
          color: "var(--text)",
          marginBottom: 14,
          padding: "0 4px",
        }}
      >
        Create
      </div>
      {opts.map((o, i) => (
        <button
          key={i}
          onClick={o.a}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            width: "100%",
            textAlign: "left",
            padding: 14,
            marginBottom: 8,
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            cursor: "pointer",
            background: "var(--surface)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {o.i}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{o.t}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--text-3)" }}>{o.s}</div>
          </div>
          <Icons.chevronR size={18} style={{ color: "var(--text-3)" }} />
        </button>
      ))}
    </Sheet>
  )
}

function Discover({ onBack, onOpenGift }: { onBack: () => void; onOpenGift: (id: string) => void }) {
  const [q, setQ] = useState("")
  const tags = ["Trending", "Under $30", "For her", "Cozy", "Tech", "Preloved"]
  const ids = Object.keys(P).filter((id) => P[id].name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 8,
          padding: "8px 12px 12px",
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconBtn icon={<Icons.back size={24} />} onClick={onBack} />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "9px 14px",
            }}
          >
            <Icons.search size={18} style={{ color: "var(--text-3)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search gifts, brands, vibes…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--text)",
                minWidth: 0,
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 10, scrollbarWidth: "none" }}>
          {tags.map((t, i) => (
            <Chip key={t} active={i === 0}>
              {t}
            </Chip>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {ids.map((id) => (
            <button
              key={id}
              onClick={() => onOpenGift(id)}
              style={{ padding: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
            >
              <ProductTile product={id} height={150} radius="var(--radius-sm)" />
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--text)",
                  marginTop: 7,
                }}
              >
                {P[id].name}
              </div>
              <div style={{ marginTop: 2 }}>
                <Price product={id} size={13} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Notifications({
  onBack,
  onOpenGroup,
  onOpenGift,
}: {
  onBack: () => void
  onOpenGroup: (id: string) => void
  onOpenGift: (id: string) => void
}) {
  const items: any[] = [
    { type: "maxi", text: "Maya\u2019s birthday is in 4 days — I lined up 7 ideas in your budget.", time: "now", a: "maxi" },
    {
      type: "drop",
      user: null,
      text: "Perfume on your radar just dropped 20%. Snag it before it\u2019s gone.",
      time: "2h",
      icon: "trend",
      a: "gift",
      pid: "perfume",
    },
    { type: "group", user: "jules", text: "chipped in $25 to Sam\u2019s farewell gift. 6 of 9 in!", time: "3h", a: "group" },
    { type: "like", user: "theo", text: "and 12 others liked your find.", time: "5h" },
    { type: "claim", user: "noor", text: "claimed something from your wishlist 🤫", time: "1d" },
    { type: "follow", user: "ivy", text: "started following your lists.", time: "2d" },
  ]
  return (
    <div>
      <ScreenHeader title="Activity" onBack={onBack} />
      <div style={{ padding: "6px 16px" }}>
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => (it.a === "group" ? onOpenGroup("g_sam") : it.a === "gift" ? onOpenGift(it.pid) : null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              textAlign: "left",
              padding: "12px 0",
              borderBottom: "1px solid var(--line)",
              background: "none",
              border: "none",
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              cursor: it.a ? "pointer" : "default",
            }}
          >
            {it.type === "maxi" ? (
              <Maxi size={40} />
            ) : it.type === "drop" ? (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icons.trend size={20} />
              </div>
            ) : (
              <Avatar user={it.user} size={40} />
            )}
            <div
              style={{
                flex: 1,
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--text)",
                lineHeight: 1.4,
              }}
            >
              {it.user && <b>{U[it.user].name.split(" ")[0]} </b>}
              {it.text}
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{it.time}</div>
            </div>
            {it.a && <Icons.chevronR size={16} style={{ color: "var(--text-3)" }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

type Overlay =
  | { name: "gift"; pid: string; post?: any }
  | { name: "group"; gid: string }
  | { name: "maxi" }
  | { name: "discover" }
  | { name: "notif" }
  | null

export function GiftmaxxingApp() {
  const [tab, setTab] = useState("home")
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [addOpen, setAddOpen] = useState(false)

  const vars = gmTheme("editorial", false, "coral") as Record<string, string>

  const pop = () => setOverlay(null)
  const openGift = (pid: string, post?: any) => setOverlay({ name: "gift", pid, post })
  const openGroup = (gid: string) => setOverlay({ name: "group", gid })
  const openMaxi = () => setOverlay({ name: "maxi" })

  const tabScreen = () => {
    switch (tab) {
      case "home":
        return (
          <HomeFeed
            onOpenGift={openGift}
            onOpenGroup={openGroup}
            onOpenList={() => setTab("wishlist")}
            onSearch={() => setOverlay({ name: "discover" })}
            onNotif={() => setOverlay({ name: "notif" })}
            onStory={(s: any) =>
              s.drop ? setOverlay({ name: "discover" }) : s.add ? setTab("wishlist") : openGift("camera")
            }
          />
        )
      case "calendar":
        return <Calendar onOpenEvent={() => openGift("matcha")} onOpenGroup={openGroup} onIdeas={openMaxi} />
      case "wishlist":
        return <Wishlist onOpenGift={openGift} onOpenGroup={openGroup} onOpenCollection={() => {}} />
      case "profile":
        return <Profile onOpenMaxi={openMaxi} onOpenCollection={() => {}} onOpenGroup={openGroup} />
      default:
        return null
    }
  }

  const overlayScreen = () => {
    if (!overlay) return null
    if (overlay.name === "gift")
      return (
        <GiftDetail
          productId={overlay.pid}
          post={overlay.post}
          onBack={pop}
          onAddToList={pop}
          onOpenGift={openGift}
        />
      )
    if (overlay.name === "group") return <GroupDetail onBack={pop} onChipIn={pop} />
    if (overlay.name === "maxi")
      return (
        <Companion
          onBack={pop}
          onOpenGift={(pid: string) => {
            pop()
            openGift(pid)
          }}
        />
      )
    if (overlay.name === "discover") return <Discover onBack={pop} onOpenGift={openGift} />
    if (overlay.name === "notif") return <Notifications onBack={pop} onOpenGroup={openGroup} onOpenGift={openGift} />
    return null
  }

  const showFab = !overlay && tab !== "profile"

  return (
    <main
      style={{
        ...vars,
        background: "var(--bg)",
        backgroundImage: "var(--bg-image)",
        color: "var(--text)",
        fontFamily: "var(--font-ui)",
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          backgroundImage: "var(--bg-image)",
          borderLeft: "1px solid var(--line)",
          borderRight: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <div key={overlay ? overlay.name : tab} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}>
          {overlay ? overlayScreen() : tabScreen()}
        </div>
        {!overlay && <BottomNav tab={tab} onTab={setTab} onAdd={() => setAddOpen(true)} />}
        {showFab && <MaxiFab onClick={openMaxi} />}
        <AddSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onGroup={() => {
            setAddOpen(false)
            openGroup("g_sam")
          }}
          onMaxi={() => {
            setAddOpen(false)
            openMaxi()
          }}
        />
      </div>
    </main>
  )
}
