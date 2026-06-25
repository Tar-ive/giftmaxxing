"use client";

import { useSyncExternalStore, useState } from "react";
import {
  detectMarketplace,
  ONELINK_CONFIGURED,
  type AmazonMarketplace,
} from "@/lib/affiliate";
import { Icons } from "@/components/ui";

// Shown on /feed/shop when OneLink is NOT active. Detects the visitor's locale
// and suggests their local Amazon storefront so international shoppers know
// they can still buy via the right marketplace.

const US_FALLBACK: AmazonMarketplace = { code: "US", domain: "amazon.com", label: "Amazon.com (US)" };
const subscribe = () => () => {};

export function LocaleMarketplaceBanner() {
  const marketplace = useSyncExternalStore(
    subscribe,
    () => (ONELINK_CONFIGURED ? US_FALLBACK : detectMarketplace()),
    () => US_FALLBACK,
  );
  const [dismissed, setDismissed] = useState(false);

  if (ONELINK_CONFIGURED || marketplace.code === "US" || dismissed) return null;

  return (
    <div className="relative mt-3 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-ink-soft dark:border-sky-800 dark:bg-sky-950/30">
      <span className="mt-0.5 text-lg">🌍</span>
      <div className="flex-1">
        <p className="font-semibold text-ink">Shopping from outside the US?</p>
        <p className="mt-0.5">
          These links point to Amazon US. You can search for the same product on{" "}
          <a
            href={`https://www.${marketplace.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-coral underline underline-offset-2 hover:opacity-80"
          >
            {marketplace.label}
          </a>{" "}
          for local pricing and shipping.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-ink-faint hover:text-ink"
        aria-label="Dismiss"
      >
        <Icons.close size={16} />
      </button>
    </div>
  );
}
