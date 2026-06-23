"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { isOnboardingComplete } from "@/lib/onboarding";

function subscribeToStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getOnboardingSnapshot(): boolean {
  return isOnboardingComplete();
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Checks localStorage for a completed onboarding profile. If absent,
 * redirects to /onboarding. Renders children only after the check passes.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const complete = useSyncExternalStore(
    subscribeToStorage,
    getOnboardingSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (!complete) router.replace("/onboarding");
  }, [complete, router]);

  if (!complete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-coral" />
      </div>
    );
  }

  return <>{children}</>;
}
