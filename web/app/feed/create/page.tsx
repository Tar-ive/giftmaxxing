"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRADIENTS } from "@/lib/data";
import { PINS, type Pin } from "@/lib/pins";
import { pinToProduct } from "@/lib/feed-builder";
import type { Post } from "@/lib/social";
import { useCurrentUser } from "@/lib/identity";
import { useStore } from "@/components/app/store";
import { useMaxi } from "@/components/app/maxi-provider";

const PICKS = PINS.filter((_, i) => i % 3 === 0).slice(0, 18); // varied sample

export default function CreatePage() {
  const router = useRouter();
  const me = useCurrentUser();
  const { addPost } = useStore();
  const { ask } = useMaxi();
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<Pin | null>(null);

  const share = () => {
    if (!selected) return;
    const text = caption.trim();
    const post: Post = {
      id: `you-${Date.now()}`,
      user: "you",
      time: "now",
      product: pinToProduct(selected),
      caption: text || "a find worth gifting 🎁",
      likes: 0,
      liked: false,
      saved: false,
      comments: [],
      commentCount: 0,
      source: selected.brand,
      url: selected.url,
      productUrl: selected.url,
    };
    addPost(post);
    if (/@maxi\b/i.test(text)) ask(text.replace(/@maxi\b/i, "").trim() || `gift ideas like ${selected.title}`);
    router.push("/feed");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink">New post</h1>
        <button
          onClick={share}
          disabled={!selected}
          className="rounded-full bg-coral px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Share
        </button>
      </div>

      <div className="mt-5 flex gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold text-white"
          style={{ background: GRADIENTS[me.grad] }}
        >
          {me.name.charAt(0)}
        </span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          placeholder="Say something about this find…  (mention @maxi for gift picks)"
          className="flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-coral"
        />
      </div>

      {selected && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="relative aspect-[4/3] w-full" style={{ background: GRADIENTS[selected.grad] }}>
            <span className="absolute inset-0 grid place-items-center text-5xl">{selected.emoji}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.image} alt={selected.title} className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
          <div className="flex items-center justify-between p-3">
            <p className="truncate text-sm font-semibold text-ink">{selected.title.slice(0, 48)}</p>
            <span className="shrink-0 text-sm font-bold text-ink">${selected.price}</span>
          </div>
        </div>
      )}

      <p className="mt-6 text-sm font-bold text-ink-soft">Attach a gift</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {PICKS.map((p) => {
          const active = selected?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 ${active ? "border-coral" : "border-transparent"}`}
              style={{ background: GRADIENTS[p.grad] }}
            >
              <span className="absolute inset-0 grid place-items-center text-2xl">{p.emoji}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
