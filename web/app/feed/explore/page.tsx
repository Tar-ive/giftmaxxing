"use client";

import { SwipeDeck } from "@/components/app/swipe-deck";
import { ExploreSearch } from "@/components/app/explore-search";

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <ExploreSearch>
        <section>
          <div className="mb-5 text-center">
            <h2 className="font-display text-xl font-extrabold text-ink">
              Swipe to discover your taste
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Right for yes, left for no — every swipe sharpens your recommendations.
            </p>
          </div>
          <SwipeDeck compact />
        </section>
      </ExploreSearch>
    </div>
  );
}
