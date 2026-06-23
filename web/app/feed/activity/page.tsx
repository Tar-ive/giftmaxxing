"use client";

import Link from "next/link";
import { USERS } from "@/lib/social";
import { Avatar, Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";

type Item =
  | { type: "maxi"; text: string; time: string }
  | { type: "milestone"; text: string; time: string }
  | { type: "drop"; text: string; time: string }
  | { type: "user"; user: string; text: string; time: string; follow?: boolean };

const ITEMS: Item[] = [
  { type: "milestone", text: "You completed \"Read 12 books\" — $50 reward unlocked! Treat yourself.", time: "3d" },
  { type: "maxi", text: "Maya's birthday is in 4 days — I lined up 7 ideas in your budget.", time: "now" },
  { type: "drop", text: "Perfume on your radar just dropped 20%. Snag it before it's gone.", time: "2h" },
  { type: "user", user: "jules", text: "chipped in $25 to Sam's farewell gift. 6 of 9 in!", time: "3h" },
  { type: "user", user: "theo", text: "and 12 others liked your find.", time: "5h" },
  { type: "user", user: "noor", text: "claimed something from your wishlist 🤫", time: "1d" },
  { type: "user", user: "ivy", text: "started following your lists.", time: "2d", follow: true },
];

export default function ActivityPage() {
  const { toggleFollow, isFollowing } = useStore();
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Activity</h1>
      <div className="divide-y divide-line">
        {ITEMS.map((it, i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            {it.type === "maxi" ? (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-lg">🎁</span>
            ) : it.type === "milestone" ? (
              <Link href="/feed/milestones">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-100 text-lg">🏆</span>
              </Link>
            ) : it.type === "drop" ? (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
                <Icons.trend size={20} />
              </span>
            ) : (
              <Link href={`/feed/${it.user}`}>
                <Avatar grad={USERS[it.user].grad} label={USERS[it.user].name} size={40} />
              </Link>
            )}
            <p className="flex-1 text-sm text-ink">
              {it.type === "user" && (
                <Link href={`/feed/${it.user}`} className="font-bold hover:underline">
                  {USERS[it.user].handle}{" "}
                </Link>
              )}
              {it.text}
              <span className="ml-1 text-xs text-ink-faint">{it.time}</span>
            </p>
            {it.type === "user" && it.follow && (
              <button
                onClick={() => toggleFollow(it.user)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold ${
                  isFollowing(it.user) ? "bg-ink/5 text-ink" : "bg-coral text-white"
                }`}
              >
                {isFollowing(it.user) ? "Following" : "Follow"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
