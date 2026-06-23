"use client";

import { useCallback, useState } from "react";
import { SwipeDeck } from "@/components/app/swipe-deck";
import { Icons } from "@/components/ui";
import { useCurrentUser } from "@/lib/identity";

export default function SwipePage() {
  const me = useCurrentUser();
  const firstName = me.name !== "You" ? me.name.split(/\s+/)[0] : null;
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/feed/swipe` : "/feed/swipe";
    const text =
      "Would you want this gifted to you? 👀 Swipe to find your gift taste on Giftmaxxing";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Giftmaxxing", text, url });
        return;
      }
    } catch {
      // user dismissed the native sheet, or it's unsupported — fall back to copy
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — nothing else to do
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral">
          <Icons.trend size={14} /> Viral challenge
        </span>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink">
          Would you want this gifted to you?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          {firstName ? `${firstName}, swipe` : "Swipe"} right for yes, left for no. Every swipe
          trains your gift recommendations.
        </p>
        <button
          onClick={share}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-coral-soft"
        >
          <Icons.share size={16} /> {copied ? "Link copied!" : "Share the challenge"}
        </button>
      </div>

      <div className="mt-8">
        <SwipeDeck />
      </div>

      <p className="mx-auto mt-8 max-w-md text-center text-xs leading-relaxed text-ink-faint">
        Your &ldquo;yes&rdquo; swipes become the taste centroid for our S3 Vectors recommender —
        the more you swipe, the sharper your matches get.
      </p>
    </div>
  );
}
