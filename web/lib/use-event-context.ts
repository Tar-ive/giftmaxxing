"use client";

import { useEffect, useState } from "react";
import { loadProfile } from "@/lib/onboarding";
import {
  feedContextFromEvents,
  type FeedEventContext,
  type ImportantEvent,
  type Recipient,
} from "@/lib/events";

// Resolves the user's next upcoming event into the recommender's params
// (recipient / occasion / sourceUser / budget / eventBoost). Returns null when
// event logging is off or there are no upcoming events. Re-computes when the
// profile changes ("giftmaxxing:profile") or another tab updates localStorage.
export function useEventContext(): FeedEventContext | null {
  const [ctx, setCtx] = useState<FeedEventContext | null>(null);

  useEffect(() => {
    const compute = () => {
      const p = loadProfile();
      const events: ImportantEvent[] = p?.events ?? [];
      const recipients: Recipient[] = p?.recipients ?? [];
      if (!p?.eventLoggingEnabled || events.length === 0) {
        setCtx(null);
        return;
      }
      setCtx(feedContextFromEvents(events, recipients));
    };

    compute();
    window.addEventListener("giftmaxxing:profile", compute);
    window.addEventListener("storage", compute);
    return () => {
      window.removeEventListener("giftmaxxing:profile", compute);
      window.removeEventListener("storage", compute);
    };
  }, []);

  return ctx;
}
