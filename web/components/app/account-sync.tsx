"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { loadProfile, saveProfile, type UserProfile } from "@/lib/onboarding";
import { fetchMe, saveMe } from "@/lib/api";

// Bridges Clerk auth → our profile store ("start storing this data").
// When a user is signed in:
//   • if a local profile exists → persist it to the DynamoDB `users` table,
//     keyed by the Clerk userId (so recipients + events are stored server-side);
//   • otherwise → hydrate the local profile from DynamoDB (cross-device restore).
// It also re-pushes whenever onboarding saves a profile (the
// "giftmaxxing:profile" event), so newly-logged dates sync immediately.
//
// Mounted once in app/layout.tsx inside <ClerkProvider>. Renders nothing.
export function AccountSync() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const userId = user.id;
    let cancelled = false;

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
    })();

    window.addEventListener("giftmaxxing:profile", push);
    return () => {
      cancelled = true;
      window.removeEventListener("giftmaxxing:profile", push);
    };
  }, [isLoaded, isSignedIn, user]);

  return null;
}
