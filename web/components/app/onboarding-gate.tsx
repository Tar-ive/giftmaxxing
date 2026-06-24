"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { isOnboardingComplete } from "@/lib/onboarding";
import {
  isProfileSyncSettled,
  subscribeProfileSync,
  markProfileSyncSettled,
} from "@/lib/profile-status";

// Clerk-enabled builds restore a returning user's profile from DynamoDB on
// sign-in (AccountSync). Only those builds need to wait for that restore before
// deciding whether to send the user to onboarding.
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type GateState = "loading" | "complete" | "redirect";

function subscribe(cb: () => void) {
  // The native `storage` event only fires in *other* tabs, so it never catches
  // a same-tab write. We also listen for the "giftmaxxing:profile" event
  // (dispatched on every profile save/restore) and the cloud-sync settle signal.
  window.addEventListener("storage", cb);
  window.addEventListener("giftmaxxing:profile", cb);
  const unsubscribe = subscribeProfileSync(cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("giftmaxxing:profile", cb);
    unsubscribe();
  };
}

function getSnapshot(): GateState {
  if (isOnboardingComplete()) return "complete";
  // No profile yet: only redirect once any cloud restore has settled, otherwise
  // wait — a returning user's profile may still be loading from DynamoDB.
  if (!clerkEnabled || isProfileSyncSettled()) return "redirect";
  return "loading";
}

function getServerSnapshot(): GateState {
  return "loading";
}

/**
 * Gates the feed on a completed onboarding profile. Renders children once a
 * profile is present, redirects to /onboarding only after any cloud restore has
 * settled, and shows a spinner while a signed-in user's profile is still loading.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (state === "redirect") router.replace("/onboarding");
  }, [state, router]);

  // Safety net: AccountSync normally fires the settle signal, but it only mounts
  // when BOTH Clerk keys are present (see app/layout.tsx). This gate, however,
  // waits whenever just the *publishable* key is set — so a half-configured
  // build (publishable key, no secret) would spin forever. Force-settle after a
  // grace period (longer than AccountSync's own 6s safety) so we never hang.
  useEffect(() => {
    if (state !== "loading") return;
    const t = window.setTimeout(markProfileSyncSettled, 8000);
    return () => window.clearTimeout(t);
  }, [state]);

  if (state === "complete") return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-coral" />
    </div>
  );
}
