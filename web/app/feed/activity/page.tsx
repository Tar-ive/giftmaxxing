"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { USERS } from "@/lib/social";
import { Avatar, Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";
import {
  getMyUserId,
  fetchConnections,
  markConnectionsSeen,
  relativeTime,
  type SoftConnection,
} from "@/lib/api";

const ACTIVITY_SEEN_KEY = "giftmaxxing_activity_seen";

function markLocalSeen(): void {
  try {
    localStorage.setItem(ACTIVITY_SEEN_KEY, Date.now().toString());
    window.dispatchEvent(new Event("giftmaxxing:activity-seen"));
  } catch { /* ignore */ }
}

type ActivityItem =
  | { kind: "challenge"; text: string; time: string; icon: string; highlight: boolean }
  | { kind: "connection"; text: string; time: string; user: string }
  | { kind: "pool"; text: string; time: string; user: string }
  | { kind: "like"; text: string; time: string; user: string }
  | { kind: "follow"; text: string; time: string; user: string; followable: true }
  | { kind: "maxi"; text: string; time: string }
  | { kind: "milestone"; text: string; time: string }
  | { kind: "drop"; text: string; time: string };

const DEMO_ITEMS: ActivityItem[] = [
  {
    kind: "maxi",
    text: "Maya's birthday is in 4 days — I lined up 7 ideas in your budget.",
    time: "now",
  },
  {
    kind: "drop",
    text: "Perfume on your radar just dropped 20%. Snag it before it's gone.",
    time: "2h",
  },
  {
    kind: "pool",
    text: "chipped in $25 to Sam's farewell gift. 6 of 9 in!",
    time: "3h",
    user: "jules",
  },
  {
    kind: "like",
    text: "and 12 others liked your find.",
    time: "5h",
    user: "theo",
  },
  {
    kind: "connection",
    text: "claimed something from your wishlist",
    time: "1d",
    user: "noor",
  },
  {
    kind: "follow",
    text: "started following your lists.",
    time: "2d",
    user: "ivy",
    followable: true,
  },
  {
    kind: "milestone",
    text: "You completed \"Read 12 books\" — $50 reward unlocked! Treat yourself.",
    time: "3d",
  },
  {
    kind: "pool",
    text: "added $15 to Noor's birthday pool. Almost there!",
    time: "4d",
    user: "remy",
  },
  {
    kind: "like",
    text: "saved your gift idea for Theo.",
    time: "5d",
    user: "maya",
  },
];

function iconForKind(kind: ActivityItem["kind"]): React.ReactNode {
  switch (kind) {
    case "maxi":
      return (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral text-lg">
          🎁
        </span>
      );
    case "milestone":
      return (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-100 text-lg">
          🏆
        </span>
      );
    case "drop":
      return (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
          <Icons.trend size={20} />
        </span>
      );
    case "pool":
      return (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-100 text-lg">
          💰
        </span>
      );
    case "challenge":
      return (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral text-lg text-white">
          🎁
        </span>
      );
    default:
      return null;
  }
}

export default function ActivityPage() {
  const { toggleFollow, isFollowing } = useStore();
  const [conns, setConns] = useState<SoftConnection[]>([]);

  useEffect(() => {
    const uid = getMyUserId();
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const { items } = await fetchConnections(uid);
      if (cancelled) return;
      setConns(items);
      if (items.some((c) => !c.seen)) void markConnectionsSeen(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mark local activity as seen when this page mounts
  useEffect(() => {
    markLocalSeen();
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-extrabold text-ink">
        Activity
      </h1>

      {/* Backend connections (challenge completions) */}
      {conns.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wider text-ink-faint">
            Your challenges
          </p>
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {conns.map((c) => (
              <div key={c.connectionId} className="flex items-center gap-3 px-4 py-3.5">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${
                    c.seen ? "bg-coral-soft" : "bg-coral text-white"
                  }`}
                >
                  🎁
                </span>
                <p className="flex-1 text-sm text-ink">
                  <span className="font-bold">{c.guestName}</span> completed your gift
                  challenge{c.birthday ? " — birthday & taste saved" : " — taste saved"}.
                  <span className="ml-1 text-xs text-ink-faint">
                    {relativeTime(c.createdAt)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Demo activity feed */}
      <section>
        <p className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wider text-ink-faint">
          Recent
        </p>
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {DEMO_ITEMS.map((it, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              {/* Icon / avatar */}
              {"user" in it && it.user ? (
                <Link href={`/feed/${it.user}`}>
                  <Avatar
                    grad={USERS[it.user]?.grad ?? "coral"}
                    label={USERS[it.user]?.name ?? "?"}
                    size={44}
                  />
                </Link>
              ) : (
                iconForKind(it.kind)
              )}

              {/* Text */}
              <p className="flex-1 text-sm text-ink">
                {"user" in it && it.user && (
                  <Link
                    href={`/feed/${it.user}`}
                    className="font-bold hover:underline"
                  >
                    {USERS[it.user]?.handle ?? it.user}{" "}
                  </Link>
                )}
                {it.text}
                <span className="ml-1 text-xs text-ink-faint">{it.time}</span>
              </p>

              {/* Follow button */}
              {"followable" in it && it.followable && "user" in it && it.user && (
                <button
                  onClick={() => toggleFollow(it.user)}
                  className={`shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold ${
                    isFollowing(it.user)
                      ? "bg-ink/5 text-ink"
                      : "bg-coral text-white"
                  }`}
                >
                  {isFollowing(it.user) ? "Following" : "Follow"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
