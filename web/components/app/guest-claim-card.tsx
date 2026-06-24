"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";

// The sign-in card on the invite reveal. The gift set is a preview; a real
// account (Clerk) is required to "claim" it and enter the app. Once a guest who
// arrived signed-out authenticates via the modal, we send them into the app.
// Only rendered when Clerk is enabled (the invite page guards this), so useUser
// always has a ClerkProvider above it.
export function GuestClaimCard({ inviterName }: { inviterName: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const wasSignedOut = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      wasSignedOut.current = true;
      return;
    }
    // Only redirect a guest who actually authenticated from this screen.
    if (wasSignedOut.current) router.push("/feed");
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="mt-8 rounded-3xl border border-coral/30 bg-coral-soft/60 p-6 text-center">
      <h3 className="font-display text-xl font-extrabold text-ink">Want your own gift set?</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
        Save these picks, get matches tailored to you, and never miss a gift moment —
        create your free account.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <SignUpButton mode="modal">
          <button className="w-full rounded-full bg-coral px-7 py-3 text-sm font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90 sm:w-auto">
            Create my account
          </button>
        </SignUpButton>
        <SignInButton mode="modal">
          <button className="w-full rounded-full border border-line bg-surface px-7 py-3 text-sm font-bold text-ink transition-colors hover:bg-cream sm:w-auto">
            I already have one
          </button>
        </SignInButton>
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">
        {inviterName} already has your taste saved — signing up is just for you.
      </p>
    </div>
  );
}
