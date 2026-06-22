"use client";

import { useState } from "react";
import Link from "next/link";
import { Maxi } from "@/components/ui";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#maxi", label: "Meet Maxi" },
  { href: "#how", label: "How it works" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2">
          <Maxi size={32} />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Giftmaxxing
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/feed" className="text-sm font-semibold text-ink-soft transition-colors hover:text-ink">
            Open app
          </Link>
          <a
            href="#waitlist"
            className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream transition-transform hover:-translate-y-0.5"
          >
            Get early access
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface md:hidden"
          aria-label="Toggle menu"
        >
          <div className="space-y-1.5">
            <span className={`block h-0.5 w-5 bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </div>
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-cream px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base font-semibold text-ink"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/feed"
              onClick={() => setOpen(false)}
              className="text-base font-semibold text-ink"
            >
              Open app
            </Link>
            <a
              href="#waitlist"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-ink px-4 py-2.5 text-center text-sm font-bold text-cream"
            >
              Get early access
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
