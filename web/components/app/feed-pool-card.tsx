"use client";

// Compact group-gift pool card interleaved into the main feed. One-tap chip-in
// (writes through the fundraisers localStorage layer) + a link to the full pool.
import Link from "next/link";
import { GRADIENTS } from "@/lib/data";
import { type Fundraiser, raisedOf, progressOf } from "@/lib/fundraisers";
import { USERS } from "@/lib/social";
import { Icons } from "@/components/ui";

export function FeedPoolCard({ f, onChip }: { f: Fundraiser; onChip: (id: string, amount: number) => void }) {
  const raised = raisedOf(f);
  const pct = Math.round(progressOf(f) * 100);
  const funded = raised >= f.goal;
  const recipient = USERS[f.recipient];

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ background: GRADIENTS[f.grad] }}>
          {f.emoji}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            Group gift
            <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[10px] font-bold text-coral-ink">{f.occasion}</span>
          </p>
          <p className="truncate text-xs text-ink-faint">
            {recipient ? `for ${recipient.name} · ` : ""}organized by {f.organizer === "you" ? "you" : USERS[f.organizer]?.name ?? f.organizer}
          </p>
        </div>
        {f.deadline && <span className="ml-auto shrink-0 text-[11px] text-ink-faint">⏳ {f.deadline}</span>}
      </div>

      <div className="relative aspect-[16/9] w-full" style={{ background: GRADIENTS[f.grad] }}>
        <span className="absolute inset-0 grid place-items-center text-5xl">{f.emoji}</span>
        {f.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.image} alt={f.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4">
          <h3 className="font-display text-lg font-extrabold text-white drop-shadow">{f.title}</h3>
        </div>
      </div>

      <div className="p-4">
        <p className="line-clamp-2 text-sm text-ink-soft">{f.blurb}</p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${funded ? "bg-green-500" : "bg-coral"}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="font-bold text-ink">${raised} <span className="font-medium text-ink-faint">of ${f.goal}</span></span>
          <span className="text-ink-soft">{f.contributions.length} in · {pct}%</span>
        </div>

        <div className="mt-3 flex gap-2">
          {funded ? (
            <span className="flex flex-1 items-center justify-center gap-1 rounded-full bg-green-500/10 py-2.5 text-sm font-bold text-green-600">
              <Icons.check size={16} /> Fully funded
            </span>
          ) : (
            <button
              onClick={() => onChip(f.id, 25)}
              className="flex-1 rounded-full bg-coral py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Chip in $25
            </button>
          )}
          <Link href="/feed/pools" className="flex items-center gap-1.5 rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-bold text-ink hover:bg-coral-soft">
            <Icons.users size={16} /> View
          </Link>
        </div>
      </div>
    </article>
  );
}
