"use client";

import { useState } from "react";
import { GRADIENTS } from "@/lib/data";
import type { Pin } from "@/lib/pins";
import { Icons } from "@/components/ui";
import { useMaxi } from "@/components/app/maxi-provider";

// In-app item detail modal — replaces the old behavior of sending users to
// Pinterest. Keeps users in the app and lets them add to cart or ask Maxi.

export function ItemDetailModal({
  pin,
  onClose,
}: {
  pin: Pin | null;
  onClose: () => void;
}) {
  const { addPinToCart } = useMaxi();
  const [added, setAdded] = useState(false);
  const [prevPin, setPrevPin] = useState(pin);
  if (pin !== prevPin) {
    setPrevPin(pin);
    setAdded(false);
  }

  if (!pin) return null;

  const handleAdd = () => {
    addPinToCart(pin);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 text-white/80 hover:text-white"
        aria-label="Close"
      >
        <Icons.close size={30} />
      </button>

      <div
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-surface sm:h-[80vh] sm:rounded-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* media */}
        <div
          className="relative grid flex-1 place-items-center md:min-h-0"
          style={{ background: GRADIENTS[pin.grad] }}
        >
          <span className="text-[120px]">{pin.emoji}</span>
          {pin.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pin.image}
              alt={pin.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        {/* details pane */}
        <div className="flex w-full flex-col border-t border-line md:w-[360px] md:border-l md:border-t-0">
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <span className="inline-block rounded-full bg-coral-soft px-2.5 py-1 text-[11px] font-bold text-coral-ink">
              {pin.brand}
            </span>
            <h2 className="mt-3 font-display text-lg font-extrabold leading-tight text-ink">
              {pin.title.length > 120 ? pin.title.slice(0, 117) + "…" : pin.title}
            </h2>
            <p className="mt-2 text-2xl font-bold text-ink">${pin.price}</p>
            <p className="mt-1 text-xs text-ink-faint capitalize">{pin.category}</p>

            {pin.source && (
              <p className="mt-4 text-xs text-ink-soft">
                Source: <span className="capitalize">{pin.source}</span>
              </p>
            )}
          </div>

          {/* actions */}
          <div className="border-t border-line px-5 py-4 space-y-3">
            <button
              onClick={handleAdd}
              className="w-full rounded-full bg-coral py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {added ? "Added to cart!" : `Add to cart · $${pin.price}`}
            </button>
            {pin.url && pin.url !== "#" && (
              <a
                href={pin.url}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-full border border-line py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-ink/5"
              >
                View original source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
