"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { loadProfile, saveProfile, type UserProfile } from "@/lib/onboarding";
import { fetchMe, saveMe, setMyUserId, identifyMe } from "@/lib/api";
import { markProfileSyncSettled } from "@/lib/profile-status";
import { setClerkIdentityCache } from "@/lib/identity";
import { ADMIN_BYPASS, ADMIN_USER_ID } from "@/lib/admin";
import { buildCloudPayload, restoreInteractionData, syncToCloud } from "@/lib/sync";

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
    // Local dev-only admin session: pin the fake admin id, settle the gate, and
    // skip all Clerk-driven sync. Inert (and erased) in production.
    if (ADMIN_BYPASS) {
      setMyUserId(ADMIN_USER_ID);
      markProfileSyncSettled();
      return;
    }

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
      setMyUserId(null);
      setClerkIdentityCache(null, null);
      settle();
      return () => {
        cancelled = true;
        clearTimeout(safety);
      };
    }

    const userId = user.id;
    // Stash the Clerk userId so non-Clerk client code (e.g. the swipe share
    // link) can attribute a shared challenge back to this sender.
    setMyUserId(userId);

    // Cache Clerk identity (name + avatar) so the identity layer can resolve
    // the display name from Clerk rather than the onboarding profile.
    setClerkIdentityCache(
      user.fullName ?? user.firstName ?? null,
      user.imageUrl ?? null,
    );

    // Ensure a users row (+ graph user node) exists from the very first sign-in,
    // even before onboarding — so every authenticated user is persisted.
    void identifyMe(userId, {
      email: user.primaryEmailAddress?.emailAddress ?? null,
      name: user.fullName ?? null,
      imageUrl: user.imageUrl ?? null,
    });

    // Push the full payload (profile + interactions) to the cloud.
    const push = () => syncToCloud();

    (async () => {
      const local = loadProfile();
      if (local) {
        // Push full payload (profile + likes/saves/follows) on sign-in.
        const payload = buildCloudPayload();
        if (payload) await saveMe(userId, payload);
      } else {
        // First sign-in on a fresh device: restore from the cloud if present.
        const remote = await fetchMe<UserProfile & Record<string, unknown>>(userId);
        if (!cancelled && remote) {
          saveProfile(remote as UserProfile);
          restoreInteractionData(remote);
          window.dispatchEvent(new Event("giftmaxxing:profile"));
          window.dispatchEvent(new Event("giftmaxxing:interactions-restored"));
        }
      }
      settle();
    })();

    window.addEventListener("giftmaxxing:profile", push);
    window.addEventListener("giftmaxxing:interaction", push);
    return () => {
      cancelled = true;
      clearTimeout(safety);
      window.removeEventListener("giftmaxxing:profile", push);
      window.removeEventListener("giftmaxxing:interaction", push);
    };
  }, [isLoaded, isSignedIn, user]);

  return null;
}
