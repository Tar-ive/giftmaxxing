"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SwipeDeck } from "@/components/app/swipe-deck";
import { ShareSheet } from "@/components/app/share-sheet";
import { Icons } from "@/components/ui";
import { useCurrentUser } from "@/lib/identity";
import { getMyUserId } from "@/lib/api";
import { buildInviteUrl } from "@/lib/invite";

export default function SwipePage() {
  const me = useCurrentUser();
  const firstName = me.name !== "You" ? me.name.split(/\s+/)[0] : null;
  const [senderId, setSenderId] = useState<string | null>(null);

  useEffect(() => {
    // Read the stashed Clerk userId after mount (SSR-safe).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSenderId(getMyUserId());
  }, []);

  const inviterName = me.name !== "You" ? me.name : "A friend";
  const url = useMemo(
    () => buildInviteUrl(inviterName, senderId ? { senderId } : {}),
    [inviterName, senderId]
  );
  const text =
    "Would you want this gifted to you? 👀 Swipe to find your gift taste on Giftmaxxing";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral">
          <Icons.trend size={14} /> Viral challenge
        </span>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink">
          Would you want this gifted to you?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          {firstName ? `${firstName}, swipe` : "Swipe"} right for yes, left for no. Every swipe
          trains your gift recommendations.
        </p>
        <div className="mt-4 flex justify-center">
          <ShareSheet
            url={url}
            text={text}
            subject={`${inviterName} wants to find you the perfect gift`}
            note={
              senderId ? (
                <>
                  When a friend completes your challenge, we save a{" "}
                  <strong className="font-semibold text-ink-soft">soft profile</strong> (their
                  name, birthday &amp; taste) to your account so you can gift them — no sign-up
                  needed for them. By sharing, you take responsibility for it.{" "}
                  <Link href="/privacy" className="underline hover:text-ink">
                    Privacy
                  </Link>
                  .
                </>
              ) : (
                <>
                  Sign in so we can tell you when a friend finishes your challenge and save
                  their gift taste to your account.{" "}
                  <Link href="/privacy" className="underline hover:text-ink">
                    Privacy
                  </Link>
                  .
                </>
              )
            }
          />
        </div>
      </div>

      <div className="mt-8">
        <SwipeDeck />
      </div>

      <p className="mx-auto mt-8 max-w-md text-center text-xs leading-relaxed text-ink-faint">
        Your &ldquo;yes&rdquo; swipes become the taste centroid for our S3 Vectors recommender —
        the more you swipe, the sharper your matches get.
      </p>
    </div>
  );
}
