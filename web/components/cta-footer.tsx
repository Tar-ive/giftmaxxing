"use client";

import { useState } from "react";
import { Icons, Maxi } from "@/components/ui";

export function WaitlistCTA() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section id="waitlist" className="scroll-mt-20 px-5 py-24">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[36px] bg-ink px-6 py-16 text-center shadow-2xl sm:px-12">
        {/* glow */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-coral/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-rose-2/30 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-6 w-fit">
            <Maxi size={56} />
          </div>
          <h2 className="font-serif text-4xl leading-tight text-cream sm:text-5xl">
            Never give a forgettable gift again.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-cream/70">
            Join the waitlist for early access. We&apos;ll let Maxi take it from
            here.
          </p>

          {done ? (
            <div className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full bg-coral px-6 py-3.5 font-bold text-white">
              <Icons.check size={20} /> You&apos;re on the list — see you soon!
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setDone(true);
              }}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3.5 text-cream placeholder:text-cream/40 outline-none focus:border-coral"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-6 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Get early access
                <Icons.arrow size={18} />
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-cream/50">
            No spam. Just an invite when your spot opens up.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
        <div className="flex items-center gap-2">
          <Maxi size={26} />
          <span className="font-display text-base font-extrabold text-ink">
            Giftmaxxing
          </span>
        </div>
        <p className="text-sm text-ink-faint">
          © {new Date().getFullYear()} Giftmaxxing. Gifting, finally figured
          out.
        </p>
        <div className="flex gap-5 text-sm font-semibold text-ink-soft">
          <a href="#features" className="hover:text-ink">
            Features
          </a>
          <a href="#maxi" className="hover:text-ink">
            Maxi
          </a>
          <a href="#waitlist" className="hover:text-ink">
            Waitlist
          </a>
        </div>
      </div>
    </footer>
  );
}
