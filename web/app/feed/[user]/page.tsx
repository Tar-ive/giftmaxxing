"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { GRADIENTS } from "@/lib/data";
import { USERS, profilePosts } from "@/lib/social";
import { useCurrentUser, getClerkImageUrl } from "@/lib/identity";
import {
  loadProfile,
  setProfileVisibility,
  INTEREST_META,
  MATERIALISTIC_META,
  BUDGET_RANGE_META,
  type UserProfile,
  type GiftRole,
  type GiftStyle,
  type ProfileVisibility,
} from "@/lib/onboarding";
import { Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";
import {
  getMyUserId,
  fetchConnections,
  relativeTime,
  type SoftConnection,
} from "@/lib/api";

const ROLE_META: Record<GiftRole, { label: string; emoji: string }> = {
  giver: { label: "Gift giver", emoji: "🎁" },
  taker: { label: "Gift receiver", emoji: "🎀" },
  both: { label: "Gives & receives", emoji: "🤝" },
};

const STYLE_META: Record<GiftStyle, { label: string; emoji: string }> = {
  thoughtful: { label: "Thoughtful gifter", emoji: "💌" },
  materialistic: { label: "Loves nice things", emoji: "🛍️" },
  mix: { label: "Thoughtful + a treat", emoji: "🎨" },
};

export default function ProfilePage() {
  const params = useParams<{ user: string }>();
  const router = useRouter();
  const userId = params.user;
  const { toggleFollow, isFollowing, openPost } = useStore();
  const me = useCurrentUser();
  const [tab, setTab] = useState<"posts" | "friends">("posts");

  const isMe = userId === "you";
  const baseU = USERS[userId];

  // The signed-in user's onboarding profile (taste) + their soft-profile
  // "friends". Only meaningful for "you"; other profiles render from the demo
  // social graph and never expose the current user's connections.
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<SoftConnection[]>([]);

  useEffect(() => {
    if (!isMe) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
  }, [isMe]);

  useEffect(() => {
    if (!isMe) return;
    const uid = getMyUserId();
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const { items } = await fetchConnections(uid);
      if (!cancelled) setFriends(items);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMe]);

  if (!baseU && !isMe) return notFound();
  const u = isMe ? me : baseU;
  const grid = profilePosts(userId);
  const visibility: ProfileVisibility = profile?.visibility ?? "public";

  // Combined taste chips (interests + materialistic categories) for the summary.
  const tasteChips =
    isMe && profile
      ? [
          ...profile.interests.map((t) => INTEREST_META[t]),
          ...profile.materialisticCategories.map((c) => MATERIALISTIC_META[c]),
        ].filter(Boolean)
      : [];

  const tabs = isMe
    ? ([
        { id: "posts", label: "Posts", icon: "menu" },
        { id: "friends", label: "Friends", icon: "users" },
      ] as const)
    : ([{ id: "posts", label: "Posts", icon: "menu" }] as const);

  const toggleVisibility = () => {
    const next: ProfileVisibility = visibility === "public" ? "private" : "public";
    setProfileVisibility(next);
    setProfile((prev) => (prev ? { ...prev, visibility: next } : prev));
  };

  const clerkImageUrl = isMe ? getClerkImageUrl() : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      {/* header */}
      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
        {isMe && clerkImageUrl ? (
          <img
            src={clerkImageUrl}
            alt={u.name}
            className="h-24 w-24 shrink-0 rounded-full object-cover shadow-md sm:h-36 sm:w-36"
          />
        ) : (
          <div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-4xl font-bold text-white shadow-md sm:h-36 sm:w-36"
            style={{ background: GRADIENTS[u.grad] }}
          >
            {u.name.charAt(0)}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <h1 className="text-xl font-semibold text-ink">{u.handle}</h1>
            <div className="flex gap-2">
              {isMe ? (
                <>
                  <button
                    onClick={() => router.push("/feed/settings")}
                    className="rounded-lg bg-ink/5 px-4 py-1.5 text-sm font-bold text-ink"
                  >
                    Edit profile
                  </button>
                  <button className="rounded-lg bg-ink/5 px-4 py-1.5 text-sm font-bold text-ink">
                    Share profile
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => toggleFollow(u.id)}
                    className={`rounded-lg px-6 py-1.5 text-sm font-bold ${
                      isFollowing(u.id)
                        ? "bg-ink/5 text-ink"
                        : "bg-coral text-white"
                    }`}
                  >
                    {isFollowing(u.id) ? "Following" : "Follow"}
                  </button>
                  <button className="rounded-lg bg-ink/5 px-4 py-1.5 text-sm font-bold text-ink">
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* stats — real posts + friends counts (no fake follower numbers) */}
          <div className="mt-5 flex justify-center gap-8 sm:justify-start">
            <Stat n={grid.length} label="posts" />
            {isMe && <Stat n={friends.length} label="friends" />}
          </div>

          {/* name + taste summary */}
          <div className="mt-4">
            <p className="font-bold text-ink">{u.name}</p>
            {!isMe && u.bio && <p className="text-sm text-ink-soft">{u.bio}</p>}
          </div>

          {isMe && (
            <div className="mt-3">
              {profile ? (
                <>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Tag
                      emoji={ROLE_META[profile.role].emoji}
                      text={ROLE_META[profile.role].label}
                      highlight
                    />
                    <Tag
                      emoji={STYLE_META[profile.style].emoji}
                      text={STYLE_META[profile.style].label}
                    />
                    <Tag
                      emoji={BUDGET_RANGE_META[profile.dealPreferences.budgetRange].emoji}
                      text={BUDGET_RANGE_META[profile.dealPreferences.budgetRange].label}
                    />
                  </div>

                  {tasteChips.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">
                        Into
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                        {tasteChips.map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink-soft"
                          >
                            <span>{c.emoji}</span> {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-soft">
                  Finish onboarding to build your taste profile.
                </p>
              )}

              <VisibilityToggle
                visibility={visibility}
                onToggle={toggleVisibility}
                disabled={!profile}
              />
            </div>
          )}
        </div>
      </header>

      {/* tabs */}
      <div className="mt-10 flex justify-center gap-12 border-t border-line">
        {tabs.map((t) => {
          const Ico = Icons[t.icon];
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mt-px flex items-center gap-2 border-t-2 py-3 text-xs font-bold uppercase tracking-wider ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-faint"
              }`}
            >
              <Ico size={16} /> <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* content */}
      {tab === "friends" ? (
        <FriendsList friends={friends} />
      ) : grid.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-faint">No posts yet.</p>
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-1 sm:gap-2">
          {grid.map((p) => (
            <button
              key={p.id}
              onClick={() => openPost(p.id)}
              className="group relative grid aspect-square place-items-center overflow-hidden"
              style={{ background: GRADIENTS[p.product.grad] }}
            >
              <span className="text-5xl sm:text-6xl">{p.product.emoji}</span>
              <div className="absolute inset-0 flex items-center justify-center gap-5 bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex items-center gap-1.5 font-bold">
                  <Icons.heartFill size={20} /> {p.likes}
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <Icons.comment size={20} /> {p.comments.length}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({
  emoji,
  text,
  highlight,
}: {
  emoji: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        highlight ? "bg-coral-soft text-coral" : "bg-ink/5 text-ink-soft"
      }`}
    >
      <span>{emoji}</span> {text}
    </span>
  );
}

function VisibilityToggle({
  visibility,
  onToggle,
  disabled,
}: {
  visibility: ProfileVisibility;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const isPublic = visibility === "public";
  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-lg">
          {isPublic ? "🌍" : "🔒"}
        </span>
        <div>
          <p className="text-sm font-bold text-ink">
            {isPublic ? "Public profile" : "Private profile"}
          </p>
          <p className="text-xs text-ink-soft">
            {isPublic
              ? "Anyone can see your posts and friends."
              : "Only you can see your profile."}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label="Toggle profile visibility"
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isPublic ? "bg-coral" : "bg-ink/20"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            isPublic ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function FriendsList({ friends }: { friends: SoftConnection[] }) {
  if (friends.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-ink-faint">
        No friends yet. Share a swipe challenge — when someone finishes it, their
        taste lands here as a soft profile.
      </p>
    );
  }
  return (
    <div className="mt-2 divide-y divide-line">
      {friends.map((f) => {
        const tags = [...(f.vibes ?? []), ...(f.interests ?? [])].slice(0, 6);
        return (
          <div key={f.connectionId} className="flex items-start gap-3 py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral-soft text-xl">
              🎁
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">
                {f.guestName}
                {f.guestHandle && (
                  <span className="ml-1 font-normal text-ink-faint">
                    @{f.guestHandle}
                  </span>
                )}
              </p>
              <p className="text-xs text-ink-faint">
                Taste saved {relativeTime(f.createdAt) || "recently"}
                {f.birthday ? ` · 🎂 ${f.birthday}` : ""}
                {typeof f.yesCount === "number" && typeof f.totalSwipes === "number"
                  ? ` · liked ${f.yesCount}/${f.totalSwipes}`
                  : ""}
              </p>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink-soft"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <p className="text-sm text-ink">
      <span className="font-bold">{n.toLocaleString()}</span>{" "}
      <span className="text-ink-soft">{label}</span>
    </p>
  );
}
