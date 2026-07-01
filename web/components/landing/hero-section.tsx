"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Heart, Search, Sparkles, Users, Gift, MessageCircle, Bookmark, Send } from "lucide-react";

/* ── Tab definitions ────────────────────────────────────────────────────── */
type TabId = "discover" | "swipe" | "gift" | "pool" | "maxi";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Heart;
}

const TABS: Tab[] = [
  { id: "discover", label: "Discover",  icon: Search },
  { id: "swipe",    label: "Swipe",     icon: Heart },
  { id: "gift",     label: "Gift",      icon: Gift },
  { id: "pool",     label: "Pool",      icon: Users },
  { id: "maxi",     label: "Maxi",      icon: Sparkles },
];

const AUTO_CYCLE_MS = 5000;

/* ── Mock UI panels ─────────────────────────────────────────────────────── */

function DiscoverPanel() {
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  const items = [
    { name: "Instant Film Camera",   brand: "Halo",      price: "$79",  emoji: "📸", color: "#ffc2d1" },
    { name: "Linen Throw Blanket",   brand: "Parachute",  price: "$129", emoji: "🧶", color: "#bfe3ff" },
    { name: "Matcha Starter Kit",    brand: "Ippodo",     price: "$45",  emoji: "🍵", color: "#cde6c5" },
    { name: "Vinyl Record Player",   brand: "Crosley",    price: "$89",  emoji: "🎵", color: "#d9c2ff" },
    { name: "Scented Candle Set",    brand: "Diptyque",   price: "$68",  emoji: "🕯️", color: "#ffe7a0" },
    { name: "Leather Journal",       brand: "Moleskine",  price: "$32",  emoji: "📓", color: "#ffd3a5" },
  ];

  return (
    <div className="h-full flex flex-col bg-[#faf6f0]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e0d5]">
        <div className="flex items-center gap-2">
          <MaxiIcon size={22} />
          <span className="font-bold text-sm text-[#211a14]">Giftmaxxing</span>
        </div>
        <div className="flex items-center gap-3 text-[#6c6157]">
          <Heart size={16} />
          <MessageCircle size={16} />
        </div>
      </div>
      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-xl bg-[#efe7da] px-3 py-2">
          <Search size={14} className="text-[#9c9389]" />
          <span className="text-xs text-[#9c9389]">Search gifts, friends, ideas...</span>
        </div>
      </div>
      {/* Grid */}
      <div className="flex-1 overflow-hidden px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#e8e0d5] bg-white overflow-hidden animate-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="h-[72px] grid place-items-center relative"
                style={{ backgroundColor: item.color }}
              >
                <span className="text-2xl">{item.emoji}</span>
                <button
                  type="button"
                  onClick={() => setLiked(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="absolute top-1.5 right-1.5"
                >
                  <Heart
                    size={14}
                    className={liked[i] ? "text-[#fb6f52] fill-[#fb6f52]" : "text-white/80"}
                  />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[10px] font-bold text-[#211a14] truncate">{item.name}</p>
                <p className="text-[9px] text-[#9c9389]">{item.brand} · {item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwipePanel() {
  const [swiped, setSwiped] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const handleSwipe = (dir: "left" | "right") => {
    setDirection(dir);
    setSwiped(true);
    setTimeout(() => {
      setSwiped(false);
      setDirection(null);
    }, 600);
  };

  return (
    <div className="h-full flex flex-col bg-[#faf6f0]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e0d5]">
        <span className="font-bold text-sm text-[#211a14]">Swipe Challenge</span>
        <span className="text-[10px] font-mono text-[#9c9389]">4 of 12</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div
          className={`relative w-full max-w-[220px] rounded-2xl border border-[#e8e0d5] bg-white shadow-lg overflow-hidden transition-all duration-500 ${
            swiped
              ? direction === "right"
                ? "translate-x-[120%] rotate-12 opacity-0"
                : "-translate-x-[120%] -rotate-12 opacity-0"
              : "translate-x-0 rotate-0 opacity-100"
          }`}
        >
          <div className="h-[140px] bg-gradient-to-br from-[#ffc2d1] to-[#d9c2ff] grid place-items-center">
            <span className="text-5xl">📸</span>
          </div>
          <div className="p-3">
            <p className="text-sm font-bold text-[#211a14]">Instant Film Camera</p>
            <p className="text-xs text-[#9c9389]">Halo · $79</p>
            <div className="flex items-center gap-1 mt-2">
              <Sparkles size={12} className="text-[#fb6f52]" />
              <span className="text-[10px] text-[#fb6f52] font-medium">94% match to Maya&apos;s taste</span>
            </div>
          </div>
        </div>
      </div>
      {/* Swipe buttons */}
      <div className="flex items-center justify-center gap-6 pb-5">
        <button
          type="button"
          onClick={() => handleSwipe("left")}
          className="w-12 h-12 rounded-full border-2 border-[#e8e0d5] bg-white grid place-items-center shadow-sm hover:border-red-300 transition-colors"
        >
          <span className="text-[#9c9389] text-lg">&#10005;</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwipe("right")}
          className="w-14 h-14 rounded-full bg-[#fb6f52] grid place-items-center shadow-lg hover:bg-[#fb6f52]/90 transition-colors"
        >
          <Heart size={22} className="text-white fill-white" />
        </button>
        <button
          type="button"
          className="w-12 h-12 rounded-full border-2 border-[#e8e0d5] bg-white grid place-items-center shadow-sm hover:border-[#ffc24b] transition-colors"
        >
          <Bookmark size={18} className="text-[#9c9389]" />
        </button>
      </div>
    </div>
  );
}

function GiftPanel() {
  const [claimed, setClaimed] = useState(false);

  return (
    <div className="h-full flex flex-col bg-[#faf6f0]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e0d5]">
        <span className="font-bold text-sm text-[#211a14]">Maya&apos;s Wishlist</span>
        <span className="text-[10px] rounded-full bg-[#fb6f52]/10 text-[#fb6f52] px-2 py-0.5 font-bold">3 items</span>
      </div>
      <div className="flex-1 overflow-hidden px-3 py-3 space-y-2">
        {[
          { name: "Instant Film Camera", price: "$79", emoji: "📸", color: "#ffc2d1", claimed: claimed },
          { name: "Linen Throw Blanket", price: "$129", emoji: "🧶", color: "#bfe3ff", claimed: false },
          { name: "Matcha Starter Kit", price: "$45", emoji: "🍵", color: "#cde6c5", claimed: false },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-[#e8e0d5] bg-white p-2.5 animate-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div
              className="w-12 h-12 rounded-lg grid place-items-center shrink-0"
              style={{ backgroundColor: item.color }}
            >
              <span className="text-xl">{item.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#211a14] truncate">{item.name}</p>
              <p className="text-[10px] text-[#9c9389]">{item.price}</p>
            </div>
            {i === 0 ? (
              <button
                type="button"
                onClick={() => setClaimed(!claimed)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${
                  item.claimed
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-[#fb6f52] text-white hover:bg-[#fb6f52]/90"
                }`}
              >
                {item.claimed ? "Claimed!" : "Claim"}
              </button>
            ) : (
              <span className="text-[10px] text-[#9c9389] font-medium">Open</span>
            )}
          </div>
        ))}
      </div>
      {/* Tip */}
      <div className="mx-3 mb-3 rounded-xl bg-[#fb6f52]/5 border border-[#fb6f52]/15 p-3 flex items-start gap-2">
        <Sparkles size={14} className="text-[#fb6f52] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#211a14] leading-relaxed">
          <span className="font-bold">Maxi tip:</span> Maya saved 3 film cameras on Pinterest last month. This is a lock.
        </p>
      </div>
    </div>
  );
}

function PoolPanel() {
  const [contributed, setContributed] = useState(false);
  const progress = contributed ? 87 : 62;

  return (
    <div className="h-full flex flex-col bg-[#faf6f0]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e0d5]">
        <span className="font-bold text-sm text-[#211a14]">Gift Pool</span>
        <span className="text-[10px] rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-bold">Active</span>
      </div>
      <div className="flex-1 overflow-hidden px-4 py-4 space-y-3">
        {/* Gift item */}
        <div className="flex items-center gap-3 rounded-xl bg-white border border-[#e8e0d5] p-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#d9c2ff] to-[#bfe3ff] grid place-items-center">
            <span className="text-2xl">🎵</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#211a14]">Vinyl Record Player</p>
            <p className="text-xs text-[#9c9389]">For Maya&apos;s birthday</p>
          </div>
        </div>
        {/* Progress */}
        <div>
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="font-bold text-[#211a14]">${Math.round(89 * progress / 100)} raised</span>
            <span className="text-[#9c9389]">${89} goal</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#efe7da] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#fb6f52] to-[#ff9a76] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {/* Contributors */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#9c9389] uppercase tracking-wider">Contributors</p>
          {[
            { name: "Jules", amount: "$25", color: "#d9c2ff" },
            { name: "Theo", amount: "$20", color: "#cde6c5" },
            { name: "Priya", amount: "$10", color: "#ffc2d1" },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-2.5 animate-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div
                className="w-7 h-7 rounded-full grid place-items-center text-white text-[10px] font-bold"
                style={{ background: c.color }}
              >
                {c.name[0]}
              </div>
              <span className="text-xs text-[#211a14] font-medium flex-1">{c.name}</span>
              <span className="text-xs font-bold text-[#211a14]">{c.amount}</span>
            </div>
          ))}
          {contributed && (
            <div className="flex items-center gap-2.5 animate-in">
              <div className="w-7 h-7 rounded-full grid place-items-center text-white text-[10px] font-bold bg-[#fb6f52]">
                Y
              </div>
              <span className="text-xs text-[#211a14] font-medium flex-1">You</span>
              <span className="text-xs font-bold text-[#fb6f52]">$22</span>
            </div>
          )}
        </div>
      </div>
      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => setContributed(!contributed)}
          className={`w-full h-10 rounded-xl text-sm font-bold transition-all ${
            contributed
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-[#fb6f52] text-white hover:bg-[#fb6f52]/90"
          }`}
        >
          {contributed ? "You chipped in $22!" : "Chip in"}
        </button>
      </div>
    </div>
  );
}

function MaxiPanel() {
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = [
    { from: "user", text: "What should I get Maya for her birthday?" },
    { from: "maxi", text: "Based on Maya's Pinterest saves and Spotify playlists, she's really into film photography and cozy aesthetics. Here are my top 3:" },
    { from: "maxi", text: "1. Instant Film Camera ($79) — 94% match\n2. Linen Throw Blanket ($129) — 88% match\n3. Vinyl Record Player ($89) — 85% match" },
  ];

  useEffect(() => {
    if (msgIndex < messages.length - 1) {
      const timer = setTimeout(() => setMsgIndex(prev => prev + 1), 1200);
      return () => clearTimeout(timer);
    }
  }, [msgIndex, messages.length]);

  return (
    <div className="h-full flex flex-col bg-[#faf6f0]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e8e0d5]">
        <MaxiIcon size={22} />
        <div>
          <span className="font-bold text-sm text-[#211a14]">Maxi</span>
          <span className="ml-2 text-[10px] rounded-full bg-[#fb6f52]/10 text-[#fb6f52] px-1.5 py-0.5 font-bold">AI</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-3 py-3 space-y-2.5">
        {messages.slice(0, msgIndex + 1).map((msg, i) => (
          <div
            key={i}
            className={`flex animate-in ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            style={{ animationDelay: `${i * 200}ms` }}
          >
            {msg.from === "maxi" && (
              <div className="w-6 h-6 rounded-full bg-[#fb6f52] grid place-items-center shrink-0 mr-1.5 mt-0.5">
                <Sparkles size={12} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line ${
                msg.from === "user"
                  ? "bg-[#211a14] text-white rounded-br-sm"
                  : "bg-white border border-[#e8e0d5] text-[#211a14] rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {msgIndex < messages.length - 1 && (
          <div className="flex items-center gap-1.5 pl-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#9c9389] animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9c9389] animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9c9389] animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 border-t border-[#e8e0d5] px-3 py-2.5">
        <input
          readOnly
          placeholder="Ask Maxi anything..."
          className="flex-1 bg-[#efe7da] rounded-full px-3 py-2 text-[11px] outline-none text-[#9c9389]"
        />
        <div className="w-8 h-8 rounded-full bg-[#fb6f52] grid place-items-center">
          <Send size={14} className="text-white" />
        </div>
      </div>
    </div>
  );
}

/* ── Maxi icon (small inline version) ───────────────────────────────── */
function MaxiIcon({ size = 20 }: { size?: number }) {
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

/* ── Panel renderer (keyed for remount) ─────────────────────────────── */
const PANELS: Record<TabId, () => React.JSX.Element> = {
  discover: DiscoverPanel,
  swipe: SwipePanel,
  gift: GiftPanel,
  pool: PoolPanel,
  maxi: MaxiPanel,
};

/* ── Hero section ───────────────────────────────────────────────────── */
export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("discover");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration animation trigger
    setIsVisible(true);
  }, []);

  // Auto-cycle tabs
  const startCycle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveTab(prev => {
        const idx = TABS.findIndex(t => t.id === prev);
        return TABS[(idx + 1) % TABS.length].id;
      });
    }, AUTO_CYCLE_MS);
  }, []);

  useEffect(() => {
    startCycle();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startCycle]);

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    startCycle(); // restart timer on manual click
  };

  const Panel = PANELS[activeTab];

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-background">
      {/* Background — warm gradient with subtle image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 120% at 80% 25%, rgba(251,111,82,0.16), transparent 55%), radial-gradient(90% 90% at 95% 8%, rgba(255,194,75,0.14), transparent 50%), #f7f2eb",
        }}
      >
        <img
          src="https://cdn.midjourney.com/5a63ddac-c6a0-48f2-86b4-cd48e8ba610f/0_3.jpeg"
          alt=""
          aria-hidden="true"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          className="w-full h-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f7f2eb] via-[#f7f2eb]/80 to-[#f7f2eb]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f2eb]/60 via-transparent to-[#f7f2eb]/80" />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none opacity-20">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px bg-foreground/5" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
        ))}
        {[...Array(12)].map((_, i) => (
          <div key={`v-${i}`} className="absolute w-px bg-foreground/5" style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            {/* Eyebrow */}
            <div className={`mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
                <span className="w-8 h-px bg-foreground/30" />
                Social gifting, powered by Maxi
              </span>
            </div>

            {/* Headline */}
            <h1
              className={`text-left text-[clamp(2.2rem,5vw,5rem)] font-display leading-[0.92] tracking-tight text-foreground transition-all duration-1000 mb-6 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Gifting,
              <br />
              <span className="word-gradient">finally figured out.</span>
            </h1>

            {/* Subtitle */}
            <p
              className={`text-lg text-muted-foreground leading-relaxed max-w-md mb-8 transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              The all-in-one social gifting app with an AI companion who actually gets their taste.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row items-start gap-4 transition-all duration-700 delay-300 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 bg-[#fb6f52] hover:bg-[#fb6f52]/90 text-white font-semibold px-8 h-14 rounded-full text-base transition-colors group"
              >
                Try it now
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/challenge"
                className="inline-flex items-center gap-2 border border-foreground/20 hover:border-foreground/40 bg-background/60 backdrop-blur-sm text-foreground font-semibold px-8 h-14 rounded-full text-base transition-colors"
              >
                Share a challenge
              </Link>
            </div>
          </div>

          {/* Right — Interactive demo (Railway-style) */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            {/* Device frame */}
            <div className="rounded-2xl border border-foreground/10 bg-[#1a1618] shadow-2xl shadow-black/20 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1618] border-b border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff6159]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 flex-1 text-center text-[10px] text-white/30 font-mono truncate">
                  giftmaxxing.app
                </span>
              </div>

              {/* Panel content — fixed height for consistency */}
              <div className="h-[400px] relative overflow-hidden">
                <div key={activeTab} className="absolute inset-0 animate-panel-in">
                  <Panel />
                </div>
              </div>

              {/* Tab bar — Railway-style bottom pills */}
              <div className="flex items-center justify-center gap-1 px-3 py-2.5 bg-[#1a1618] border-t border-white/5">
                {TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 ${
                        active
                          ? "bg-[#fb6f52] text-white shadow-sm shadow-[#fb6f52]/30"
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <Icon size={13} />
                      <span className={active ? "block" : "hidden sm:block"}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div
        className={`absolute bottom-8 left-0 right-0 px-6 lg:px-12 transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-start gap-10 lg:gap-20">
          {[
            { value: "12k+", label: "finds shared by friends" },
            { value: "0", label: "double-bought gifts" },
            { value: "4.9\u2605", label: "gifts they actually loved" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-2">
              <span className="text-3xl lg:text-4xl font-display text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
