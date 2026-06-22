"use client";

import { useEffect, useRef } from "react";
import { StoriesTray } from "@/components/app/stories";
import { PostCard } from "@/components/app/post-card";
import { RightRail } from "@/components/app/right-rail";
import { useStore } from "@/components/app/store";

export default function FeedPage() {
  const { posts, loadMore, hasMore, loadingMore } = useStore();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll: when the sentinel near the bottom enters view, fetch the
  // next ranked page from the recommendation engine.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" } // prefetch before the user hits the end
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore]);

  return (
    <div className="mx-auto flex max-w-5xl justify-center gap-12 px-3 py-6 sm:px-5">
      <div className="w-full max-w-[470px] space-y-5">
        <StoriesTray />

        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}

        {loadingMore && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {/* sentinel */}
        {hasMore ? (
          <div ref={sentinelRef} className="h-10" aria-hidden />
        ) : (
          <p className="py-8 text-center text-sm text-ink-faint">
            You&apos;re all caught up ✨
          </p>
        )}
      </div>
      <RightRail />
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-line" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-24 animate-pulse rounded bg-line" />
          <div className="h-2 w-16 animate-pulse rounded bg-line" />
        </div>
      </div>
      <div className="aspect-square w-full animate-pulse bg-line" />
      <div className="space-y-2 px-4 py-4">
        <div className="h-2.5 w-32 animate-pulse rounded bg-line" />
        <div className="h-2.5 w-48 animate-pulse rounded bg-line" />
      </div>
    </div>
  );
}
