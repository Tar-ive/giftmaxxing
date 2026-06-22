import { FEATURES, GRADIENTS, PRODUCTS } from "@/lib/data";
import { Icons, Maxi, ProductTile } from "@/components/ui";

const STYLE_TAGS = [
  "Film photography",
  "Cozy minimal",
  "Matcha core",
  "Vinyl",
  "Warm tones",
  "Stationery",
];

export function StatStrip() {
  const stats = [
    { k: "0", v: "duplicate gifts, ever" },
    { k: "4 days", v: "average heads-up before an event" },
    { k: "$60", v: "budget? Maxi stays inside it" },
    { k: "94%", v: "taste-match on top picks" },
  ];
  return (
    <section className="border-y border-line/70 bg-surface/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-5 py-8 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.v} className="px-4 text-center">
            <p className="font-serif text-3xl text-ink sm:text-4xl">{s.k}</p>
            <p className="mt-1 text-xs font-medium text-ink-soft">{s.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MaxiSpotlight() {
  return (
    <section id="maxi" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-coral">
            <Icons.sparkle size={16} /> Meet Maxi
          </span>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">
            An AI companion that{" "}
            <span className="italic">actually knows</span> the person
            you&apos;re shopping for.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
            Link a Pinterest board or recent saves and Maxi learns their
            aesthetic. Tell it the occasion and budget — it returns real
            products that fit, builds complete bundles, and explains every pick.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              "Reads taste from social signals, not guesswork",
              "Stays inside the budget you set — always",
              "Pings you the moment a saved item drops in price",
              "Handles sensitive occasions with care",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
                  <Icons.check size={15} />
                </span>
                <span className="text-[15px] text-ink">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Chat mock */}
        <div className="relative rounded-[28px] border border-line bg-surface p-5 shadow-xl shadow-black/5">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <Maxi size={40} />
            <div>
              <p className="text-sm font-bold text-ink">Maxi</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                thinking about Maya&apos;s gift
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Bubble from="maxi">
              I scanned Maya&apos;s linked Pinterest + recent saves — she&apos;s
              deep in a film-photography + cozy-home phase right now.
            </Bubble>
            <div className="flex flex-wrap gap-1.5 pl-1">
              {STYLE_TAGS.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line bg-cream-2 px-2.5 py-1 text-[11px] font-semibold text-ink-soft"
                >
                  {t}
                </span>
              ))}
            </div>
            <Bubble from="maxi">
              Top match — <b>94%</b> her aesthetic and inside your <b>$60</b>{" "}
              budget:
            </Bubble>
            <div className="ml-1 w-44">
              <ProductTile product={PRODUCTS[0]} height={120} />
            </div>
            <Bubble from="you">love it. bundle it?</Bubble>
            <Bubble from="maxi">
              On it — adding a film pack + photo album rounds it out for +$24. 🎁
            </Bubble>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bubble({ from, children }: { from: "maxi" | "you"; children: React.ReactNode }) {
  const mine = from === "you";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${
          mine
            ? "bg-ink text-cream"
            : "border border-line bg-cream-2 text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 bg-surface/50 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <h2 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Everything gifting should have been all along.
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Built around the people you care about — not an endless product
            catalog.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="group flex flex-col rounded-[24px] border border-line bg-surface p-7 shadow-sm transition-transform hover:-translate-y-1"
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm"
                style={{ background: GRADIENTS[f.accent] }}
              >
                <FeatureIcon i={i} />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-ink">
                {f.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                {f.body}
              </p>
              <span className="mt-4 text-xs font-bold uppercase tracking-wider text-coral">
                {f.tag}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ i }: { i: number }) {
  const map = [Icons.gift, Icons.heart, Icons.users, Icons.calendar];
  const Ico = map[i % map.length];
  return <Ico size={24} />;
}
