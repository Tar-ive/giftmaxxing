"use client";

// Landing for a group-gift invite link (/invite/[code] when the payload carries
// a pool). The flow the user asked for: an external person sees the pool, then
// MUST sign in (and agree to the terms — no payments/splits handled by us) before
// they can chip in. After auth they land on /feed/pools, which picks up the
// stashed pool snapshot and adds it to their list.
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Maxi, Icons } from "@/components/ui";
import { GRADIENTS, type Grad } from "@/lib/data";
import { type InvitePayload } from "@/lib/invite";
import { savePendingPoolJoin } from "@/lib/fundraisers";
import { AuthConsent } from "@/components/app/auth-consent";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function PoolInvite({ invite }: { invite: InvitePayload }) {
  const pool = invite.pool!;
  const grad = (pool.grad as Grad) ?? "coral";
  const organizer = invite.name || "A friend";

  // Stash the pool so /feed/pools can add it the moment auth completes — even if
  // Clerk does a full-page redirect and loses our in-memory state.
  useEffect(() => {
    if (invite.pool) savePendingPoolJoin({ snapshot: invite.pool, organizer });
  }, [invite, organizer]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <div className="text-center">
          <div className="flex justify-center">
            <Maxi size={56} />
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral">
            <Icons.gift size={14} /> Group gift
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            {organizer} invited you to
            <br />
            chip in on a group gift
          </h1>
        </div>

        {/* Pool snapshot (carried in the link) */}
        <div className="mt-7 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <div className="relative aspect-[16/9] w-full" style={{ background: GRADIENTS[grad] }}>
            <span className="absolute inset-0 grid place-items-center text-6xl">{pool.emoji ?? "🎁"}</span>
            {pool.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pool.image}
                alt={pool.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4">
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-coral-ink">
                {pool.occasion}
              </span>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-white drop-shadow">
                {pool.title}
              </h2>
            </div>
          </div>
          <div className="p-5">
            {pool.blurb && <p className="text-sm text-ink-soft">{pool.blurb}</p>}
            <p className="mt-2 text-xs text-ink-faint">
              Goal ${pool.goal} · organized by {organizer}
            </p>
          </div>
        </div>

        {clerkEnabled ? (
          <PoolJoinAuth organizer={organizer} />
        ) : (
          <div className="mt-8 rounded-3xl border border-coral/30 bg-coral-soft/60 p-6 text-center">
            <h3 className="font-display text-xl font-extrabold text-ink">Join the group gift</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
              Open Giftmaxxing to chip in toward {organizer}&apos;s gift.
            </p>
            <Link
              href="/feed/pools"
              className="mt-5 inline-flex rounded-full bg-coral px-7 py-3 text-sm font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90"
            >
              Go to group gifts
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Sign-in gate for the pool invite. Only rendered when Clerk is enabled, so
// useUser always has a ClerkProvider above it (see app/layout.tsx).
function PoolJoinAuth({ organizer }: { organizer: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const wasSignedOut = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      wasSignedOut.current = true;
      return;
    }
    // Authenticated from this screen via the modal (state flips in place) → join.
    if (wasSignedOut.current) router.push("/feed/pools");
  }, [isLoaded, isSignedIn, router]);

  if (isSignedIn) {
    return (
      <div className="mt-8 rounded-3xl border border-coral/30 bg-coral-soft/60 p-6 text-center">
        <h3 className="font-display text-xl font-extrabold text-ink">You&apos;re signed in</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
          Join {organizer}&apos;s group gift and chip in your share.
        </p>
        <button
          onClick={() => router.push("/feed/pools")}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral px-7 py-3 text-sm font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90"
        >
          <Icons.gift size={18} /> Join &amp; chip in
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-3xl border border-coral/30 bg-coral-soft/60 p-6 text-center">
      <h3 className="font-display text-xl font-extrabold text-ink">Sign in to chip in</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
        Create a free account (or sign in) to join the group gift. You stay in control
        of your own money — Giftmaxxing never takes or holds payment.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <SignUpButton mode="modal" forceRedirectUrl="/feed/pools">
          <button className="w-full rounded-full bg-coral px-7 py-3 text-sm font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90 sm:w-auto">
            Create my account
          </button>
        </SignUpButton>
        <SignInButton mode="modal" forceRedirectUrl="/feed/pools">
          <button className="w-full rounded-full border border-line bg-surface px-7 py-3 text-sm font-bold text-ink transition-colors hover:bg-cream sm:w-auto">
            I already have one
          </button>
        </SignInButton>
      </div>
      <AuthConsent />
    </div>
  );
}
