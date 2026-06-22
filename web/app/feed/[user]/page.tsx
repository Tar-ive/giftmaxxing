"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import { GRADIENTS } from "@/lib/data";
import { USERS, profilePosts } from "@/lib/social";
import { Icons } from "@/components/ui";
import { useStore } from "@/components/app/store";

const TABS = [
  { id: "posts", label: "Finds", icon: "menu" as const },
  { id: "saved", label: "Saved", icon: "bookmark" as const },
  { id: "tagged", label: "Tagged", icon: "gift" as const },
];

export default function ProfilePage() {
  const params = useParams<{ user: string }>();
  const userId = params.user;
  const { toggleFollow, isFollowing, openPost, posts } = useStore();
  const [tab, setTab] = useState("posts");

  const u = USERS[userId];
  if (!u) return notFound();

  const isMe = userId === "you";
  const grid = profilePosts(userId);
  const savedPosts = posts.filter((p) => p.saved);

  const shown = tab === "saved" ? savedPosts : grid;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      {/* header */}
      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
        <div
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-4xl font-bold text-white shadow-md sm:h-36 sm:w-36"
          style={{ background: GRADIENTS[u.grad] }}
        >
          {u.name.charAt(0)}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <h1 className="text-xl font-semibold text-ink">{u.handle}</h1>
            <div className="flex gap-2">
              {isMe ? (
                <>
                  <button className="rounded-lg bg-ink/5 px-4 py-1.5 text-sm font-bold text-ink">
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

          <div className="mt-5 flex justify-center gap-8 sm:justify-start">
            <Stat n={grid.length} label="finds" />
            <Stat n={u.followers ?? 0} label="followers" />
            <Stat n={u.following ?? 0} label="following" />
          </div>

          <div className="mt-4">
            <p className="font-bold text-ink">{u.name}</p>
            {u.bio && <p className="text-sm text-ink-soft">{u.bio}</p>}
          </div>
        </div>
      </header>

      {/* tabs */}
      <div className="mt-10 flex justify-center gap-12 border-t border-line">
        {TABS.map((t) => {
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
              <Ico size={16} /> <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* grid */}
      {shown.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-faint">
          {tab === "saved" ? "Nothing saved yet." : "No finds yet."}
        </p>
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-1 sm:gap-2">
          {shown.map((p) => (
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

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <p className="text-sm text-ink">
      <span className="font-bold">{n.toLocaleString()}</span>{" "}
      <span className="text-ink-soft">{label}</span>
    </p>
  );
}
