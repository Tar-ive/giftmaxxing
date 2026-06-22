"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { GRADIENTS, type Grad } from "@/lib/data";

function Ava({ grad, label, size = 34 }: { grad: Grad; label: string; size?: number }) {
  const initials = label
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className="grid place-items-center rounded-full text-[11px] font-bold text-white shrink-0"
      style={{ width: size, height: size, background: GRADIENTS[grad] }}
    >
      {initials}
    </span>
  );
}

const perks = [
  { icon: Heart, text: "Like and save finds straight to a wishlist" },
  { icon: MessageCircle, text: "Comment and tag who it's perfect for" },
  { icon: Sparkles, text: "Maxi explains why it matches their taste" },
  { icon: Bookmark, text: "Claim an item so nobody double-buys" },
];

export function ShowcaseSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div
            className={`lg:col-span-5 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-12 h-px bg-foreground/30" />
              The feed
            </span>
            <h2 className="text-6xl md:text-7xl font-display tracking-tight leading-[0.92] mb-8">
              See it.
              <br />
              Then <span className="word-gradient">gift it.</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-md">
              Every find opens into the full view — the photo, the price, who&apos;s
              claiming it, the comments. This is the exact in-app experience,
              embedded right here.
            </p>

            <ul className="space-y-4 mb-10">
              {perks.map((perk) => (
                <li key={perk.text} className="flex items-center gap-4">
                  <span className="grid place-items-center w-10 h-10 rounded-full border border-foreground/15 bg-card shrink-0">
                    <perk.icon className="w-4 h-4 text-[#fb6f52]" />
                  </span>
                  <span className="text-foreground/80">{perk.text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/feed"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-[#fb6f52] text-white text-base font-medium hover:bg-[#fb6f52]/90 transition-colors group"
              >
                Open the live feed
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#maxi"
                className="inline-flex items-center justify-center h-14 px-8 rounded-full border border-foreground/20 text-base hover:bg-foreground/5 transition-colors"
              >
                Meet Maxi
              </a>
            </div>
          </div>

          {/* Right: device frame with the IG-style individual post view */}
          <div
            className={`lg:col-span-7 transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <div className="rounded-2xl border border-foreground/15 bg-[#fbf7f1] text-[#211a14] overflow-hidden shadow-xl shadow-black/10">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e8e0d5] bg-[#f1e8dc]">
                <span className="w-3 h-3 rounded-full bg-[#ff6159]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 flex-1 text-center text-xs text-[#9c9389] font-mono truncate">
                  giftmaxxing.app/feed
                </span>
              </div>

              {/* Post two-pane */}
              <div className="flex flex-col md:flex-row">
                {/* media */}
                <div
                  className="relative grid place-items-center flex-1 min-h-[280px] md:min-h-[440px]"
                  style={{ background: GRADIENTS.sky }}
                >
                  <span className="text-[120px] drop-shadow-sm">📷</span>
                  <div className="absolute bottom-4 left-4 rounded-xl bg-black/55 px-4 py-2.5 text-white backdrop-blur">
                    <p className="text-sm font-bold">Mini Instant Camera</p>
                    <p className="text-xs text-white/80">Halo · $79</p>
                  </div>
                </div>

                {/* comments pane */}
                <div className="flex w-full md:w-[330px] flex-col border-t border-[#e8e0d5] md:border-l md:border-t-0">
                  <div className="flex items-center gap-3 border-b border-[#e8e0d5] px-4 py-3">
                    <Ava grad="rose" label="Maya Reyes" />
                    <span className="text-sm font-bold">mayareyes</span>
                    <MoreHorizontal className="ml-auto w-5 h-5 text-[#6c6157]" />
                  </div>

                  <div className="flex-1 space-y-4 px-4 py-4 max-h-[260px] overflow-y-auto">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fb6f52]/10 border border-[#fb6f52]/25 px-3 py-1 text-xs text-[#b4452f]">
                      <Sparkles className="w-3 h-3" />
                      Maxi · matches Maya&apos;s saved film aesthetic
                    </div>
                    <div className="flex gap-3">
                      <Ava grad="rose" label="Maya Reyes" size={32} />
                      <p className="text-sm leading-snug">
                        <span className="font-bold">mayareyes</span> genuinely the
                        move for anyone turning 22. point-and-shoot szn is back 📸
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Ava grad="lilac" label="Jules Park" size={32} />
                      <p className="text-sm leading-snug">
                        <span className="font-bold">julesp</span> adding to my list
                        immediately
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Ava grad="sage" label="Theo Lin" size={32} />
                      <p className="text-sm leading-snug">
                        <span className="font-bold">theolin</span> the film aesthetic
                        &gt;&gt;&gt;
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#e8e0d5] px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Heart className="w-6 h-6 text-[#fb6f52] fill-[#fb6f52]" />
                      <MessageCircle className="w-6 h-6" />
                      <Send className="w-6 h-6" />
                      <Bookmark className="ml-auto w-6 h-6" />
                    </div>
                    <p className="mt-2 text-sm font-bold">214 likes</p>
                    <p className="text-xs text-[#9c9389]">12m ago</p>
                  </div>

                  <div className="flex items-center gap-2 border-t border-[#e8e0d5] px-4 py-3">
                    <input
                      placeholder="Add a comment…"
                      className="flex-1 bg-transparent text-sm placeholder:text-[#9c9389] outline-none"
                    />
                    <span className="text-sm font-bold text-[#fb6f52]/60">Post</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
