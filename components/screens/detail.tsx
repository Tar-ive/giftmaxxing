// Giftmaxxing — Gift detail + Group gift detail
"use client"

import { useState } from "react"
import { P, U, GROUP_DETAIL } from "@/lib/data"
import { Icons, Maxi } from "@/components/icons"
import { Avatar, ProductTile, Price, Btn, Chip, IconBtn, Progress, cardStyle, ScreenHeader } from "@/components/ui-atoms"

function MaxiBundleCard({ items, onAddBundle }: { items: string[]; onAddBundle: () => void }) {
  const total = items.reduce((s, id) => s + P[id].price, 0)
  return (
    <div
      style={{
        background: "var(--accent-soft)",
        borderRadius: "var(--radius)",
        padding: 14,
        marginTop: 8,
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <Maxi size={34} />
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)" }}>
          <span style={{ fontWeight: 800, color: "var(--accent)" }}>Maxi</span> · complete the set
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {items.map((id, i) => (
          <div key={id} style={{ display: "contents" }}>
            {i > 0 && <Icons.plus size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <ProductTile product={id} height={68} radius="var(--radius-sm)" tag={false} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-2)" }}>
          Bundle total <span style={{ fontWeight: 800, color: "var(--text)" }}>${total}</span>
        </div>
        <Btn kind="accent" size="sm" onClick={onAddBundle} icon={<Icons.gift size={14} />}>
          Gift the set
        </Btn>
      </div>
    </div>
  )
}

export function GiftDetail({
  productId,
  post,
  onBack,
  onAddToList,
}: {
  productId: string
  post?: any
  onBack: () => void
  onAddToList: () => void
}) {
  const p = P[productId]
  const [saved, setSaved] = useState(false)
  const [alert, setAlert] = useState(!!p.was)
  const from = post && post.user ? U[post.user] : null
  const bundle: string[] =
    ({ camera: ["camera", "journal"], perfume: ["perfume", "candle"], vinyl: ["vinyl", "candle"] } as Record<
      string,
      string[]
    >)[productId] || [productId, "candle"]
  const savers = ["maya", "jules", "theo", "noor"].filter((x) => x !== post?.user).slice(0, 3)
  // stable percentage so it doesn't flicker on re-render
  const [stylePct] = useState(() => Math.floor(88 + Math.random() * 8))

  return (
    <div style={{ paddingBottom: 24 }}>
      <ScreenHeader title="" onBack={onBack} right={<IconBtn icon={<Icons.share size={21} />} />} />
      <div style={{ padding: "4px 16px 0" }}>
        <ProductTile product={productId} height={340} radius="var(--radius)">
          {from && (
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(0,0,0,0.32)",
                backdropFilter: "blur(6px)",
                padding: "5px 10px 5px 5px",
                borderRadius: 999,
              }}
            >
              <Avatar user={post.user} size={22} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, color: "#fff" }}>
                {stylePct}% {from.name.split(" ")[0]}&apos;s style
              </span>
            </div>
          )}
        </ProductTile>

        {/* title + price */}
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-3)",
            }}
          >
            {p.brand} · {p.cat}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--display-weight)" as unknown as number,
              fontStyle: "var(--display-style)",
              fontSize: 27,
              color: "var(--text)",
              lineHeight: 1.1,
              margin: "4px 0 8px",
            }}
          >
            {p.name}
          </div>
          <Price product={productId} size={20} />
        </div>

        {/* social proof */}
        {savers.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <div style={{ display: "flex" }}>
              {savers.map((c, i) => (
                <div key={c} style={{ marginLeft: i ? -9 : 0, borderRadius: "50%", border: "2px solid var(--bg)" }}>
                  <Avatar user={c} size={26} />
                </div>
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--text-2)" }}>
              <b style={{ color: "var(--text)" }}>{U[savers[0]].name.split(" ")[0]}</b> + {savers.length - 1} friends
              saved this
            </span>
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Btn
            kind={saved ? "quiet" : "ghost"}
            onClick={() => setSaved(!saved)}
            full
            icon={saved ? <Icons.heartFill size={16} /> : <Icons.heart size={16} />}
          >
            {saved ? "Saved" : "Add to wishlist"}
          </Btn>
          <Btn kind="accent" onClick={onAddToList} full icon={<Icons.gift size={16} />}>
            Gift now
          </Btn>
        </div>

        {/* price-drop alert */}
        <div style={{ ...cardStyle({ padding: "12px 14px", marginTop: 14 }), display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
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
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>
              Price-drop alert
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-3)" }}>
              {p.was ? `Down ${Math.round((1 - p.price / p.was) * 100)}% this week` : "Ping me if it dips"}
            </div>
          </div>
          <button
            onClick={() => setAlert(!alert)}
            style={{
              width: 46,
              height: 28,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: alert ? "var(--accent)" : "var(--line)",
              position: "relative",
              transition: "background .2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: alert ? 21 : 3,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fff",
                transition: "left .2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </button>
        </div>

        {/* Maxi bundle */}
        <MaxiBundleCard items={bundle} onAddBundle={onAddToList} />

        {/* buy options incl. preloved */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13.5, color: "var(--text)", marginBottom: 9 }}>
            Where to get it
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Chip active>
              <Icons.tag size={14} />
              New · ${p.price}
            </Chip>
            <Chip>
              <Icons.scissors size={14} />
              Preloved from ${Math.round(p.price * 0.55)}
            </Chip>
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
            {["Depop", "Poshmark", "Vinted"].map((m) => (
              <span
                key={m}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  border: "1px solid var(--line)",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {m}
              </span>
            ))}
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--text-3)", alignSelf: "center" }}>
              · gift it greener
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GroupDetail({ onBack, onChipIn }: { onBack: () => void; onChipIn: () => void }) {
  const G = GROUP_DETAIL
  const [amount, setAmount] = useState(20)
  const remaining = G.goal - G.raised
  return (
    <div style={{ paddingBottom: 24 }}>
      <ScreenHeader title="Group gift" onBack={onBack} right={<IconBtn icon={<Icons.share size={21} />} />} />
      <div style={{ padding: "4px 16px 0" }}>
        <ProductTile product={G.item} height={220} radius="var(--radius)" />
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--display-weight)" as unknown as number,
              fontStyle: "var(--display-style)",
              fontSize: 25,
              color: "var(--text)",
              lineHeight: 1.1,
            }}
          >
            {G.title}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.45 }}>
            {G.note}
          </div>
        </div>

        {/* progress */}
        <div style={cardStyle({ padding: 16, marginTop: 16 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--display-weight)" as unknown as number,
                fontStyle: "var(--display-style)",
                fontSize: 26,
                color: "var(--text)",
              }}
            >
              ${G.raised}
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-3)" }}>of ${G.goal} goal</span>
          </div>
          <Progress value={G.raised} goal={G.goal} height={10} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 9,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
            }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              {G.count} of {G.of} chipped in
            </span>
            <span style={{ color: "var(--text-2)" }}>
              <Icons.clock size={12} style={{ verticalAlign: -2 }} /> closes {G.deadline} · ${remaining} to go
            </span>
          </div>
        </div>

        {/* chip in */}
        <div style={cardStyle({ padding: 16, marginTop: 14 })}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 10 }}>
            Your chip-in
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[10, 20, 30, remaining].map((v, i) => (
              <button
                key={i}
                onClick={() => setAmount(v)}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid " + (amount === v ? "var(--accent)" : "var(--line)"),
                  cursor: "pointer",
                  background: amount === v ? "var(--accent-soft)" : "transparent",
                  color: amount === v ? "var(--accent)" : "var(--text)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {i === 3 ? "Cover rest" : "$" + v}
              </button>
            ))}
          </div>
          <Btn kind="accent" full onClick={onChipIn} icon={<Icons.wallet size={16} />}>
            Chip in ${amount}
          </Btn>
        </div>

        {/* contributors */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13.5, color: "var(--text)", marginBottom: 10 }}>
            Who&apos;s in
          </div>
          {G.contributors.map((c) => (
            <div
              key={c.user}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "8px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <Avatar user={c.user} size={36} />
              <div style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                {U[c.user].name}
                {c.user === G.org && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--accent)",
                      fontWeight: 700,
                      marginLeft: 6,
                      background: "var(--accent-soft)",
                      padding: "1px 7px",
                      borderRadius: 999,
                    }}
                  >
                    organizer
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                ${c.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
