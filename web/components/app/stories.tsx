"use client";

import { useEffect, useState } from "react";
import { GRADIENTS } from "@/lib/data";
import { STORIES, USERS } from "@/lib/social";
import { Icons, Maxi } from "@/components/ui";
import { useStore } from "@/components/app/store";

export function StoriesTray() {
  const { openStory } = useStore();
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-4">
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STORIES.map((s, i) => {
          const u = USERS[s.user];
          return (
            <button
              key={s.id}
              onClick={() => openStory(i)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`grid place-items-center rounded-full p-[2.5px] ${
                  s.live
                    ? "bg-gradient-to-tr from-coral via-rose-2 to-butter-2"
                    : s.add
                    ? "bg-line"
                    : "bg-gradient-to-tr from-coral to-lilac-2"
                }`}
              >
                <span className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-cream bg-surface">
                  <span
                    className="grid h-full w-full place-items-center rounded-full text-lg font-bold text-white"
                    style={{ background: GRADIENTS[u.grad] }}
                  >
                    {u.name.charAt(0)}
                  </span>
                  {s.add && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-cream bg-coral text-white">
                      <Icons.plusSquare size={12} />
                    </span>
                  )}
                  {s.countdown && (
                    <span className="absolute -bottom-1 rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-bold text-cream">
                      {s.countdown}
                    </span>
                  )}
                </span>
              </span>
              <span className="max-w-16 truncate text-[11px] text-ink-soft">
                {s.add ? "Your story" : u.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StoryViewer() {
  const { storyIndex, openStory } = useStore();
  const open = storyIndex !== null;
  const [progress, setProgress] = useState(0);

  const go = (dir: number) => {
    if (storyIndex === null) return;
    const next = storyIndex + dir;
    if (next < 0 || next >= STORIES.length) openStory(null);
    else openStory(next);
  };

  useEffect(() => {
    if (storyIndex === null) return;
    const start = Date.now();
    const dur = 5000;
    let id: ReturnType<typeof setInterval>;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        go(1);
      }
    };
    // defer first setState out of the effect body to avoid cascading renders
    const raf = requestAnimationFrame(() => {
      setProgress(0);
      id = setInterval(tick, 50);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openStory(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storyIndex]);

  if (!open || storyIndex === null) return null;
  const s = STORIES[storyIndex];
  const u = USERS[s.user];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <button
        onClick={() => openStory(null)}
        className="absolute right-5 top-5 text-white/80 hover:text-white"
        aria-label="Close"
      >
        <Icons.close size={30} />
      </button>

      {/* prev / next */}
      <button onClick={() => go(-1)} className="absolute left-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white sm:left-8" aria-label="Previous">
        <Icons.chevronL size={22} />
      </button>
      <button onClick={() => go(1)} className="absolute right-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white sm:right-8" aria-label="Next">
        <Icons.chevronR size={22} />
      </button>

      <div
        className="relative h-[80vh] w-[min(420px,92vw)] overflow-hidden rounded-3xl"
        style={{ background: GRADIENTS[u.grad] }}
        onClick={() => go(1)}
      >
        {/* progress bars */}
        <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 p-3">
          {STORIES.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress * 100}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute left-0 right-0 top-6 z-10 flex items-center gap-2.5 px-4">
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-white/70 bg-white/20 font-bold text-white">
            {u.name.charAt(0)}
          </span>
          <span className="text-sm font-bold text-white drop-shadow">{u.name}</span>
          <span className="text-xs text-white/80">{s.countdown ?? "now"}</span>
        </div>

        {/* body */}
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          {s.kind === "drop" ? (
            <>
              <p className="text-5xl">🎁</p>
              <p className="mt-4 font-serif text-3xl text-white drop-shadow">Today&apos;s Curated Drop</p>
              <p className="mt-2 text-white/85">Cozy season picks — live for 24h</p>
            </>
          ) : s.countdown ? (
            <>
              <Maxi size={64} />
              <p className="mt-4 font-serif text-4xl text-white drop-shadow">
                {u.name.split(" ")[0]}&apos;s {s.kind === "anniv" ? "anniversary" : "birthday"}
              </p>
              <p className="mt-1 text-lg text-white/90">in {s.countdown}</p>
              <div className="mt-5 rounded-2xl bg-white/20 px-5 py-3 text-sm font-semibold text-white backdrop-blur">
                Maxi lined up gift ideas in your budget →
              </div>
            </>
          ) : (
            <>
              <p className="text-5xl">✨</p>
              <p className="mt-4 font-serif text-3xl text-white drop-shadow">{s.label}</p>
              <p className="mt-2 text-white/85">Tap to see what they&apos;re loving</p>
            </>
          )}
        </div>

        {/* reply bar */}
        <div className="absolute bottom-4 left-0 right-0 z-10 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 rounded-full border border-white/40 px-4 py-2.5">
            <input
              placeholder={`Reply to ${u.name.split(" ")[0]}…`}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
            />
            <Icons.heart size={20} className="text-white" />
            <Icons.share size={18} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
