"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useCurrentUser, getClerkImageUrl } from "@/lib/identity";
import { clearProfile, loadProfile, type UserProfile } from "@/lib/onboarding";
import { Icons } from "@/components/ui";
import { isApiConfigured, API_BASE, getMyUserId } from "@/lib/api";

const ChevronRight = Icons.chevronR;

// All localStorage keys used by the app (for export/delete).
const ALL_STORAGE_KEYS = [
  "giftmaxxing_onboarding",
  "giftmaxxing_uid",
  "giftmaxxing_user_posts",
  "giftmaxxing_post_state",
  "giftmaxxing_cart",
  "giftmaxxing_milestones",
  "giftmaxxing_fundraisers",
  "giftmaxxing_pending_pool_join",
  "giftmaxxing_swipes",
  "giftmaxxing_invite_session",
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const me = useCurrentUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const imageUrl = getClerkImageUrl() ?? clerkUser?.imageUrl ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
  }, []);

  const handleSignOut = async () => {
    clearProfile();
    await signOut();
    router.push("/");
  };

  const handleResetPreferences = () => {
    clearProfile();
    router.push("/onboarding");
  };

  // ── Data export ──────────────────────────────────────────────────────────
  const handleExportData = useCallback(() => {
    const data: Record<string, unknown> = {};
    for (const key of ALL_STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
        }
      } catch { /* skip inaccessible keys */ }
    }
    data._exportedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `giftmaxxing-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  // ── Data deletion ────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDeleteData = useCallback(async () => {
    // Clear all localStorage data
    for (const key of ALL_STORAGE_KEYS) {
      try { localStorage.removeItem(key); } catch { /* skip */ }
    }
    // If API is configured, call the delete endpoint
    const userId = getMyUserId();
    if (isApiConfigured() && userId) {
      try {
        await fetch(`${API_BASE}/me/delete`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch { /* best-effort */ }
    }
    setShowDeleteConfirm(false);
    setDeleteSuccess(true);
  }, []);

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

      {/* Data & Privacy section */}
      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Data &amp; Privacy
        </h2>
        <div className="mt-3 space-y-3">
          <button
            onClick={handleExportData}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-5 py-3.5 text-left transition-colors hover:bg-ink/5"
          >
            <div>
              <span className="text-sm font-semibold text-ink">Download my data</span>
              <p className="mt-0.5 text-xs text-ink-faint">
                Export all your preferences, saves, and interactions as JSON
              </p>
            </div>
            <ChevronRight size={16} className="text-ink-faint" />
          </button>

          {!showDeleteConfirm && !deleteSuccess && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-left transition-colors hover:bg-red-100"
            >
              <div>
                <span className="text-sm font-semibold text-red-600">
                  Delete all my data
                </span>
                <p className="mt-0.5 text-xs text-red-400">
                  Permanently remove all stored data from this device
                </p>
              </div>
              <ChevronRight size={16} className="text-red-400" />
            </button>
          )}

          {showDeleteConfirm && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                Are you sure? This cannot be undone.
              </p>
              <p className="mt-1 text-xs text-red-500">
                This will clear your taste profile, saves, interactions, cart, and all
                other locally stored data.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleDeleteData}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteSuccess && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-semibold text-green-700">
                All data deleted successfully.
              </p>
              <p className="mt-1 text-xs text-green-600">
                Your taste profile, saves, and interactions have been cleared.
              </p>
            </div>
          )}

          <a
            href="/privacy"
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-5 py-3.5 text-left transition-colors hover:bg-ink/5"
          >
            <span className="text-sm font-semibold text-ink">Privacy policy</span>
            <ChevronRight size={16} className="text-ink-faint" />
          </a>
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
