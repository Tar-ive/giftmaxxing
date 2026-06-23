"use client";

import { GRADIENTS } from "@/lib/data";
import { Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";
import { SwipeDeck } from "@/components/app/swipe-deck";
import { ExploreSearch } from "@/components/app/explore-search";

export default function ExplorePage() {
  const { posts, openPost } = useStore();
  // repeat to fill an explore-style grid
  const tiles = [...posts, ...posts].slice(0, 12);

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-5">
      <ExploreSearch>
        <section className="mb-10">
          <div className="mb-4 text-center">
            <h2 className="font-display text-xl font-extrabold text-ink">
              Swipe to discover your taste
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Right for yes, left for no — every swipe sharpens your recommendations.
            </p>
          </div>
          <SwipeDeck />
        </section>

        <h2 className="mb-3 px-1 font-display text-lg font-bold text-ink">Browse</h2>
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {tiles.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              onClick={() => openPost(p.id)}
              className="group relative grid aspect-square place-items-center overflow-hidden"
              style={{ background: GRADIENTS[p.product.grad] }}
            >
              <span className="text-5xl sm:text-6xl">{p.product.emoji}</span>
              <div className="absolute inset-0 flex items-center justify-center gap-5 bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex items-center gap-1.5 font-bold">
                  <Icons.heartFill size={20} /> {p.likes}
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <Icons.comment size={20} /> {p.comments.length}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ExploreSearch>
    </div>
  );
}
