"use client";

import { useSyncExternalStore } from "react";
import { GRADIENTS } from "@/lib/data";
import type { AmazonPick } from "@/lib/amazon-picks";
import {
  amazonUrl,
  AFFILIATE_REL,
  visualForPick,
  detectMarketplace,
  amazonUrlForMarketplace,
  ONELINK_CONFIGURED,
  type AmazonMarketplace,
} from "@/lib/affiliate";
import { Icons } from "@/components/ui";

// Product detail modal for Amazon affiliate picks on /feed/shop.
// Shows available catalog info from amazon-picks.json. Price and image fields
// are only populated via PA-API (never scraped), so we show clear placeholders
// until that access is granted.

const US_FALLBACK: AmazonMarketplace = { code: "US", domain: "amazon.com", label: "Amazon.com (US)" };
const subscribe = () => () => {};

export function AmazonPickDetailModal({
  pick,
  onClose,
}: {
  pick: AmazonPick | null;
  onClose: () => void;
}) {
  const localMarketplace = useSyncExternalStore(
    subscribe,
    () => (ONELINK_CONFIGURED ? US_FALLBACK : detectMarketplace()),
    () => US_FALLBACK,
  );

  if (!pick) return null;

  const { grad, emoji } = visualForPick(pick);
  const buyHref = amazonUrl(pick.asin);
  const showLocal = localMarketplace.code !== "US";
  const localBuyHref = showLocal
    ? amazonUrlForMarketplace(pick.asin, localMarketplace)
    : null;

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
        {/* media pane */}
        <div
          className="relative grid flex-1 place-items-center md:min-h-0"
          style={{ background: GRADIENTS[grad] }}
        >
          <span className="text-[120px]">{emoji}</span>
          {pick.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pick.image}
              alt={pick.title ?? "Amazon product"}
              className="absolute inset-0 h-full w-full bg-white object-contain p-4"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60">
              Product image available once PA-API access is granted
            </span>
          )}
        </div>

        {/* details pane */}
        <div className="flex w-full flex-col border-t border-line md:w-[360px] md:border-l md:border-t-0">
          <div className="flex-1 overflow-y-auto px-5 py-6">
            {pick.category && (
              <span className="inline-block rounded-full bg-coral-soft px-2.5 py-1 text-[11px] font-bold text-coral-ink">
                {pick.category}
              </span>
            )}

            <h2 className="mt-3 font-display text-lg font-extrabold leading-tight text-ink">
              {pick.title ?? "Amazon Product"}
            </h2>

            {pick.brand && (
              <p className="mt-1 text-sm text-ink-soft">{pick.brand}</p>
            )}

            {pick.blurb && (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {pick.blurb}
              </p>
            )}

            <div className="mt-4 rounded-lg border border-line bg-ink/[0.02] px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                ASIN
              </p>
              <p className="mt-0.5 font-mono text-sm text-ink">{pick.asin}</p>
            </div>

            {/* Price placeholder */}
            <div className="mt-3 rounded-lg border border-dashed border-line px-3 py-2.5">
              <p className="text-xs text-ink-faint">
                Price and availability are shown on Amazon. Real-time pricing
                will appear here once PA-API access is granted.
              </p>
            </div>

            {showLocal && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 dark:border-sky-800 dark:bg-sky-950/30">
                <span className="text-sm">🌍</span>
                <p className="text-xs text-ink-soft">
                  Your locale suggests{" "}
                  <strong>{localMarketplace.label}</strong>. A local link is
                  available below.
                </p>
              </div>
            )}
          </div>

          {/* actions */}
          <div className="space-y-2.5 border-t border-line px-5 py-4">
            <a
              href={buyHref}
              target="_blank"
              rel={AFFILIATE_REL}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-coral py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              View on Amazon
              <Icons.arrow size={15} className="-rotate-45" />
            </a>

            {localBuyHref && (
              <a
                href={localBuyHref}
                target="_blank"
                rel={AFFILIATE_REL}
                className="block w-full rounded-full border border-line py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-ink/5"
              >
                View on {localMarketplace.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
