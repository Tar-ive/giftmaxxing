import { STEPS } from "@/lib/data";
import { Avatar, Icons } from "@/components/ui";

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-coral">
            How it works
          </span>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Three steps from &quot;what do I even get them&quot; to gift given.
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            The hard part — knowing what someone actually wants — is the part we
            take off your plate.
          </p>
        </div>

        <ol className="space-y-5">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-5 rounded-[22px] border border-line bg-surface p-6 shadow-sm"
            >
              <span className="font-serif text-3xl text-coral">{s.n}</span>
              <div>
                <h3 className="font-display text-lg font-bold text-ink">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Group gift showcase */}
      <div className="mt-20 grid gap-8 rounded-[28px] border border-line bg-gradient-to-br from-cream-2 to-surface p-8 lg:grid-cols-2 lg:items-center lg:p-12">
        <div>
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-coral">
            <Icons.users size={16} /> Group gifts
          </span>
          <h3 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">
            Everyone chips in. One unforgettable gift.
          </h3>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Start a pool, set a goal, and invite the group. A transparent ledger
            shows who&apos;s in and a deadline keeps it moving — no awkward
            chasing.
          </p>
        </div>

        <GroupGiftCard />
      </div>
    </section>
  );
}

function GroupGiftCard() {
  const raised = 96;
  const goal = 149;
  const pct = Math.round((raised / goal) * 100);
  return (
    <div className="rounded-[24px] border border-line bg-surface p-6 shadow-lg shadow-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold text-ink">
            Sam is leaving for Lisbon 🛫
          </p>
          <p className="text-xs text-ink-faint">organized by Jules · drops Jun 13</p>
        </div>
        <span className="rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral-ink">
          6 of 9 in
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <p className="font-serif text-3xl text-ink">
          ${raised}
          <span className="text-base text-ink-faint"> / ${goal}</span>
        </p>
        <p className="text-sm font-bold text-coral">{pct}%</p>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-cream">
        <div
          className="h-full rounded-full bg-coral"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex -space-x-2">
          <Avatar grad="lilac" label="J" size={30} />
          <Avatar grad="sage" label="T" size={30} />
          <Avatar grad="butter" label="N" size={30} />
          <Avatar grad="rose" label="I" size={30} />
        </div>
        <button className="ml-auto rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream">
          Chip in
        </button>
      </div>
    </div>
  );
}
