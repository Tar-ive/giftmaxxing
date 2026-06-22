import { PRODUCTS } from "@/lib/data";
import { Avatar, Icons, Maxi, Pill, ProductTile } from "@/components/ui";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        {/* Copy */}
        <div className="animate-rise">
          <Pill>
            <span className="text-coral">
              <Icons.sparkle size={14} />
            </span>
            Meet Maxi, your AI gift companion
          </Pill>

          <h1 className="mt-6 font-serif text-5xl leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Gifting,{" "}
            <span className="italic text-coral">finally</span> figured out.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Discover gift-worthy finds from friends, build wishlists nobody
            double-buys, and pool money for group gifts. Then let{" "}
            <span className="font-semibold text-ink">Maxi</span> learn each
            person&apos;s taste and surface the perfect present — in your budget,
            right on time.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-coral/30 transition-transform hover:-translate-y-0.5"
            >
              Get early access
              <Icons.arrow size={18} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-6 py-3.5 text-base font-bold text-ink transition-colors hover:bg-cream-2"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              <Avatar grad="rose" label="M" size={32} />
              <Avatar grad="lilac" label="J" size={32} />
              <Avatar grad="sky" label="S" size={32} />
              <Avatar grad="butter" label="N" size={32} />
            </div>
            <p className="text-sm text-ink-soft">
              <span className="font-bold text-ink">2,400+</span> people gifting
              smarter on the waitlist
            </p>
          </div>
        </div>

        {/* Visual */}
        <div className="relative animate-rise [animation-delay:120ms]">
          {/* Friend's "find" card */}
          <div className="relative z-10 mx-auto max-w-sm rounded-[28px] border border-line bg-surface p-4 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3">
              <Avatar grad="rose" label="Maya" />
              <div className="leading-tight">
                <p className="text-sm font-bold text-ink">Maya Reyes</p>
                <p className="text-xs text-ink-faint">posted a find · 12m</p>
              </div>
              <span className="ml-auto text-coral">
                <Icons.heart size={20} />
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              genuinely the move for anyone turning 22. point-and-shoot szn is
              back 📸
            </p>
            <div className="mt-3">
              <ProductTile product={PRODUCTS[0]} height={170} />
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-ink-faint">
              <span>214 likes</span>
              <span>31 saved</span>
              <span className="ml-auto rounded-full bg-coral-soft px-2.5 py-1 text-coral-ink">
                Save to a list
              </span>
            </div>
          </div>

          {/* Maxi chat bubble */}
          <div className="absolute -left-2 bottom-2 z-20 hidden w-64 rounded-2xl border border-line bg-surface p-3 shadow-xl shadow-black/10 sm:block animate-float">
            <div className="flex items-start gap-2.5">
              <Maxi size={34} />
              <p className="text-xs leading-snug text-ink">
                Maya&apos;s birthday is in{" "}
                <span className="font-bold">4 days</span> 🎈 I lined up 7 ideas
                in your <span className="font-bold">$60</span> budget.
              </p>
            </div>
          </div>

          {/* Floating product tile */}
          <div className="absolute -right-3 -top-5 z-20 hidden w-40 rotate-3 sm:block animate-float [animation-delay:1.5s]">
            <ProductTile product={PRODUCTS[2]} height={110} />
          </div>

          {/* soft glow */}
          <div className="absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-coral/20 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
