"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { USERS } from "@/lib/social";
import { PINS, type Pin } from "@/lib/pins";
import { GRADIENTS, type Grad } from "@/lib/data";
import { shortTitle } from "@/lib/feed-builder";
import { isApiConfigured } from "@/lib/api";
import { visualSearch, type VisualSearchResult } from "@/lib/visual-search";
import { Avatar, Icons } from "@/components/ui";

type SearchTab = "people" | "items" | "brands" | "visual";

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

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<SearchTab>("people");
  const [vResults, setVResults] = useState<Card[] | null>(null);
  const [vLoading, setVLoading] = useState(false);
  const [vError, setVError] = useState<string | null>(null);
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!queryImage) return;
    return () => URL.revokeObjectURL(queryImage);
  }, [queryImage]);

  const users = useMemo(
    () =>
      Object.values(USERS).filter(
        (u) =>
          u.id !== "you" &&
          (u.name.toLowerCase().includes(q.toLowerCase()) ||
            u.handle.toLowerCase().includes(q.toLowerCase()))
      ),
    [q]
  );

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return PINS.slice(0, 18).map(pinToCard);
    return PINS.filter(
      (p) =>
        p.title.toLowerCase().includes(t) ||
        p.category.toLowerCase().includes(t)
    ).map(pinToCard);
  }, [q]);

  const brands = useMemo(() => {
    const t = q.trim().toLowerCase();
    const brandMap = new Map<string, Card[]>();
    for (const p of PINS) {
      if (t && !p.brand.toLowerCase().includes(t)) continue;
      const key = p.brand.toLowerCase();
      if (!brandMap.has(key)) brandMap.set(key, []);
      brandMap.get(key)!.push(pinToCard(p));
    }
    return Array.from(brandMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12);
  }, [q]);

  function clearVisual() {
    setQueryImage(null);
    setVResults(null);
    setVError(null);
    setVLoading(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTab("visual");
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

  const TABS: { key: SearchTab; label: string }[] = [
    { key: "people", label: "People" },
    { key: "brands", label: "Brands" },
    { key: "items", label: "Items" },
    { key: "visual", label: "Visual" },
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      {/* Search bar */}
      <div className="mb-4 flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5">
        <Icons.search size={18} className="shrink-0 text-ink-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, brands, items…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
        />
        {(q || queryImage) && (
          <button
            onClick={() => { setQ(""); clearVisual(); }}
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

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-line bg-cream p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "people" && (
        <div className="space-y-1">
          <p className="mb-2 px-1 text-sm font-bold text-ink-soft">
            {q ? "Results" : "Suggested"}
          </p>
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/feed/${u.id}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-ink/5"
            >
              <Avatar grad={u.grad} label={u.name} size={44} />
              <div>
                <p className="text-sm font-bold text-ink">{u.handle}</p>
                <p className="text-xs text-ink-faint">{u.name}</p>
              </div>
            </Link>
          ))}
          {users.length === 0 && <EmptyNote>No people found.</EmptyNote>}
        </div>
      )}

      {tab === "items" && (
        <section>
          <p className="mb-3 px-1 text-sm font-bold text-ink-soft">
            {q ? `${items.length} result${items.length === 1 ? "" : "s"} for "${q.trim()}"` : "Trending items"}
          </p>
          {items.length > 0 ? (
            <CardGrid cards={items} />
          ) : (
            <EmptyNote>No items match &ldquo;{q.trim()}&rdquo;. Try a brand, category, or vibe.</EmptyNote>
          )}
        </section>
      )}

      {tab === "brands" && (
        <section>
          <p className="mb-3 px-1 text-sm font-bold text-ink-soft">
            {q ? `Brands matching "${q.trim()}"` : "All brands"}
          </p>
          {brands.length > 0 ? (
            <div className="space-y-5">
              {brands.map(([brand, cards]) => (
                <div key={brand}>
                  <p className="mb-2 text-sm font-bold capitalize text-ink">{brand}</p>
                  <CardGrid cards={cards.slice(0, 6)} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>No brands match &ldquo;{q.trim()}&rdquo;.</EmptyNote>
          )}
        </section>
      )}

      {tab === "visual" && (
        <section>
          {queryImage ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={queryImage}
                  alt="Your search image"
                  className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold text-ink">Visually similar</p>
                  <p className="truncate text-sm text-ink-soft">
                    {vLoading ? "Searching the catalog…" : "Image → Titan embedding → S3 Vectors kNN"}
                  </p>
                </div>
                <button
                  onClick={clearVisual}
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
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-coral-soft">
                <Icons.camera size={32} className="text-coral" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-ink">Search by image</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Upload a photo to find visually similar gifts using AI.
                </p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-coral px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Upload image
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
