// Giftmaxxing — Home feed, story tray, feed cards
"use client"

import { useState, useEffect } from "react"
import { FEED, STORIES, U, P } from "@/lib/data"
import { Icons, Maxi } from "@/components/icons"
import { Avatar, ProductTile, Price, Btn, IconBtn, Progress, cardStyle } from "@/components/ui-atoms"

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: "var(--display-weight)" as unknown as number,
        fontStyle: "var(--display-style)",
        fontSize: size,
        letterSpacing: "-0.02em",
        color: "var(--text)",
        lineHeight: 1,
      }}
    >
      giftma<span style={{ color: "var(--accent)" }}>xx</span>ing
    </span>
  )
}

function StoryTray({ onOpen }: { onOpen?: (s: any) => void }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        overflowX: "auto",
        padding: "4px 18px 16px",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}
    >
      {STORIES.map((s) => (
        <button
          key={s.id}
          onClick={() => onOpen && onOpen(s)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
            width: 66,
            flexShrink: 0,
          }}
        >
          <div style={{ position: "relative" }}>
            {s.add ? (
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  border: "2px dashed var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-2)",
                }}
              >
                <Avatar user="you" size={50} />
                <div
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2.5px solid var(--bg)",
                  }}
                >
                  <Icons.plus size={13} />
                </div>
              </div>
            ) : s.drop ? (
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  padding: 2.5,
                  background: "linear-gradient(135deg, var(--accent), #FFC24B)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                  }}
                >
                  <Icons.bolt size={26} />
                </div>
              </div>
            ) : (
              <Avatar user={s.user} size={60} ring />
            )}
            {s.live && (
              <span
                style={{
                  position: "absolute",
                  bottom: -3,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#fff",
                  background: "var(--accent)",
                  padding: "2px 6px",
                  borderRadius: 999,
                  letterSpacing: "0.04em",
                }}
              >
                LIVE
              </span>
            )}
          </div>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--text-2)",
              fontWeight: 600,
              maxWidth: 66,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </span>
        </button>
      ))}
    </div>
  )
}

function ActionRow({
  liked,
  saved,
  onLike,
  onSave,
  onComment,
}: {
  liked: boolean
  saved: boolean
  onLike: () => void
  onSave: () => void
  onComment: () => void
}) {
  const A = ({ children, onClick, color }: { children: React.ReactNode; onClick?: () => void; color?: string }) => (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: color || "var(--text)",
        display: "inline-flex",
      }}
    >
      {children}
    </button>
  )
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
      <A onClick={onLike} color={liked ? "var(--accent)" : "var(--text)"}>
        {liked ? <Icons.heartFill size={25} /> : <Icons.heart size={25} />}
      </A>
      <A onClick={onComment}>
        <Icons.gift size={24} style={{ transform: "scaleX(-1)" }} />
      </A>
      <A>
        <Icons.send size={24} />
      </A>
      <div style={{ flex: 1 }} />
      <A onClick={onSave} color={saved ? "var(--accent)" : "var(--text)"}>
        {saved ? <Icons.bookmarkFill size={24} /> : <Icons.bookmark size={24} />}
      </A>
    </div>
  )
}

function FindCard({ post, onOpenGift }: { post: any; onOpenGift: (pid: string, post?: any) => void }) {
  const u = U[post.user]
  const p = P[post.product]
  const [liked, setLiked] = useState(post.you_liked)
  const [saved, setSaved] = useState(post.you_saved)
  const [likes, setLikes] = useState(post.likes)
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={cardStyle({ padding: 14, marginBottom: 16 })}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar user={post.user} size={40} ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{u.name}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--text-3)" }}>
            wishlisted · {post.time} ago{post.fromSocial ? ` · via ${post.fromSocial}` : ""}
          </div>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-2)" }}>
          <Icons.more size={22} />
        </button>
      </div>
      {/* product tile */}
      <button
        onClick={() => onOpenGift(post.product, post)}
        style={{
          display: "block",
          width: "100%",
          padding: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <ProductTile product={post.product} height={300} radius="var(--radius-sm)">
          {post.priceDrop && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "var(--accent)",
                color: "#fff",
                fontFamily: "var(--font-ui)",
                fontWeight: 800,
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 999,
              }}
            >
              <Icons.trend size={14} />
              Price drop
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(0,0,0,0.34)",
              backdropFilter: "blur(6px)",
              color: "#fff",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              padding: "6px 12px",
              borderRadius: 999,
            }}
          >
            ${p.price}
          </div>
        </ProductTile>
      </button>
      <ActionRow
        liked={liked}
        saved={saved}
        onLike={() => {
          setLiked(!liked)
          setLikes(likes + (liked ? -1 : 1))
        }}
        onSave={() => setSaved(!saved)}
        onComment={() => onOpenGift(post.product, post)}
      />
      {/* meta */}
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginTop: 10 }}>
        {likes} likes ·{" "}
        <span style={{ color: "var(--accent)" }}>{post.savedBy + (saved ? 1 : 0)} added to a list</span>
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--text)", marginTop: 5, lineHeight: 1.45 }}>
        <span style={{ fontWeight: 700 }}>{u.handle}</span> {post.caption}
      </div>
      {/* gifting CTA */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn kind="quiet" size="sm" icon={<Icons.heart size={15} />} onClick={() => setSaved(true)} style={{ flex: 1 }}>
          {saved ? "On your list" : "Add to wishlist"}
        </Btn>
        <Btn
          kind="ghost"
          size="sm"
          icon={<Icons.gift size={15} />}
          onClick={() => onOpenGift(post.product, post)}
          style={{ flex: 1 }}
        >
          Gift this
        </Btn>
      </div>
      {post.comments.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--text-3)",
              padding: 0,
            }}
          >
            View all {post.comments.length} comments
          </button>
          {(expanded ? post.comments : post.comments.slice(0, 1)).map((c: any, i: number) => (
            <div key={i} style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)", marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>{U[c.user].handle}</span> {c.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({ post, onOpenGroup }: { post: any; onOpenGroup: () => void }) {
  return (
    <div
      style={{
        background: "var(--accent-soft)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 16,
        marginBottom: 16,
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontFamily: "var(--font-ui)",
          fontWeight: 800,
          fontSize: 11.5,
          color: "var(--accent)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        <Icons.group size={15} />
        Group gift · {U[post.org].name} started this
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 92, flexShrink: 0 }}>
          <ProductTile product={post.item} height={92} radius="var(--radius-sm)" tag={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--display-weight)" as unknown as number,
              fontStyle: "var(--display-style)",
              fontSize: 19,
              color: "var(--text)",
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            {post.title}
          </div>
          <Progress value={post.raised} goal={post.goal} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              marginTop: 6,
            }}
          >
            <span style={{ fontWeight: 700, color: "var(--text)" }}>
              ${post.raised} <span style={{ color: "var(--text-3)", fontWeight: 500 }}>/ ${post.goal}</span>
            </span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              {post.count} of {post.of} in
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <div style={{ display: "flex" }}>
          {post.contributors.slice(0, 4).map((c: string, i: number) => (
            <div key={c} style={{ marginLeft: i ? -10 : 0, borderRadius: "50%", border: "2px solid var(--bg)" }}>
              <Avatar user={c} size={28} />
            </div>
          ))}
        </div>
        <Btn kind="accent" size="sm" onClick={onOpenGroup} full icon={<Icons.wallet size={15} />} style={{ flex: 1 }}>
          Chip in
        </Btn>
      </div>
    </div>
  )
}

