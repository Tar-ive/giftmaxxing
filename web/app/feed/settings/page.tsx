"use client";

import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useCurrentUser, getClerkImageUrl } from "@/lib/identity";
import { clearProfile, loadProfile } from "@/lib/onboarding";
import { Icons } from "@/components/ui";

const ChevronRight = Icons.chevronR;

export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const me = useCurrentUser();
  const profile = typeof window !== "undefined" ? loadProfile() : null;
  const imageUrl = getClerkImageUrl() ?? clerkUser?.imageUrl ?? null;

  const handleSignOut = async () => {
    clearProfile();
    await signOut();
    router.push("/");
  };

  const handleResetPreferences = () => {
    clearProfile();
    router.push("/onboarding");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
        Settings
      </h1>

      {/* Account section */}
      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Account
        </h2>
        <div className="mt-3 rounded-2xl border border-line bg-surface p-5">
          {isLoaded && isSignedIn && clerkUser ? (
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={me.name}
                  className="h-14 w-14 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-coral text-xl font-bold text-white">
                  {me.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-ink">
                  {me.name}
                </p>
                <p className="truncate text-sm text-ink-soft">
                  {clerkUser.primaryEmailAddress?.emailAddress ?? ""}
                </p>
                <p className="text-xs text-ink-faint">
                  @{me.handle}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Not signed in</p>
          )}
        </div>
      </section>

      {/* Preferences section */}
      {profile && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Taste Preferences
          </h2>
          <div className="mt-3 space-y-3">
            <SettingsRow
              label="Gift style"
              value={profile.style === "thoughtful" ? "Thoughtful" : profile.style === "materialistic" ? "Materialistic" : "Mix"}
            />
            <SettingsRow
              label="Budget"
              value={profile.dealPreferences.budgetRange === "budget" ? "Under $25" : profile.dealPreferences.budgetRange === "mid" ? "$25-$100" : profile.dealPreferences.budgetRange === "premium" ? "$100-$300" : "No limit"}
            />
            <SettingsRow
              label="Interests"
              value={`${profile.interests.length} selected`}
            />
            <button
              onClick={handleResetPreferences}
              className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-5 py-3.5 text-left transition-colors hover:bg-ink/5"
            >
              <span className="text-sm font-semibold text-ink">
                Re-do taste quiz
              </span>
              <ChevronRight size={16} className="text-ink-faint" />
            </button>
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Actions
        </h2>
        <div className="mt-3 space-y-3">
          <button
            onClick={() => router.push("/feed/you")}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-5 py-3.5 text-left transition-colors hover:bg-ink/5"
          >
            <span className="text-sm font-semibold text-ink">View profile</span>
            <ChevronRight size={16} className="text-ink-faint" />
          </button>

          {isSignedIn && (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-left transition-colors hover:bg-red-100"
            >
              <span className="text-sm font-semibold text-red-600">
                Sign out
              </span>
              <ChevronRight size={16} className="text-red-400" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-3.5">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
