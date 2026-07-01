"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Heart, Gift, Users, Sparkles, ArrowRight } from "lucide-react";

interface Feature {
  tag: string;
  icon: typeof Search;
  headline: string;
  headlineAccent: string;
  description: string;
  cta: { text: string; href: string };
  bullets: { title: string; description: string }[];
  alternatives?: string[];
}

const FEATURES: Feature[] = [
  {
    tag: "Discover",
    icon: Search,
    headline: "A feed of finds",
    headlineAccent: "not a search box.",
    description: "See what friends are saving, gifting and unwrapping. Gift ideas surface naturally from people whose taste you trust.",
    cta: { text: "Open the feed", href: "/feed" },
    bullets: [
      { title: "Taste-matched recommendations", description: "Every item is scored against the recipient's real interests." },
      { title: "Friend-powered discovery", description: "See saves and shares from your circle before generic ads." },
      { title: "No doom-scrolling", description: "Curated, finite feed designed around intent, not engagement." },
    ],
    alternatives: ["Amazon wish lists", "Google Shopping", "Pinterest boards"],
  },
  {
    tag: "Swipe",
    icon: Heart,
    headline: "Swipe to learn",
    headlineAccent: "their taste.",
    description: "In 60 seconds, Maxi understands what they love. Share a challenge link and let recipients reveal their own style — no guessing required.",
    cta: { text: "Try a challenge", href: "/challenge" },
    bullets: [
      { title: "60-second taste quiz", description: "Swipe on curated items to build a taste profile fast." },
      { title: "Shareable challenge links", description: "Send a link — they swipe, you see what they actually want." },
      { title: "Pinterest & Spotify import", description: "Already have saves? Maxi reads them automatically." },
    ],
  },
  {
    tag: "Gift",
    icon: Gift,
    headline: "Claim it",
    headlineAccent: "before someone else does.",
    description: "Shared wishlists the whole group can see. Claim an item so nobody double-buys, and everyone gets something they actually wanted.",
    cta: { text: "Browse wishlists", href: "/feed/shop" },
    bullets: [
      { title: "Claim to prevent double-buys", description: "Lock an item so the group knows it's handled." },
      { title: "Budget-aware suggestions", description: "Maxi filters by your budget — not the store's." },
      { title: "One-tap purchase", description: "Buy directly through affiliate links, no middleman." },
    ],
  },
  {
    tag: "Pool",
    icon: Users,
    headline: "Go in together",
    headlineAccent: "on the big one.",
    description: "Pool money for the gift nobody could afford solo. Split it, track it, and ship it together in a few taps.",
    cta: { text: "Start a pool", href: "/feed/pools" },
    bullets: [
      { title: "Transparent tracking", description: "Everyone sees who chipped in and how much is left." },
      { title: "Flexible splits", description: "Equal, custom, or pay-what-you-can — you set the rules." },
    ],
  },
  {
    tag: "Maxi",
    icon: Sparkles,
    headline: "Your AI gift companion",
    headlineAccent: "who actually gets it.",
    description: "Maxi reads their Pinterest, Spotify and saved finds — then suggests gifts they'll love, inside your budget. Not a search engine. A companion.",
    cta: { text: "Ask Maxi", href: "/feed/maxi" },
    bullets: [
      { title: "Taste-aware matching", description: "94% accuracy against real recipient preferences." },
      { title: "Budget-locked", description: "Never suggests above what you can spend." },
      { title: "Context from every signal", description: "Combines social saves, past gifts, and trend data." },
    ],
  },
];

const FEATURE_COLORS = ["#ffc2d1", "#d9c2ff", "#cde6c5", "#bfe3ff", "#ffe7a0"];

function FeatureBlock({ feature, index }: { feature: Feature; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const Icon = feature.icon;
  const accentColor = FEATURE_COLORS[index % FEATURE_COLORS.length];

  return (
    <div ref={ref} className="relative">
      {/* Vertical connector line (skip on first) */}
      {index > 0 && (
        <div className="absolute left-6 lg:left-12 -top-16 w-px h-16 bg-gradient-to-b from-transparent to-foreground/10" />
      )}

      <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-start transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}>
        {/* Text column */}
        <div className={index % 2 === 1 ? "lg:order-2" : ""}>
          {/* Tag */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-8 h-8 rounded-lg grid place-items-center"
              style={{ backgroundColor: `${accentColor}40` }}
            >
              <Icon size={16} style={{ color: "#fb6f52" }} />
            </div>
            <span className="text-sm font-mono text-muted-foreground">{feature.tag}</span>
          </div>

          {/* Headline */}
          <h3 className="text-4xl lg:text-5xl font-display tracking-tight leading-[0.95] mb-4">
            {feature.headline}
            <br />
            <span className="text-muted-foreground">{feature.headlineAccent}</span>
          </h3>

          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
            {feature.description}
          </p>

          <Link
            href={feature.cta.href}
            className="inline-flex items-center gap-2 text-[#fb6f52] font-semibold text-sm hover:gap-3 transition-all"
          >
            {feature.cta.text}
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Bullet cards */}
        <div className={`space-y-3 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
          {feature.bullets.map((b, i) => (
            <div
              key={i}
              className={`rounded-xl border border-foreground/10 bg-card p-5 hover-lift transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${(i + 1) * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                  style={{ backgroundColor: accentColor }}
                />
                <div>
                  <p className="font-semibold text-foreground text-sm">{b.title}</p>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{b.description}</p>
                </div>
              </div>
            </div>
          ))}

          {/* "Alternative to" badges */}
          {feature.alternatives && (
            <div className="flex items-center gap-3 pt-2 px-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Alternative to</span>
              {feature.alternatives.map((alt) => (
                <span key={alt} className="text-[10px] text-muted-foreground border border-foreground/10 rounded-full px-2.5 py-0.5">
                  {alt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Section header */}
        <div className="mb-20 lg:mb-28">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-12 h-px bg-foreground/30" />
            Everything you need
          </span>
          <h2 className="text-6xl md:text-7xl lg:text-[100px] font-display tracking-tight leading-[0.9]">
            From idea
            <br />
            <span className="text-muted-foreground">to unwrap.</span>
          </h2>
        </div>

        {/* Feature blocks */}
        <div className="space-y-24 lg:space-y-32">
          {FEATURES.map((feature, i) => (
            <FeatureBlock key={feature.tag} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
