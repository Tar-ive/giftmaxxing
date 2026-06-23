"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { GRADIENTS } from "@/lib/data";
import { resolveUser, commentCountOf, type Post } from "@/lib/social";
import { useCurrentUser, displayUser } from "@/lib/identity";
import { Avatar, Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";
import { useMaxi } from "@/components/app/maxi-provider";

export function PostCard({ post }: { post: Post }) {
  const { toggleLike, toggleSave, addComment, toggleFollow, isFollowing, openPost } = useStore();
  const { ask } = useMaxi();
  const me = useCurrentUser();
  const u = post.user === "you" ? me : resolveUser(post);
  const commentTotal = commentCountOf(post);
  const [draft, setDraft] = useState("");
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);

  const doubleTapLike = () => {
    if (!post.liked) toggleLike(post.id);
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  };

  const onMediaClick = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) doubleTapLike();
    lastTap.current = now;
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/feed/${u.id}`}>
          <Avatar grad={u.grad} label={u.name} size={38} />
        </Link>
        <div className="leading-tight">
          <Link href={`/feed/${u.id}`} className="text-sm font-bold text-ink hover:underline">
            {u.handle}
          </Link>
          {post.rec ? (
            <p className="flex items-center gap-1 text-xs text-coral">
              <Icons.sparkle size={12} />
              <span className="font-semibold">Suggested</span>
              <span className="text-ink-faint">· {post.reason}</span>
            </p>
          ) : (
            <p className="text-xs text-ink-faint">
              {post.time}
              {post.source && (
                <span className="ml-1.5 rounded-full bg-coral-soft px-1.5 py-0.5 text-[10px] font-semibold text-coral-ink">
                  via {post.source}
                </span>
              )}
            </p>
          )}
        </div>
        {post.user !== "you" && (
          <button
            onClick={() => toggleFollow(u.id)}
            className={`ml-auto text-sm font-bold ${
              isFollowing(u.id) ? "text-ink-soft" : "text-coral"
            }`}
          >
            {isFollowing(u.id) ? "Following" : "Follow"}
          </button>
        )}
        <button className={`text-ink-soft ${post.user !== "you" ? "ml-3" : "ml-auto"}`}>
          <Icons.more size={20} />
        </button>
      </div>

      {/* media */}
      <div
        className="relative grid aspect-square w-full cursor-pointer select-none place-items-center"
        style={{ background: GRADIENTS[post.product.grad] }}
        onClick={onMediaClick}
      >
        <span className="text-[96px]">{post.product.emoji}</span>
        {post.product.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.product.image}
            alt={post.product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        {/* product tag chip */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openPost(post.id);
          }}
          className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
        >
          <Icons.gift size={14} /> {post.product.name} · ${post.product.price}
        </button>

        {burst && (
          <span className="pointer-events-none absolute animate-[rise_0.7s_ease] text-white drop-shadow-lg">
            <Icons.heartFill size={110} />
          </span>
        )}
      </div>

      {/* actions */}
      <div className="flex items-center gap-4 px-4 pt-3 text-ink">
        <button onClick={() => toggleLike(post.id)} className={post.liked ? "text-coral" : ""} aria-label="Like">
          {post.liked ? <Icons.heartFill size={26} /> : <Icons.heart size={26} />}
        </button>
        <button onClick={() => openPost(post.id)} aria-label="Comment">
          <Icons.comment size={25} />
        </button>
        <button aria-label="Share">
          <Icons.share size={24} />
        </button>
        <button
          onClick={() => toggleSave(post.id)}
          className={`ml-auto ${post.saved ? "text-ink" : ""}`}
          aria-label="Save"
        >
          {post.saved ? <Icons.bookmarkFill size={25} /> : <Icons.bookmark size={25} />}
        </button>
      </div>

      {/* likes + caption + comments */}
      <div className="px-4 pb-4 pt-2">
        <p className="text-sm font-bold text-ink">{post.likes.toLocaleString()} likes</p>
        {post.caption && (
          <p className="mt-1 text-sm text-ink">
            <span className="font-bold">{u.handle}</span> {post.caption}
          </p>
        )}

        {commentTotal > 0 && (
          <button
            onClick={() => openPost(post.id)}
            className="mt-1.5 block text-sm text-ink-faint"
          >
            View all {commentTotal.toLocaleString()} comments
          </button>
        )}
        {post.comments.slice(-2).map((c) => (
          <p key={c.id} className="mt-1 text-sm text-ink">
            <span className="font-bold">{displayUser(c.user, me).handle}</span> {c.text}
          </p>
        ))}

        {/* add comment */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text) return;
            addComment(post.id, text);
            if (/^@maxi\b/i.test(text))
              ask(`${text.replace(/^@maxi\b/i, "").trim() || "any gift ideas like this?"} (like "${post.product.name}")`);
            setDraft("");
          }}
          className="mt-3 flex items-center gap-2 border-t border-line pt-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…  (try @maxi)"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
          />
          {draft.trim() && (
            <button type="submit" className="text-sm font-bold text-coral">
              Post
            </button>
          )}
        </form>
      </div>
    </article>
  );
}
