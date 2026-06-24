"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Maxi, Icons } from "@/components/ui";
import { SwipeDeck } from "@/components/app/swipe-deck";
import { decodeInvite, saveInviteSession, clearInviteSession } from "@/lib/invite";
import { createConnection } from "@/lib/api";
import { swipeVibes, seedKeysFromSwipes, loadSwipes, localMatchesFromSwipes } from "@/lib/swipes";
import { GRADIENTS } from "@/lib/data";
import { shortTitle } from "@/lib/feed-builder";
import { type Pin } from "@/lib/pins";
import { GuestClaimCard } from "@/components/app/guest-claim-card";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ── Phases ──────────────────────────────────────────────────────────────────
type Phase = "welcome" | "swipe" | "reveal";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const invite = useMemo(() => decodeInvite(code), [code]);
  const inviterName = invite?.name ?? "Someone";

  const [phase, setPhase] = useState<Phase>("welcome");
  const [results, setResults] = useState<Pin[]>([]);
  const reportedRef = useRef(false);

  // The sender can pre-set who the gift set is for, so the guest never types a
  // name or picks a birthday. Used only for a friendly greeting on the reveal.
  const guestName = invite?.to?.trim() || "Friend";
  const guestFirst = guestName.split(/\s+/)[0];

  // Persist invite context on start so a page refresh doesn't lose the inviter.
  const startSwiping = useCallback(() => {
    saveInviteSession({ inviterName, code, startedAt: Date.now() });
    setPhase("swipe");
  }, [inviterName, code]);

  // Finishing the swipes reveals the gift set. We deliberately do NOT create a
  // local profile or "log the guest in" — entering the app requires real auth
  // (the reveal's sign-in card + AuthGate on /feed). We only (a) build the
  // preview gift set and (b) report a soft profile to the sender, once.
  const onSwipeDone = useCallback(() => {
    setPhase("reveal");
    setResults(localMatchesFromSwipes(9));

    if (!reportedRef.current && invite?.senderId) {
      reportedRef.current = true;
      const swipes = loadSwipes();
      void createConnection(invite.senderId, {
        name: invite.to?.trim() || "Friend",
        birthday: invite.date || undefined,
        vibes: swipeVibes(5),
        seeds: seedKeysFromSwipes(8),
        yesCount: swipes.filter((s) => s.dir === "yes").length,
        totalSwipes: swipes.length,
      });
    }
    clearInviteSession();
  }, [invite]);

  // ── Invalid invite code ─────────────────────────────────────────────────
  if (!invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
        <Maxi size={64} />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">
          Hmm, that link doesn&apos;t look right
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Ask your friend to send a new invite link.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-opacity hover:opacity-90"
        >
          Go to Giftmaxxing
        </button>
      </div>
    );
  }

  // ── Welcome phase ─────────────────────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
        <Maxi size={72} />
        <h1 className="mt-6 text-center font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
          {inviterName} wants to find<br />your perfect gift
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-ink-soft">
          Swipe on gift ideas so {inviterName} knows exactly what you&apos;d love. No
          sign-up, no forms &mdash; just swipe!
        </p>
        <button
          onClick={startSwiping}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90"
        >
          <Icons.heartFill size={20} /> Start swiping
        </button>
        <p className="mt-4 text-xs text-ink-faint">Takes less than a minute</p>
        <p className="mx-auto mt-3 max-w-xs text-center text-[11px] leading-relaxed text-ink-faint">
          Swiping shares your gift taste with {inviterName} so they can gift you &mdash; no
          account or personal details needed.{" "}
          <a href="/privacy#recipient" className="underline hover:text-ink">
            How we use this
          </a>
          .
        </p>
      </div>
    );
  }

  // ── Swipe phase ───────────────────────────────────────────────────────────
  if (phase === "swipe") {
    return (
      <div className="min-h-screen bg-cream">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral">
              <Icons.gift size={14} /> {inviterName}&apos;s invite
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink">
              Would you want this gifted to you?
            </h1>
            <p className="mx-auto mt-2 max-w-md text-ink-soft">
              Swipe right for yes, left for no. This helps {inviterName} pick the perfect gift for you.
            </p>
          </div>

          <div className="mt-8">
            <SwipeDeck onMatchesReady={onSwipeDone} />
          </div>
        </div>
      </div>
    );
  }

  // ── Reveal phase — show the gift set; claiming it requires real auth ───────
  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center">
          <div className="flex justify-center text-coral">
            <Icons.gift size={44} />
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink">
            {guestFirst !== "Friend" ? `${guestFirst}, your` : "Your"} gift set is ready
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">
            Based on your swipes, here&apos;s what {inviterName} can shop from.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {results.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <div
                className="relative aspect-square w-full"
                style={{ background: GRADIENTS[p.grad] }}
              >
                <span className="absolute inset-0 grid place-items-center text-4xl">
                  {p.emoji}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-xs font-semibold text-ink">
                  {shortTitle(p.title)}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {p.price ? `$${p.price}` : p.brand}
                </p>
              </div>
            </div>
          ))}
        </div>

        {clerkEnabled ? (
          <GuestClaimCard inviterName={inviterName} />
        ) : (
          <div className="mt-8 rounded-3xl border border-coral/30 bg-coral-soft/60 p-6 text-center">
            <h3 className="font-display text-xl font-extrabold text-ink">
              Want your own gift set?
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
              Get matches tailored to you and never miss a gift moment.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-full bg-coral px-7 py-3 text-sm font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90"
            >
              Get Giftmaxxing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
