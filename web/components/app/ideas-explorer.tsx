"use client";

import { useEffect, useState } from "react";
import { GRADIENTS } from "@/lib/data";
import { Icons } from "@/components/ui";
import {
  fetchIdeas,
  fetchRecipients,
  gradFor,
  categoryLabel,
  recipientEmoji,
  isApiConfigured,
  type Bundle,
  type Idea,
  type RecipientKnowledge,
  type RecipientSummary,
} from "@/lib/ideas";
import { RecipientShopHeader, SoftProfileShopHeader } from "@/components/app/recipient-shop-header";

export function IdeasExplorer({
  initialRecipient,
  recipientId,
  connectionId,
}: { initialRecipient?: string; recipientId?: string; connectionId?: string } = {}) {
  const [recipients, setRecipients] = useState<RecipientSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<RecipientKnowledge | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the recipient picker once, then auto-select the most-discussed one.
  useEffect(() => {
    if (!isApiConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Connect the knowledge API (NEXT_PUBLIC_API_URL) to explore gift ideas.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchRecipients();
        if (cancelled) return;
        setRecipients(list);
        // Prefer the recipient deep-linked from an event banner, if the
        // knowledge base actually has it; otherwise the most-discussed one.
        const want =
          initialRecipient && list.some((r) => r.recipient === initialRecipient)
            ? initialRecipient
            : list[0]?.recipient;
        if (want) setSelected(want);
      } catch {
        if (!cancelled) setError("Couldn't reach the gift-knowledge service.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRecipient]);

  // Fetch ideas + bundles whenever the selected recipient changes.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingIdeas(true);
    (async () => {
      try {
        const kb = await fetchIdeas(selected);
        if (!cancelled) setData(kb);
      } catch {
        if (!cancelled) setError("Couldn't load ideas for this person.");
      } finally {
        if (!cancelled) setLoadingIdeas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <div className="mx-auto max-w-5xl px-3 py-7 sm:px-5">
      {recipientId && <RecipientShopHeader recipientId={recipientId} />}
      {connectionId && !recipientId && <SoftProfileShopHeader connectionId={connectionId} />}

      {/* Heading */}
      {recipientId || connectionId ? (
        <header className="mb-4">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            More ideas people recommend
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Real gift threads from Reddit — browse by relationship if you want more.
          </p>
        </header>
      ) : (
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-semibold text-ink-soft backdrop-blur">
            <Icons.sparkle size={14} className="text-coral" />
            Mined from real Reddit gift discussions
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Who are you shopping for?
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-soft">
            Pick a person to see the gift ideas people actually recommend for them — and the
            combos that get suggested together.
          </p>
        </header>
      )}

      {/* Recipient picker */}
      {error && !recipients ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-sm text-ink-soft">
          {error}
        </p>
      ) : recipients ? (
        <div className="flex flex-wrap gap-2">
          {recipients.map((r) => {
            const active = r.recipient === selected;
            return (
              <button
                key={r.recipient}
                onClick={() => setSelected(r.recipient)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-coral bg-coral text-white shadow-sm"
                    : "border-line bg-surface text-ink hover:bg-ink/5"
                }`}
              >
                <span className="text-base leading-none">{recipientEmoji(r.recipient)}</span>
                {r.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-line" />
          ))}
        </div>
      )}

      {/* Selected recipient knowledge */}
      {selected && (
        <section className="mt-8">
          {loadingIdeas && !data ? (
            <IdeasSkeleton />
          ) : data ? (
            <>
              <div className="mb-5 flex items-baseline gap-2">
                <h2 className="font-display text-2xl font-bold text-ink">
                  Gift ideas for {data.label.toLowerCase()}
                </h2>
                <span className="text-xs font-medium text-ink-faint">
                  from {data.postCount} discussions
                </span>
              </div>

              {data.bundles.length > 0 && <Bundles bundles={data.bundles} />}

              <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-soft">
                <Icons.trend size={16} className="text-coral" /> Most recommended
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.ideas.map((idea, i) => (
                  <IdeaCard key={idea.key} idea={idea} index={i} />
                ))}
              </div>
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}

function Bundles({ bundles }: { bundles: Bundle[] }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-soft">
        <Icons.gift size={16} className="text-coral" /> Bundle them together
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {bundles.map((b, i) => (
          <article
            key={i}
            className="min-w-[230px] shrink-0 rounded-2xl border border-line bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              {b.items.map((it, idx) => (
                <span key={it.key} className="flex items-center gap-2">
                  {idx > 0 && <span className="text-lg font-bold text-ink-faint">+</span>}
                  <span
                    className="grid h-12 w-12 place-items-center rounded-xl text-2xl shadow-sm"
                    style={{ background: GRADIENTS[gradFor(it.key, idx)] }}
                  >
                    {it.emoji}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm font-bold leading-snug text-ink">
              {b.items.map((it) => it.label).join(" + ")}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint">
              <Icons.sparkle size={12} /> {b.why}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function IdeaCard({ idea, index }: { idea: Idea; index: number }) {
  const example = idea.examples.find((e) => e.quote) ?? idea.examples[0];
  const quote = example?.quote;
  const url = example?.url;

  return (
    <article className="hover-lift overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div
        className="relative grid h-24 place-items-center"
        style={{ background: GRADIENTS[gradFor(idea.category, index)] }}
      >
        <span className="text-5xl drop-shadow-sm">{idea.emoji}</span>
        <span className="absolute right-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          {idea.count}× suggested
        </span>
      </div>
      <div className="space-y-2 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-[15px] font-bold text-ink">{idea.label}</h4>
          <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            {categoryLabel(idea.category)}
          </span>
        </div>
        {quote ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl bg-cream/70 p-2.5 transition-colors hover:bg-coral-soft"
          >
            <p className="line-clamp-3 text-[12.5px] italic leading-snug text-ink-soft">
              &ldquo;{quote}&rdquo;
            </p>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-coral">
              From a Reddit thread
              <Icons.arrow size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        ) : (
          <p className="text-[12px] text-ink-faint">
            Suggested across {idea.count} discussion{idea.count === 1 ? "" : "s"}
            {url ? (
              <>
                {" · "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-coral"
                >
                  see thread
                </a>
              </>
            ) : null}
          </p>
        )}
      </div>
    </article>
  );
}

function IdeasSkeleton() {
  return (
    <div>
      <div className="mb-5 h-7 w-56 animate-pulse rounded bg-line" />
      <div className="flex gap-3 overflow-hidden pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 min-w-[230px] animate-pulse rounded-2xl bg-line" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl bg-line" />
        ))}
      </div>
    </div>
  );
}
