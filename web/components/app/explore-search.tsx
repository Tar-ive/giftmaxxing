"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "@/components/ui";
import { GRADIENTS, type Grad } from "@/lib/data";
import { PINS, type Pin } from "@/lib/pins";
import { shortTitle } from "@/lib/feed-builder";
import { isApiConfigured } from "@/lib/api";
import { visualSearch, type VisualSearchResult } from "@/lib/visual-search";

// Explore search: text search filters the bundled catalog instantly; the camera
// button runs real visual search (uploaded image -> Bedrock Titan Multimodal
// embedding -> S3 Vectors kNN via POST /visual-search). When neither is active,
// the page's default content (swipe deck + browse grid) is shown.

type Card = {
  id: string;
  title: string;
  image: string;
  grad: Grad;
  emoji: string;
  price?: number;
  brand?: string;
  url?: string;
  badge?: string;
};

const BY_ID = new Map<string, Pin>(PINS.map((p) => [p.id, p]));

function pinToCard(p: Pin): Card {
  return {
    id: p.id,
    title: shortTitle(p.title),
    image: p.image,
    grad: p.grad,
    emoji: p.emoji,
    price: p.price,
    brand: p.brand,
    url: p.url,
  };
}

function visualToCard(r: VisualSearchResult): Card {
  const pin = BY_ID.get(r.id);
  return {
    id: r.id,
    title: shortTitle(r.title || pin?.title || "Gift find"),
    image: r.imageUrl || pin?.image || "",
    grad: pin?.grad ?? "peach",
    emoji: pin?.emoji ?? "🎁",
    price: r.price ?? pin?.price,
    brand: r.brand || pin?.brand,
    url: pin?.url,
    badge: r.similarity ? `${Math.round(r.similarity * 100)}% match` : undefined,
  };
}

function textToCards(q: string): Card[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return PINS.filter(
    (p) =>
      p.title.toLowerCase().includes(t) ||
      p.brand.toLowerCase().includes(t) ||
      p.category.toLowerCase().includes(t)
  ).map(pinToCard);
}

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <a
          key={c.id}
          href={c.url || "#"}
          target={c.url ? "_blank" : undefined}
          rel="noreferrer"
          className="group overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-square w-full" style={{ background: GRADIENTS[c.grad] }}>
            <span className="absolute inset-0 grid place-items-center text-4xl">{c.emoji}</span>
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image}
                alt={c.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            {c.badge && (
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                {c.badge}
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="line-clamp-1 text-xs font-semibold text-ink">{c.title}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{c.price ? `$${c.price}` : c.brand}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center text-sm text-ink-soft">
      {children}
    </p>
  );
}

export function ExploreSearch({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [vResults, setVResults] = useState<Card[] | null>(null);
  const [vLoading, setVLoading] = useState(false);
  const [vError, setVError] = useState<string | null>(null);
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Revoke the object URL when it changes or the component unmounts.
  useEffect(() => {
    if (!queryImage) return;
    return () => URL.revokeObjectURL(queryImage);
  }, [queryImage]);

  const textCards = useMemo(() => textToCards(q), [q]);
  const showVisual = queryImage !== null;
  const showText = !showVisual && q.trim().length > 0;

  function clearVisual() {
    setQueryImage(null);
    setVResults(null);
    setVError(null);
    setVLoading(false);
  }
  function clearAll() {
    setQ("");
    clearVisual();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setQ("");
    setQueryImage(URL.createObjectURL(file));
    setVResults(null);
    setVError(null);
    setVLoading(true);
    try {
      if (!isApiConfigured()) {
        setVError("Visual search runs on the live AWS API — set NEXT_PUBLIC_API_URL to enable it.");
        return;
      }
      const results = await visualSearch(file, { limit: 18 });
      setVResults(results.map(visualToCard));
    } catch {
      setVError("Couldn't run visual search. Try a different image.");
    } finally {
      setVLoading(false);
    }
  }

  return (
    <div>
      {/* search bar: text + visual */}
      <div className="mb-5 flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5">
        <Icons.search size={18} className="shrink-0 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (queryImage) clearVisual();
          }}
          placeholder="Search finds, brands, vibes…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
        />
        {(q || showVisual) && (
          <button
            onClick={clearAll}
            aria-label="Clear search"
            className="shrink-0 text-ink-faint transition-colors hover:text-ink"
          >
            <Icons.close size={18} />
          </button>
        )}
        <span className="h-5 w-px shrink-0 bg-line" />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Search by image"
          title="Search by image (visual search)"
          className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-coral"
        >
          <Icons.camera size={20} />
          <span className="hidden sm:inline">Visual</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>

      {showVisual ? (
        <section>
          <div className="mb-4 flex items-center gap-3">
            {queryImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={queryImage}
                alt="Your search image"
                className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-ink">Visually similar</p>
              <p className="truncate text-sm text-ink-soft">
                {vLoading ? "Searching the catalog…" : "Image → Titan embedding → S3 Vectors kNN"}
              </p>
            </div>
            <button
              onClick={clearAll}
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-coral-soft"
            >
              Clear
            </button>
          </div>

          {vLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-line" />
              ))}
            </div>
          ) : vError ? (
            <EmptyNote>{vError}</EmptyNote>
          ) : vResults && vResults.length ? (
            <CardGrid cards={vResults} />
          ) : (
            <EmptyNote>No visually similar finds yet. Try another photo.</EmptyNote>
          )}
        </section>
      ) : showText ? (
        <section>
          <p className="mb-3 px-1 text-sm font-bold text-ink-soft">
            {textCards.length} result{textCards.length === 1 ? "" : "s"} for “{q.trim()}”
          </p>
          {textCards.length ? (
            <CardGrid cards={textCards} />
          ) : (
            <EmptyNote>No finds match “{q.trim()}”. Try a brand, category, or vibe.</EmptyNote>
          )}
        </section>
      ) : (
        children
      )}
    </div>
  );
}