function ActivityCard({ post, onOpenList }: { post: any; onOpenList: () => void }) {
  return (
    <button
      onClick={onOpenList}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 14,
        marginBottom: 16,
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar user={post.user} size={36} />
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--text)", flex: 1 }}>
          <span style={{ fontWeight: 700 }}>{U[post.user].name}</span> {post.text}{" "}
          <span style={{ fontWeight: 700, color: "var(--accent)" }}>{post.target}</span>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{post.time} ago</div>
        </div>
        <Icons.chevronR size={18} style={{ color: "var(--text-3)" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {post.preview.map((pid: string) => (
          <div key={pid} style={{ flex: 1 }}>
            <ProductTile product={pid} height={70} radius="var(--radius-sm)" tag={false} />
          </div>
        ))}
      </div>
    </button>
  )
}

function DropCard({ post, onOpenGift }: { post: any; onOpenGift: (pid: string) => void }) {
  const [t, setT] = useState(post.ends)
  useEffect(() => {
    const tick = setInterval(
      () =>
        setT((prev: string) => {
          let [h, m, s] = prev.split(":").map(Number)
          let tot = h * 3600 + m * 60 + s - 1
          if (tot < 0) tot = 0
          h = Math.floor(tot / 3600)
          m = Math.floor((tot % 3600) / 60)
          s = tot % 60
          return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
        }),
      1000,
    )
    return () => clearInterval(tick)
  }, [])
  return (
    <div
      style={{
        borderRadius: "var(--radius)",
        overflow: "hidden",
        marginBottom: 16,
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ background: `linear-gradient(120deg, var(--accent), #FFB14B)`, padding: "14px 16px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "var(--font-ui)",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            <Icons.bolt size={16} />
            {post.title}
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontWeight: 700,
              fontSize: 13,
              background: "rgba(0,0,0,0.18)",
              padding: "3px 8px",
              borderRadius: 8,
            }}
          >
            {t}
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, opacity: 0.9, marginTop: 3 }}>{post.subtitle}</div>
      </div>
      <div style={{ background: "var(--surface)", padding: 14, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", marginBottom: 12 }}>
          {post.items.map((pid: string) => (
            <button
              key={pid}
              onClick={() => onOpenGift(pid)}
              style={{
                width: 120,
                flexShrink: 0,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <ProductTile product={pid} height={120} radius="var(--radius-sm)" tag={false} />
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text)",
                  marginTop: 6,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {P[pid].name}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
                ${P[pid].price}
              </div>
            </button>
          ))}
        </div>
        <Btn kind="solid" full icon={<Icons.bolt size={15} />}>
          Shop the drop
        </Btn>
      </div>
    </div>
  )
}

export function HomeFeed({
  onOpenGift,
  onOpenGroup,
  onOpenList,
  onSearch,
  onNotif,
  onStory,
}: {
  onOpenGift: (pid: string, post?: any) => void
  onOpenGroup: (gid: string) => void
  onOpenList: () => void
  onSearch: () => void
  onNotif: () => void
  onStory: (s: any) => void
}) {
  return (
    <div>
      {/* header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px 10px",
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Wordmark size={25} />
        <div style={{ display: "flex", gap: 2 }}>
          <IconBtn icon={<Icons.search size={23} />} onClick={onSearch} />
          <IconBtn icon={<Icons.bell size={23} />} onClick={onNotif} badge />
        </div>
      </div>
      <StoryTray onOpen={onStory} />
      <div style={{ padding: "0 16px" }}>
        {FEED.map((post) => {
          if (post.type === "find") return <FindCard key={post.id} post={post} onOpenGift={onOpenGift} />
          if (post.type === "group")
            return <GroupCard key={post.id} post={post} onOpenGroup={() => onOpenGroup(post.groupId)} />
          if (post.type === "activity") return <ActivityCard key={post.id} post={post} onOpenList={onOpenList} />
          if (post.type === "drop") return <DropCard key={post.id} post={post} onOpenGift={onOpenGift} />
          return null
        })}
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
