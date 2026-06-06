// Giftmaxxing — Event calendar & milestones
"use client"

import { EVENTS } from "@/lib/data"
import { Icons, Maxi } from "@/components/icons"
import { Avatar, Btn, IconBtn, Progress, SectionHead, cardStyle } from "@/components/ui-atoms"

function MiniMonth({ eventDays, today = 5 }: { eventDays: number[]; today?: number }) {
  const first = new Date(2026, 5, 1).getDay() // June 2026
  const daysInMonth = 30
  const cells: (number | null)[] = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const dow = ["S", "M", "T", "W", "T", "F", "S"]
  return (
    <div style={{ ...cardStyle({ padding: 14 }) }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--display-weight)" as unknown as number,
            fontStyle: "var(--display-style)",
            fontSize: 20,
            color: "var(--text)",
          }}
        >
          June 2026
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
          {eventDays.length} milestones
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {dow.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--text-3)",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          const isToday = d === today
          const hasEvent = d != null && eventDays.includes(d)
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                position: "relative",
                background: isToday ? "var(--accent)" : "transparent",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? "#fff" : d ? "var(--text)" : "transparent",
                }}
              >
                {d || ""}
              </span>
              {hasEvent && !isToday && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 5,
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--accent)",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UpNextCard({ event, onIdeas, onGroup }: { event: any; onIdeas: () => void; onGroup: () => void }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, var(--accent), #FF9F46)`,
        borderRadius: "var(--radius)",
        padding: 16,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.9 }}>
        <Maxi size={92} mood="happy" />
      </div>
      <div style={{ position: "relative", maxWidth: "74%" }}>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            opacity: 0.9,
          }}
        >
          Up next · in {event.days} days
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--display-weight)" as unknown as number,
            fontStyle: "var(--display-style)",
            fontSize: 25,
            lineHeight: 1.1,
            margin: "6px 0",
          }}
        >
          {event.title}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, opacity: 0.92, lineHeight: 1.4 }}>
          Maxi lined up <b>{event.ideas} ideas</b> in your ${event.budget} budget, matched to her vibe.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, position: "relative" }}>
        <button
          onClick={onIdeas}
          style={{
            flex: 1,
            padding: "11px 0",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: "#fff",
            color: "var(--accent)",
            fontFamily: "var(--font-ui)",
            fontWeight: 800,
            fontSize: 13.5,
          }}
        >
          See ideas
        </button>
        <button
          onClick={onGroup}
          style={{
            flex: 1,
            padding: "11px 0",
            borderRadius: 999,
            cursor: "pointer",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            color: "#fff",
            fontFamily: "var(--font-ui)",
            fontWeight: 800,
            fontSize: 13.5,
          }}
        >
          Start group gift
        </button>
      </div>
    </div>
  )
}

function EventRow({ event, onOpen, onGroup }: { event: any; onOpen: (e: any) => void; onGroup: () => void }) {
  const [mon, day] = event.date.split(" ")
  return (
    <button
      onClick={() => (event.group ? onGroup() : onOpen(event))}
      style={{
        display: "flex",
        width: "100%",
        textAlign: "left",
        gap: 13,
        alignItems: "center",
        padding: "12px 4px",
        borderBottom: "1px solid var(--line)",
        background: "none",
        border: "none",
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        cursor: "pointer",
      }}
    >
      <div style={{ width: 50, flexShrink: 0, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
          }}
        >
          {mon}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--display-weight)" as unknown as number,
            fontStyle: "var(--display-style)",
            fontSize: 24,
            color: "var(--text)",
            lineHeight: 1,
          }}
        >
          {day}
        </div>
      </div>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar user={event.user} size={42} />
        <span
          style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
          }}
        >
          {event.group ? (
            <Icons.group size={11} />
          ) : event.type === "Anniversary" ? (
            <Icons.heartFill size={10} />
          ) : (
            <Icons.gift size={11} />
          )}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}>
          {event.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--text-3)" }}>
            {event.type} · in {event.days}d
          </span>
          {event.ready ? (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                fontWeight: 700,
                color: "#2E8B57",
                background: "rgba(46,139,87,0.12)",
                padding: "2px 7px",
                borderRadius: 999,
              }}
            >
              Gift ready
            </span>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--accent)",
                background: "var(--accent-soft)",
                padding: "2px 7px",
                borderRadius: 999,
              }}
            >
              {event.ideas} ideas
            </span>
          )}
        </div>
        {event.group && (
          <div style={{ marginTop: 6, maxWidth: 180 }}>
            <Progress value={event.raised} goal={event.goal} height={5} />
          </div>
        )}
      </div>
      <Icons.chevronR size={18} style={{ color: "var(--text-3)", flexShrink: 0 }} />
    </button>
  )
}

export function Calendar({
  onOpenEvent,
  onOpenGroup,
  onIdeas,
}: {
  onOpenEvent: (e: any) => void
  onOpenGroup: (gid: string) => void
  onIdeas: () => void
}) {
  const eventDays = [9, 14, 16, 23]
  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 8,
          padding: "8px 16px 12px",
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: "var(--display-weight)" as unknown as number,
            fontStyle: "var(--display-style)",
            fontSize: 28,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          Calendar
        </h1>
        <div style={{ display: "flex", gap: 2 }}>
          <IconBtn icon={<Icons.link size={22} />} />
          <IconBtn icon={<Icons.plus size={24} />} active />
        </div>
      </div>
      <div style={{ padding: "16px 16px 8px" }}>
        <UpNextCard event={EVENTS[0]} onIdeas={onIdeas} onGroup={() => onOpenGroup("g_sam")} />
        <div style={{ height: 16 }} />
        <MiniMonth eventDays={eventDays} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            margin: "18px 0 4px",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--text-3)",
          }}
        >
          <Icons.link size={13} /> Synced from Instagram + Contacts birthdays
        </div>
        <div style={{ marginTop: 10 }}>
          <SectionHead title="Upcoming" />
          {EVENTS.map((e) => (
            <EventRow key={e.id} event={e} onOpen={onOpenEvent} onGroup={() => onOpenGroup("g_sam")} />
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn kind="ghost" full icon={<Icons.plus size={16} />}>
            Add a milestone
          </Btn>
        </div>
      </div>
    </div>
  )
}
