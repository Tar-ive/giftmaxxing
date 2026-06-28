"use client";

import { useState } from "react";
import { AMAZON_PICKS, type AmazonPick } from "@/lib/amazon-picks";
import { GRADIENTS } from "@/lib/data";
import { visualForPick } from "@/lib/affiliate";
import { BuyOnAmazon, AmazonDisclosure } from "@/components/app/buy-on-amazon";
import { AmazonPickDetailModal } from "@/components/app/amazon-pick-detail-modal";
import { LocaleMarketplaceBanner } from "@/components/app/locale-marketplace-banner";
import { DropCard } from "@/components/app/bundled-deals";
import { DROPS } from "@/lib/drops";
import { Icons } from "@/components/ui";

// Real, buyable Amazon affiliate picks (the only surface with real commerce —
// the feed/cart elsewhere is a simulated demo). Product images/titles/details
// come ONLY from PA-API enrichment (web/lib/amazon-picks.json) — never scraped.
// Tiles fall back to a category emoji + gradient when a pick isn't enriched yet,
// and we link out for price (compliant with the Operating Agreement's 24h rule).

// Group picks by category so the page reads as sections; uncategorized last.
function groupByCategory(picks: AmazonPick[]): { label: string; items: AmazonPick[] }[] {
  const map = new Map<string, AmazonPick[]>();
  for (const p of picks) {
    const key = p.category?.trim() || "More gifts";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .sort((a, b) =>
      a[0] === "More gifts" ? 1 : b[0] === "More gifts" ? -1 : a[0].localeCompare(b[0])
    )
    .map(([label, items]) => ({ label, items }));
}

function PickCard({ p, onSelect }: { p: AmazonPick; onSelect: () => void }) {
  const { grad, emoji } = visualForPick(p);
  return (
    <div
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-md"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
    >
      <div className="relative aspect-square" style={{ background: GRADIENTS[grad] }}>
        <span className="absolute inset-0 grid place-items-center text-5xl">{emoji}</span>
        {p.category ? (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            {p.category}
          </span>
        ) : null}
        {p.image ? (
          // Product images come from PA-API only (compliant); on error we hide the
          // <img> so the category emoji + gradient behind it shows through.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={p.title ?? "Amazon product"}
            loading="lazy"
            className="absolute inset-0 h-full w-full bg-white object-contain p-2"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold text-ink">{p.title ?? "Amazon find"}</p>
        {p.brand ? <p className="mt-0.5 text-xs text-ink-faint">{p.brand}</p> : null}
        {p.blurb ? <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{p.blurb}</p> : null}
        <div className="mt-auto pt-3" onClick={(e) => e.stopPropagation()}>
          <p className="mb-2 text-[11px] text-ink-faint">See price on Amazon</p>
          <BuyOnAmazon asin={p.asin} className="w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const picks = AMAZON_PICKS;
  const [selectedPick, setSelectedPick] = useState<AmazonPick | null>(null);

  // Interleave bundles with picks: each row pairs 1 bundle with 2 hand-picked
  // items, alternating which side the bundle sits on. Picks not consumed by a
  // bundle row fall through to the category grid below (sliced out to avoid dupes).
  const blocks = DROPS.map((bundle, i) => ({
    bundle,
    items: picks.slice(i * 2, i * 2 + 2),
  }));
  const restGroups = groupByCategory(picks.slice(Math.min(DROPS.length * 2, picks.length)));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-coral-soft text-coral">
            <Icons.gift size={24} />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink">Shop</h1>
            <p className="text-sm text-ink-soft">
              {picks.length} hand-picked gifts on Amazon — every purchase supports Giftmaxxing.
            </p>
          </div>
        </div>
        <AmazonDisclosure className="mt-3" />
        <LocaleMarketplaceBanner />
      </header>

      {/* Bundled deals (formerly "Drops") interleaved with hand-picked Amazon
          gifts: each row is 1 bundle + 2 picks, alternating which side the
          bundle sits on (lg+). Stacks vertically on small screens. */}
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-coral-soft text-coral">
          <Icons.gift size={18} />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">Bundled deals</h2>
          <p className="text-xs text-ink-soft">
            Curated packages paired with hand-picked Amazon gifts.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {blocks.map((b, i) => {
          const bundleLeft = i % 2 === 0;
          return (
            <div key={b.bundle.id} className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className={bundleLeft ? "lg:order-1" : "lg:order-2"}>
                <DropCard drop={b.bundle} />
              </div>
              <div
                className={`grid grid-cols-2 gap-4 ${bundleLeft ? "lg:order-2" : "lg:order-1"}`}
              >
                {b.items.map((p) => (
                  <PickCard key={p.asin} p={p} onSelect={() => setSelectedPick(p)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {restGroups.length > 0 ? (
        <>
          <div className="my-8 border-t border-line" />
          <div className="space-y-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-faint">
              More hand-picked on Amazon
            </h2>
            {restGroups.map((g) => (
              <section key={g.label}>
                {restGroups.length > 1 ? (
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-faint">
                    {g.label}
                  </h2>
                ) : null}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {g.items.map((p) => (
                    <PickCard key={p.asin} p={p} onSelect={() => setSelectedPick(p)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}

      <AmazonPickDetailModal
        pick={selectedPick}
        onClose={() => setSelectedPick(null)}
      />
    </div>
  );
}
