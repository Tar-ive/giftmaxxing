"use client";

import { useState } from "react";
import { GRADIENTS } from "@/lib/data";
import { USERS } from "@/lib/social";
import { Avatar, Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";

export function PostModal() {
  const { openPostId, openPost, posts, toggleLike, toggleSave, addComment } = useStore();
  const [draft, setDraft] = useState("");
  const post = posts.find((p) => p.id === openPostId);
  if (!post) return null;
  const u = USERS[post.user];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-0 backdrop-blur-sm sm:p-6"
      onClick={() => openPost(null)}
    >
      <button
        onClick={() => openPost(null)}
        className="absolute right-4 top-4 z-10 text-white/80 hover:text-white"
        aria-label="Close"
      >
        <Icons.close size={30} />
      </button>

      <div
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-surface sm:h-[85vh] sm:rounded-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* media */}
        <div
          className="relative grid flex-1 place-items-center md:min-h-0"
          style={{ background: GRADIENTS[post.product.grad] }}
        >
          <span className="text-[120px]">{post.product.emoji}</span>
          <div className="absolute bottom-4 left-4 rounded-xl bg-black/55 px-4 py-2.5 text-white backdrop-blur">
            <p className="text-sm font-bold">{post.product.name}</p>
            <p className="text-xs text-white/80">
              {post.product.brand} · ${post.product.price}
              {post.product.was && (
                <span className="ml-1.5 line-through opacity-70">${post.product.was}</span>
              )}
            </p>
          </div>
        </div>

        {/* comments pane */}
        <div className="flex w-full flex-col border-t border-line md:w-[360px] md:border-l md:border-t-0">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar grad={u.grad} label={u.name} size={34} />
            <span className="text-sm font-bold text-ink">{u.handle}</span>
            <button className="ml-auto text-ink-soft">
              <Icons.more size={20} />
            </button>
          </div>

          {/* scrollable comments */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {post.caption && (
              <div className="flex gap-3">
                <Avatar grad={u.grad} label={u.name} size={32} />
                <p className="text-sm text-ink">
                  <span className="font-bold">{u.handle}</span> {post.caption}
                </p>
              </div>
            )}
            {post.comments.map((c) => {
              const cu = USERS[c.user];
              return (
                <div key={c.id} className="flex gap-3">
                  <Avatar grad={cu?.grad ?? "coral"} label={cu?.name ?? c.user} size={32} />
                  <p className="text-sm text-ink">
                    <span className="font-bold">{cu?.handle ?? c.user}</span> {c.text}
                  </p>
                </div>
              );
            })}
            {post.comments.length === 0 && (
              <p className="pt-6 text-center text-sm text-ink-faint">
                No comments yet. Start the conversation.
              </p>
            )}
          </div>

          {/* actions */}
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-center gap-4 text-ink">
              <button onClick={() => toggleLike(post.id)} className={post.liked ? "text-coral" : ""}>
                {post.liked ? <Icons.heartFill size={26} /> : <Icons.heart size={26} />}
              </button>
              <Icons.comment size={25} />
              <Icons.share size={24} />
              <button
                onClick={() => toggleSave(post.id)}
                className="ml-auto"
              >
                {post.saved ? <Icons.bookmarkFill size={25} /> : <Icons.bookmark size={25} />}
              </button>
            </div>
            <p className="mt-2 text-sm font-bold text-ink">
              {post.likes.toLocaleString()} likes
            </p>
            <p className="text-xs text-ink-faint">{post.time} ago</p>
          </div>

          {/* add comment */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addComment(post.id, draft);
              setDraft("");
            }}
            className="flex items-center gap-2 border-t border-line px-4 py-3"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
            />
            {draft.trim() && (
              <button type="submit" className="text-sm font-bold text-coral">
                Post
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
