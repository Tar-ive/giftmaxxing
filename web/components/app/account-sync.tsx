"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { loadProfile, saveProfile, type UserProfile } from "@/lib/onboarding";
import { fetchMe, saveMe } from "@/lib/api";
import { markProfileSyncSettled } from "@/lib/profile-status";

// Bridges Clerk auth → our profile store ("start storing this data").
// When a user is signed in:
//   • if a local profile exists → persist it to the DynamoDB `users` table,
//     keyed by the Clerk userId (so recipients + events are stored server-side);
//   • otherwise → hydrate the local profile from DynamoDB (cross-device restore).
// It also re-pushes whenever onboarding saves a profile (the
// "giftmaxxing:profile" event), so newly-logged dates sync immediately.
//
// Once the restore attempt settles it calls markProfileSyncSettled(), which is
// what lets OnboardingGate stop waiting and either show the feed or redirect —
// so a returning user is never bounced into onboarding mid-restore.
//
// Mounted once in app/layout.tsx inside <ClerkProvider>. Renders nothing.
// Only rendered when Clerk is enabled (layout.tsx guards this).
export function AccountSync() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    // Wait for Clerk to resolve the auth state before settling the gate.
    if (!isLoaded) return;

    let cancelled = false;
    // Safety net: never leave the gate spinning if Clerk/the network hangs.
    const safety = setTimeout(markProfileSyncSettled, 6000);
    const settle = () => {
      if (cancelled) return;
      clearTimeout(safety);
      markProfileSyncSettled();
    };

    if (!isSignedIn || !user) {
      // Signed out: nothing to restore — let the gate decide immediately.
      settle();
      return () => {
        cancelled = true;
        clearTimeout(safety);
      };
    }

    const userId = user.id;

    // Push the current local profile to the cloud (no-op if none yet).
    const push = () => {
      const local = loadProfile();
      if (local) void saveMe(userId, local);
    };

    (async () => {
      const local = loadProfile();
      if (local) {
        await saveMe(userId, local);
      } else {
        // First sign-in on a fresh device: restore from the cloud if present.
        const remote = await fetchMe<UserProfile>(userId);
        if (!cancelled && remote) {
          saveProfile(remote);
          window.dispatchEvent(new Event("giftmaxxing:profile"));
        }
      }
      settle();
    })();

    window.addEventListener("giftmaxxing:profile", push);
    return () => {
      cancelled = true;
      clearTimeout(safety);
      window.removeEventListener("giftmaxxing:profile", push);
    };
  }, [isLoaded, isSignedIn, user]);

  return null;
}
