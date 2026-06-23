"use client";

import { useEffect, useState } from "react";
import { GRADIENTS } from "@/lib/data";
import {
  type Fundraiser,
  loadFundraisers,
  saveFundraisers,
  addContribution,
  newFundraiser,
  raisedOf,
  progressOf,
} from "@/lib/fundraisers";
import { USERS } from "@/lib/social";
import { useCurrentUser } from "@/lib/identity";
import { Icons } from "@/components/ui";

const QUICK = [10, 25, 50, 100];

export default function PoolsPage() {
  const me = useCurrentUser();
  const myName = me.name !== "You" ? me.name.split(/\s+/)[0] : "you";
  const [pools, setPools] = useState<Fundraiser[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPools(loadFundraisers());
  }, []);

  const persist = (list: Fundraiser[]) => {
    setPools(list);
    saveFundraisers(list);
  };

  const contribute = (id: string, amount: number) => {
    persist(addContribution(pools, id, myName, amount));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Group gifts</h1>
          <p className="mt-1 text-ink-soft">Pool money toward one gift that actually lands. Everyone chips in, nobody double-buys.</p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="shrink-0 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {creating ? "Close" : "Start a pool"}
        </button>
      </header>

      {creating && <CreatePool onCreate={(f) => { persist([f, ...pools]); setCreating(false); }} organizer={myName} />}

      <div className="space-y-5">
        {pools.map((f) => (
          <PoolCard key={f.id} f={f} onContribute={contribute} />
        ))}
        {pools.length === 0 && (
          <p className="py-16 text-center text-sm text-ink-faint">No pools yet. Start the first one ✨</p>
        )}
      </div>
    </div>
  );
}

function PoolCard({ f, onContribute }: { f: Fundraiser; onContribute: (id: string, amount: number) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const raised = raisedOf(f);
  const pct = Math.round(progressOf(f) * 100);
  const recipient = USERS[f.recipient];
  const funded = raised >= f.goal;

  const give = (amount: number) => {
    if (amount > 0) {
      onContribute(f.id, amount);
      setCustom("");
      setOpen(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl text-4xl" style={{ background: GRADIENTS[f.grad] }}>
          {f.emoji}
          {f.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.image} alt={f.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-bold text-coral-ink">{f.occasion}</span>
            {f.deadline && <span className="text-[11px] text-ink-faint">⏳ {f.deadline}</span>}
          </div>
          <h3 className="mt-1 font-display text-lg font-extrabold text-ink">{f.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{f.blurb}</p>
          {recipient && (
            <p className="mt-1 text-xs text-ink-faint">for {recipient.name} · organized by {f.organizer === "you" ? "you" : USERS[f.organizer]?.name ?? f.organizer}</p>
          )}
        </div>
      </div>

      {/* progress */}
      <div className="px-4 pb-4 sm:px-5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${funded ? "bg-green-500" : "bg-coral"}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-bold text-ink">
            ${raised} <span className="font-medium text-ink-faint">of ${f.goal}</span>
          </span>
          <span className="text-ink-soft">{f.contributions.length} contributor{f.contributions.length === 1 ? "" : "s"} · {pct}%</span>
        </div>

        {/* contributor avatars */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex -space-x-2">
            {f.contributions.slice(-5).map((c) => {
              const cu = USERS[c.name];
              return (
                <span key={c.id} title={`${c.name} · $${c.amount}`} className="grid h-7 w-7 place-items-center rounded-full border-2 border-surface text-[11px] font-bold text-white" style={{ background: GRADIENTS[cu?.grad ?? "coral"] }}>
                  {(cu?.name ?? c.name).charAt(0).toUpperCase()}
                </span>
              );
            })}
          </div>
          {funded ? (
            <span className="ml-auto flex items-center gap-1 text-sm font-bold text-green-600"><Icons.check size={16} /> Fully funded!</span>
          ) : (
            <button onClick={() => setOpen((o) => !o)} className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-bold text-cream transition-opacity hover:opacity-90">
              Chip in
            </button>
          )}
        </div>

        {open && !funded && (
          <div className="mt-3 rounded-2xl border border-line bg-cream p-3">
            <p className="mb-2 text-xs font-semibold text-ink-soft">How much would you like to chip in?</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((a) => (
                <button key={a} onClick={() => give(a)} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold text-ink hover:bg-coral-soft">
                  ${a}
                </button>
              ))}
              <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1">
                <span className="text-sm text-ink-faint">$</span>
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="custom"
                  inputMode="numeric"
                  className="w-16 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
                <button onClick={() => give(parseInt(custom || "0", 10))} disabled={!custom} className="text-sm font-bold text-coral disabled:opacity-30">
                  Give
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">Simulated — no real payment is processed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePool({ onCreate, organizer }: { onCreate: (f: Fundraiser) => void; organizer: string }) {
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("Birthday");
  const [goal, setGoal] = useState("150");
  const [blurb, setBlurb] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onCreate(
      newFundraiser({
        title: title.trim(),
        occasion,
        blurb: blurb.trim() || "Let's pool together for something they'll love.",
        goal: parseInt(goal || "0", 10) || 100,
        organizer,
        emoji: OCCASION_EMOJI[occasion] ?? "🎁",
      })
    );
  };

  return (
    <div className="mb-6 rounded-3xl border border-line bg-surface p-5">
      <h2 className="font-bold text-ink">Start a group gift</h2>
      <div className="mt-3 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the gift? (e.g. Maya's birthday camera)" className="w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-coral" />
        <div className="flex gap-3">
          <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className="flex-1 rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-coral">
            {Object.keys(OCCASION_EMOJI).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-cream px-4 py-2.5">
            <span className="text-sm text-ink-faint">Goal $</span>
            <input value={goal} onChange={(e) => setGoal(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-20 bg-transparent text-sm font-bold text-ink outline-none" />
          </div>
        </div>
        <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={2} placeholder="Add a note for contributors…" className="w-full resize-none rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-coral" />
        <button onClick={submit} disabled={!title.trim()} className="w-full rounded-full bg-coral py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
          Create pool
        </button>
      </div>
    </div>
  );
}

const OCCASION_EMOJI: Record<string, string> = {
  Birthday: "🎂",
  Graduation: "🎓",
  Wedding: "💍",
  Farewell: "🛫",
  "Baby shower": "🍼",
  Housewarming: "🏡",
  Anniversary: "💞",
  "Group gift": "🎁",
};
