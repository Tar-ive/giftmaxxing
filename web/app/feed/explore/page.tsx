"use client";

import { GRADIENTS } from "@/lib/data";
import { Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";

export default function ExplorePage() {
  const { posts, openPost } = useStore();
  // repeat to fill an explore-style grid
  const tiles = [...posts, ...posts].slice(0, 12);

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-5">
      <div className="mb-5 flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5">
        <Icons.search size={18} className="text-ink-faint" />
        <input
          placeholder="Search finds, brands, vibes…"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {tiles.map((p, i) => (
          <button
            key={`${p.id}-${i}`}
            onClick={() => openPost(p.id)}
            className={`group relative grid aspect-square place-items-center overflow-hidden ${
              i % 5 === 0 ? "col-span-1 row-span-1" : ""
            }`}
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
    </div>
  );
}
