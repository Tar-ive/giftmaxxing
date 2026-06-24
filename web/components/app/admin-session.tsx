"use client";

import { useEffect } from "react";
import { ADMIN_BYPASS, ADMIN_USER_ID } from "@/lib/admin";
import { getMyUserId, setMyUserId } from "@/lib/api";

// Local dev-only admin session indicator + identity pin.
//
// In production ADMIN_BYPASS is a compile-time `false`, so the render returns
// null (no badge) and the bypass branch tree-shakes away; the only surviving
// effect is a cheap localStorage hygiene check that clears a stale synthetic
// uid if one was ever left behind (a no-op for real users). In a dev admin
// session it instead pins the fake admin user id (so backend writes are
// attributable) and shows a small, unmistakable badge so the bypassed session
// is never confused with a real authenticated login.
export function AdminSession() {
  useEffect(() => {
    if (ADMIN_BYPASS) {
      // Pin the synthetic id so backend writes during a bypass session are attributable.
      setMyUserId(ADMIN_USER_ID);
    } else if (getMyUserId() === ADMIN_USER_ID) {
      // Bypass is off but a previous local dev session left the synthetic id behind;
      // clear it so it can never leak into attribution. No-op for real users.
      setMyUserId(null);
    }
  }, []);

  if (!ADMIN_BYPASS) return null;

  return (
    <div
      className="fixed bottom-20 left-3 z-[100] flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/95 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-lg backdrop-blur md:bottom-3"
      title="Local dev-only admin session — Clerk sign-in is bypassed. Inert in production."
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      ADMIN DEV SESSION
    </div>
  );
}
