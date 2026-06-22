"use client";

import { useState } from "react";
import { GRADIENTS, PRODUCTS } from "@/lib/data";
import { Maxi } from "@/components/ui";

type Msg = { from: "maxi" | "you"; text: string; product?: string; chips?: string[] };

const SEED: Msg[] = [
  { from: "maxi", text: "hey! Maya's birthday is in 4 days 🎈 want me to pull ideas from her vibe?" },
  { from: "you", text: "yes do it" },
  {
    from: "maxi",
    text: "on it. I scanned her linked Pinterest + recent saves — she's deep in a film-photography + cozy-home phase rn.",
    chips: ["Pinterest", "Saved posts"],
  },
  { from: "maxi", text: "top match — 94% her aesthetic and inside your $60 budget:", product: "camera" },
];

const SUGGESTED = ["Gift under $40", "Something cozy", "Group gift for Sam", "Surprise me"];

export default function MaxiPage() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setMsgs((m) => [...m, { from: "you", text: clean }]);
    setDraft("");
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          from: "maxi",
          text: "great direction — here's a pick that fits the budget and their taste:",
          product: PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)].id,
        },
      ]);
    }, 600);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-0px)] max-w-2xl flex-col md:h-screen">
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Maxi size={40} />
        <div>
          <p className="font-bold text-ink">Maxi</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> your AI gift companion
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-6">
        {msgs.map((m, i) => {
          const product = m.product ? PRODUCTS.find((p) => p.id === m.product) : null;
          const mine = m.from === "you";
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-snug ${
                    mine ? "bg-ink text-cream" : "border border-line bg-surface text-ink"
                  }`}
                >
                  {m.text}
                </div>
                {m.chips && (
                  <div className="mt-1.5 flex gap-1.5">
                    {m.chips.map((c) => (
                      <span key={c} className="rounded-full border border-line bg-cream-2 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {product && (
                  <div className="mt-2 flex w-56 items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 shadow-sm">
                    <span
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl"
                      style={{ background: GRADIENTS[product.grad] }}
                    >
                      {product.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{product.name}</p>
                      <p className="text-xs text-ink-faint">{product.brand} · ${product.price}</p>
                      <button className="mt-1 text-xs font-bold text-coral">Add to list →</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-2"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Maxi for a gift idea…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
          />
          <button type="submit" className="text-sm font-bold text-coral">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
