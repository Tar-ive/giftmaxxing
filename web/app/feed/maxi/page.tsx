"use client";

import { useRef } from "react";
import { Maxi, Icons } from "@/components/ui";
import { useMaxi } from "@/components/app/maxi-provider";
import { useCurrentUser } from "@/lib/identity";

const PROMPTS = [
  "Gift under $40 for my mom",
  "Something cozy for a housewarming",
  "Find me a deal under $30",
  "Show me gifts like my taste",
  "Birthday gift for a foodie",
  "What's in my cart?",
];

const CAPS = [
  { emoji: "🧠", title: "Visual search", body: "Matches a person's aesthetic with S3 Vectors similarity over real product photos." },
  { emoji: "🎙️", title: "Voice", body: "Tap the mic and just talk — Maxi listens, and can talk back." },
  { emoji: "🛒", title: "Agentic shopping", body: "Maxi finds the gift, adds it to your cart, and checks out for you." },
  { emoji: "🏷️", title: "Deal hunting", body: "Ask for discounts and Maxi surfaces the best value finds in budget." },
];

export default function MaxiPage() {
  const { ask, setOpen } = useMaxi();
  const me = useCurrentUser();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const firstName = me.name !== "You" ? me.name.split(" ")[0] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <Maxi size={72} />
        <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">Maxi</h1>
        <p className="mt-1 text-ink-soft">
          {firstName ? `Hey ${firstName} — ` : ""}your AI gift concierge. Find it, cart it, gift it.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-5 rounded-full bg-coral px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Open Maxi chat
        </button>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3">
        {CAPS.map((c) => (
          <div key={c.title} className="rounded-2xl border border-line bg-surface p-4">
            <span className="text-2xl">{c.emoji}</span>
            <p className="mt-2 font-bold text-ink">{c.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface/60 p-5 text-center">
        <p className="font-bold text-ink">📷 Visual search</p>
        <p className="mt-1 text-xs text-ink-soft">
          Upload a photo of something you love and Maxi finds gifts with a similar vibe.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) ask("find gifts that match this aesthetic / my taste");
            e.currentTarget.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-3 rounded-full border border-line bg-cream px-4 py-2 text-sm font-semibold text-ink hover:bg-coral-soft"
        >
          Upload an image
        </button>
      </div>

      <p className="mt-8 text-sm font-bold text-ink-soft">Try asking</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => ask(p)}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-coral-soft"
          >
            <Icons.sparkle size={16} className="shrink-0 text-coral" />
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
