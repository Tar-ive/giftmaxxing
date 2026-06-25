"use client";

import Link from "next/link";
import { SUGGESTIONS, USERS } from "@/lib/social";
import { useCurrentUser } from "@/lib/identity";
import { Avatar } from "@/components/ui";
import { useStore } from "@/components/app/store";
import { useMaxi } from "@/components/app/maxi-provider";

export function RightRail() {
  const { toggleFollow, isFollowing } = useStore();
  const { open, cartOpen } = useMaxi();
  const me = useCurrentUser();
  // With a right-hand pane open (Maxi chat or cart drawer) there's only room for
  // the suggestions column on the widest screens, so show it from xl then.
  const paneOpen = open || cartOpen;

  return (
    <aside
      className={`sticky top-6 hidden h-fit w-80 shrink-0 pt-2 ${
        paneOpen ? "xl:block" : "lg:block"
      }`}
    >
      {/* current user */}
      <div className="flex items-center gap-4 px-2">
        <Link href="/feed/you">
          <Avatar grad={me.grad} label={me.name} size={56} />
        </Link>
        <div className="min-w-0">
          <Link href="/feed/you" className="block truncate text-sm font-bold text-ink">
            {me.handle}
          </Link>
          <p className="truncate text-sm text-ink-faint">{me.name}</p>
        </div>
        <Link href="/" className="ml-auto text-xs font-bold text-coral">
          Switch
        </Link>
      </div>

      {/* maxi nudge */}
      <Link
        href="/feed/maxi"
        className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-coral-soft/60 p-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-lg">🎁</span>
        <p className="text-[13px] leading-snug text-ink">
          <span className="font-bold">Maxi:</span> Maya&apos;s birthday is in 4 days — I lined up 7 ideas in your budget.
        </p>
      </Link>

      {/* suggestions */}
      <div className="mt-6 flex items-center justify-between px-2">
        <span className="text-sm font-bold text-ink-soft">Suggested for you</span>
        <button className="text-xs font-bold text-ink">See all</button>
      </div>

      <div className="mt-2 space-y-1">
        {SUGGESTIONS.map((s) => {
          const u = USERS[s.user];
          const following = isFollowing(u.id);
          return (
            <div key={s.user} className="flex items-center gap-3 px-2 py-1.5">
              <Link href={`/feed/${u.id}`}>
                <Avatar grad={u.grad} label={u.name} size={40} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/feed/${u.id}`} className="block truncate text-sm font-bold text-ink hover:underline">
                  {u.handle}
                </Link>
                <p className="truncate text-xs text-ink-faint">{s.reason}</p>
              </div>
              <button
                onClick={() => toggleFollow(u.id)}
                className={`text-xs font-bold ${following ? "text-ink-soft" : "text-coral"}`}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 px-2 text-xs leading-relaxed text-ink-faint">
        About · Help · Press · API · Jobs · Privacy · Terms
        <br />
        <span className="mt-3 block">© {new Date().getFullYear()} Giftmaxxing</span>
      </p>
    </aside>
  );
}
