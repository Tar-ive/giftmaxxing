"use client";

// Bundled deals = curated gift packages ("drops") worth a target amount,
// assembled from the real-photo pin set. Folded into the Shop surface so Shop is
// the single place for both normal Amazon picks and ready-to-gift bundles. Add
// the whole bundle to your cart, or turn it into a group-gift pool.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRADIENTS } from "@/lib/data";
import { DROPS, type DropPackage } from "@/lib/drops";
import { loadFundraisers, saveFundraisers, newFundraiser } from "@/lib/fundraisers";
import { useMaxi } from "@/components/app/maxi-provider";
import { Icons } from "@/components/ui";

export function BundledDeals({ limit }: { limit?: number }) {
  const drops = limit ? DROPS.slice(0, limit) : DROPS;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-coral-soft text-coral">
          <Icons.gift size={18} />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">Bundled deals</h2>
          <p className="text-xs text-ink-soft">
            Curated gift packages — bundled, discounted, and ready to gift.
          </p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {drops.map((d) => (
          <DropCard key={d.id} drop={d} />
        ))}
      </div>
    </section>
  );
}

export function DropCard({ drop }: { drop: DropPackage }) {
  const router = useRouter();
  const { addPinToCart, setOpen } = useMaxi();
  const [added, setAdded] = useState(false);
  const saves = drop.was - drop.value;

  const addBundle = () => {
    drop.items.forEach((p) => addPinToCart(p));
    setAdded(true);
    setOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const giftTogether = () => {
    const list = loadFundraisers();
    const f = newFundraiser({
      title: `${drop.title} — group gift`,
      occasion: "Group gift",
      blurb: drop.blurb,
      goal: drop.value,
      emoji: drop.emoji,
      grad: drop.grad,
      image: drop.items[0]?.image,
      organizer: "you",
    });
    saveFundraisers([f, ...list]);
    router.push("/feed/pools");
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      {/* cover collage */}
      <div className="relative grid grid-cols-3 gap-0.5" style={{ background: GRADIENTS[drop.grad] }}>
        {drop.items.slice(0, 3).map((p) => (
          <div key={p.id} className="relative aspect-square">
            <span className="absolute inset-0 grid place-items-center text-3xl">{p.emoji}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
        ))}
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
          {drop.emoji} {drop.tag}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink">{drop.title}</h3>
            <p className="mt-0.5 text-sm text-ink-soft">{drop.blurb}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-extrabold text-ink">${drop.value}</p>
            <p className="text-xs text-ink-faint line-through">${drop.was}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-coral">
          <Icons.gift size={14} /> {drop.items.length} items · bundle saves ${saves}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={addBundle}
            className="flex-1 rounded-full bg-coral py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {added ? "Added ✓" : "Add bundle to cart"}
          </button>
          <button
            onClick={giftTogether}
            className="flex items-center gap-1.5 rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-bold text-ink hover:bg-coral-soft"
          >
            <Icons.users size={16} /> Gift together
          </button>
        </div>
      </div>
    </div>
  );
}
