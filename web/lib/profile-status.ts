"use client";

// ────────────────────────────────────────────────────────────────────────────
// Cloud-sync settle signal for the "restore profile on sign-in" step.
//
// AccountSync (components/app/account-sync.tsx) flips this once its hydration
// attempt has settled — whether or not a profile was found, and including the
// signed-out case. OnboardingGate waits for this before redirecting to
// /onboarding, so a returning user whose profile is still being fetched from
// DynamoDB isn't bounced into the wizard mid-restore.
//
// Module state intentionally resets on a full page load: every load re-runs the
// sync, so starting from "not settled" each time is correct.
// ────────────────────────────────────────────────────────────────────────────

let settled = false;
const listeners = new Set<() => void>();

export function isProfileSyncSettled(): boolean {
  return settled;
}

export function markProfileSyncSettled(): void {
  if (settled) return;
  settled = true;
  for (const listener of listeners) listener();
}

export function subscribeProfileSync(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
