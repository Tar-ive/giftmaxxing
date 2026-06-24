// ────────────────────────────────────────────────────────────────────────────
// Admin DEV test session — a LOCAL-ONLY Clerk bypass for testing the app
// without signing in through Clerk.
//
// SECURITY MODEL (read before touching anything that imports this):
//   • PRODUCTION-IMPOSSIBLE. ADMIN_BYPASS is gated on
//     `process.env.NODE_ENV === "development"`. Next.js inlines NODE_ENV at
//     build time, so in ANY production build (`next build` / Vercel) the whole
//     expression collapses to the compile-time constant `false` and every
//     `if (ADMIN_BYPASS)` branch is dead-code-eliminated. The flag below is not
//     even read in production — setting it on Vercel does nothing.
//   • OPT-IN. It additionally requires `NEXT_PUBLIC_ADMIN_BYPASS === "1"`, which
//     lives ONLY in the gitignored `web/.env.local`. It is never committed,
//     never in `.env.example`'s active config, and never set in Vercel.
//   • SCOPED. Uses a clearly-fake identity that cannot collide with a real Clerk
//     user id (those look like `user_…`). Anything it writes is attributable to
//     this id and isolated from real accounts.
//   • VISIBLE. `components/app/admin-session.tsx` renders an on-screen badge so
//     an admin session is never mistaken for a real authenticated login.
//
// HOW TO USE (local only):
//   1. Add `NEXT_PUBLIC_ADMIN_BYPASS=1` to web/.env.local
//   2. Restart `next dev` (NEXT_PUBLIC_* is inlined at dev-server start)
//   3. Open /feed — you land straight in the app, no Clerk sign-in.
//   To disable: remove the line and restart (or just build for production).
// ────────────────────────────────────────────────────────────────────────────

import type { UserProfile } from "@/lib/onboarding";

/**
 * True only in a local dev server that has explicitly opted in. Hard-`false`
 * (and tree-shaken away) in every production build.
 */
export const ADMIN_BYPASS =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ADMIN_BYPASS === "1";

/**
 * Synthetic id for the admin test session. Real Clerk ids are `user_…`, so this
 * can never collide with a genuine account.
 */
export const ADMIN_USER_ID = "admin-dev-local";

/**
 * A minimal, valid profile (satisfies `isUserProfile`/`isOnboardingComplete`) so
 * both the Clerk AuthGate and the OnboardingGate fall straight through to the
 * app. Uses a fixed timestamp to avoid SSR/CSR hydration mismatches.
 */
export const ADMIN_PROFILE: UserProfile = {
  name: "Admin (dev)",
  role: "both",
  difficulty: "moderate",
  style: "mix",
  materialisticCategories: ["tech", "home", "kitchen"],
  interests: ["cozy", "minimalist", "foodie", "coffee-tea"],
  dealPreferences: {
    sensitivity: "value-conscious",
    budgetRange: "mid",
    dealTypes: ["price-drops", "bundle-deals"],
    priceAlerts: false,
  },
  pinterestLinks: [],
  eventLoggingEnabled: false,
  recipients: [],
  events: [],
  completedAt: 1700000000000,
};
