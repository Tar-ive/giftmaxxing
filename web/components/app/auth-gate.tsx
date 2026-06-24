"use client";

import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Maxi } from "@/components/ui";
import { AuthConsent } from "@/components/app/auth-consent";

// Hard auth boundary for the app shell. When Clerk is configured, every /feed/*
// route requires a real signed-in session — a local onboarding profile alone is
// NOT enough. This closes the hole where completing the swipe/invite flow wrote
// a local profile and silently "logged you in" with no authentication.
//
// Only rendered when Clerk is enabled (app/feed/layout.tsx guards this), so
// useUser always has a ClerkProvider above it. Signing in via the modal flips
// isSignedIn and re-renders the children in place — no redirect needed.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-coral" />
      </div>
    );
  }

  if (isSignedIn) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      <Maxi size={64} />
      <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">Sign in to continue</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        Your Giftmaxxing feed, lists, and gift sets are private. Sign in to access them.
      </p>
      <div className="mt-7 flex flex-col items-center gap-2 sm:flex-row">
        <SignInButton mode="modal">
          <button className="w-full rounded-full bg-coral px-7 py-3 text-sm font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90 sm:w-auto">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="w-full rounded-full border border-line bg-surface px-7 py-3 text-sm font-bold text-ink transition-colors hover:bg-coral-soft sm:w-auto">
            Create account
          </button>
        </SignUpButton>
      </div>
      <AuthConsent />
    </div>
  );
}
