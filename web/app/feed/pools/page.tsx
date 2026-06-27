"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GRADIENTS, type Grad } from "@/lib/data";
import { loadPendingPoolJoin, clearPendingPoolJoin } from "@/lib/fundraisers";
import { useCurrentUser } from "@/lib/identity";
import { getMyUserId, isApiConfigured } from "@/lib/api";
import { buildPoolInviteUrl, type PoolInviteSnapshot } from "@/lib/invite";
import {
  type Pool,
  type NewPoolInput,
  fetchMyPools,
  createPool,
  contributeToPool,
  joinPool,
} from "@/lib/pools";
import { ShareSheet } from "@/components/app/share-sheet";
import { PaymentMethodSheet, type PaymentMethod } from "@/components/app/payment-method-sheet";
import { PaymentConfirmDialog } from "@/components/app/payment-confirm-dialog";
import { Icons } from "@/components/ui";

const QUICK = [10, 25, 50, 100];

export default function PoolsPage() {
  const me = useCurrentUser();
  const myName = me.name && me.name !== "You" ? me.name : "You";
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isApiConfigured();

  const refresh = useCallback(async () => {
    const uid = getMyUserId();
    if (!configured || !uid) {
      setPools([]);
      setLoading(false);
      return;
    }
    // Arrived from an invite link → auto-join that pool (idempotent) before listing.
    const pending = loadPendingPoolJoin();
    if (pending?.snapshot?.id) {
      await joinPool(pending.snapshot.id, uid, myName);
      clearPendingPoolJoin();
    }
    const list = await fetchMyPools(uid);
    setPools(list);
    setLoading(false);
  }, [configured, myName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const handleCreate = async (input: NewPoolInput) => {
    const uid = getMyUserId();
    if (!uid) {
      setError("Please sign in to start a group gift.");
      return;
    }
    setError(null);
    const created = await createPool(uid, myName, input);
    if (created) {
      setCreating(false);
      setPools((p) => [created, ...p]);
      router.push(`/feed/pools/${created.poolId}`);
    } else {
      // The create failed even after apiFetch's throttle retries — keep the form
      // open with the user's input and tell them, instead of silently no-op'ing.
      setError("Couldn't save your group gift just now — the server was busy. Please try again.");
    }
  };

  const handleContributed = (poolId: string, raised: number) => {
    setPools((list) => list.map((p) => (p.poolId === poolId ? { ...p, raised } : p)));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Group gifts</h1>
          <p className="mt-1 text-ink-soft">Pool money toward one gift that actually lands. Everyone chips in, chats it out, nobody double-buys.</p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="shrink-0 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {creating ? "Close" : "Start a pool"}
        </button>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-coral/40 bg-coral-soft/60 px-4 py-3 text-sm text-coral-ink">
          <span aria-hidden className="mt-0.5 shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {creating && <CreatePool onCreate={handleCreate} />}

      {!configured ? (
        <p className="py-16 text-center text-sm text-ink-faint">
          Group gifts need a live connection. Try again in a moment.
        </p>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-ink-faint">Loading your group gifts…</p>
      ) : pools.length === 0 ? (
        <EmptyState onStart={() => setCreating(true)} />
      ) : (
        <div className="space-y-5">
          {pools.map((p) => (
            <PoolCard key={p.poolId} pool={p} myName={myName} onContributed={handleContributed} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-coral-soft text-3xl">🎁</div>
      <h2 className="mt-4 font-display text-xl font-extrabold text-ink">No group gifts yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
        Start a pool, share the link, and everyone chips in toward one gift — with a group chat to
        decide together.
      </p>
      <button
        onClick={onStart}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        <Icons.gift size={18} /> Start a pool
      </button>
    </div>
  );
}

function PoolCard({
  pool,
  myName,
  onContributed,
}: {
  pool: Pool;
  myName: string;
  onContributed: (poolId: string, raised: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [raised, setRaised] = useState(pool.raised);
  const pct = pool.goal ? Math.min(100, Math.round((raised / pool.goal) * 100)) : 0;
  const funded = raised >= pool.goal;
  const detailHref = `/feed/pools/${pool.poolId}`;

  // Compact pool snapshot for the invite link — carries the poolId so an external
  // recipient sees the pool before signing in, then joins the real backend pool.
  const snapshot: PoolInviteSnapshot = {
    id: pool.poolId,
    title: pool.title,
    occasion: pool.occasion,
    goal: pool.goal,
    blurb: pool.blurb,
    emoji: pool.emoji,
    grad: pool.grad,
    image: pool.image ?? null,
  };
  const inviteUrl = buildPoolInviteUrl(pool.organizerName || myName, snapshot, {
    senderId: getMyUserId() ?? undefined,
  });
  const shareText = `Chip in with me for "${pool.title}" on Giftmaxxing`;

  const startPayment = (amount: number) => {
    if (amount > 0) {
      setPendingAmount(amount);
      setPaymentOpen(true);
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentOpen(false);
    setConfirmOpen(true);
  };

  const handlePaymentConfirm = async () => {
    const uid = getMyUserId();
    const amount = pendingAmount;
    setConfirmOpen(false);
    setCustom("");
    setOpen(false);
    setPendingAmount(0);
    setSelectedMethod(null);
    if (!uid || !(amount > 0)) return;
    const next = await contributeToPool(pool.poolId, uid, myName, amount);
    const newRaised = next ?? raised + amount;
    setRaised(newRaised);
    onContributed(pool.poolId, newRaised);
  };

  const handlePaymentBack = () => {
    setConfirmOpen(false);
    setPaymentOpen(true);
  };

  const closePaymentFlow = () => {
    setPaymentOpen(false);
    setConfirmOpen(false);
    setPendingAmount(0);
    setSelectedMethod(null);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <Link href={detailHref} className="flex gap-4 p-4 transition-colors hover:bg-cream/60 sm:p-5">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl text-4xl" style={{ background: GRADIENTS[pool.grad] }}>
          {pool.emoji}
          {pool.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pool.image} alt={pool.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-bold text-coral-ink">{pool.occasion}</span>
            {pool.deadline && <span className="text-[11px] text-ink-faint">⏳ {pool.deadline}</span>}
          </div>
          <h3 className="mt-1 font-display text-lg font-extrabold text-ink">{pool.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{pool.blurb}</p>
          <p className="mt-1 text-xs text-ink-faint">
            organized by {pool.organizerId === getMyUserId() ? "you" : pool.organizerName}
          </p>
        </div>
      </Link>

      {/* progress */}
      <div className="px-4 pb-4 sm:px-5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${funded ? "bg-green-500" : "bg-coral"}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-bold text-ink">
            ${raised} <span className="font-medium text-ink-faint">of ${pool.goal}</span>
          </span>
          <span className="text-ink-soft">{pool.memberCount} in · {pct}%</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareSheet
            url={inviteUrl}
            text={shareText}
            subject={`${pool.organizerName || myName} invited you to chip in`}
            recipientName={pool.title}
            triggerLabel="Share to chip in"
            triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-coral-soft"
          />
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-coral-soft"
          >
            <Icons.message size={16} /> Chat
          </Link>
          {funded ? (
            <span className="ml-auto flex items-center gap-1 text-sm font-bold text-green-600"><Icons.check size={16} /> Funded!</span>
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
                <button key={a} onClick={() => startPayment(a)} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold text-ink hover:bg-coral-soft">
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
                <button onClick={() => startPayment(parseInt(custom || "0", 10))} disabled={!custom} className="text-sm font-bold text-coral disabled:opacity-30">
                  Give
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">🧪 Demo Mode — choose a payment method, then confirm. No real charge.</p>
          </div>
        )}

        <PaymentMethodSheet
          open={paymentOpen}
          amount={pendingAmount}
          onSelect={handleMethodSelect}
          onClose={closePaymentFlow}
        />

        {selectedMethod && (
          <PaymentConfirmDialog
            open={confirmOpen}
            amount={pendingAmount}
            method={selectedMethod}
            poolTitle={pool.title}
            onConfirm={handlePaymentConfirm}
            onBack={handlePaymentBack}
            onClose={closePaymentFlow}
          />
        )}
      </div>
    </div>
  );
}

function CreatePool({ onCreate }: { onCreate: (input: NewPoolInput) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("Birthday");
  const [goal, setGoal] = useState("150");
  const [blurb, setBlurb] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    await onCreate({
      title: title.trim(),
      occasion,
      blurb: blurb.trim() || "Let's pool together for something they'll love.",
      goal: parseInt(goal || "0", 10) || 100,
      emoji: OCCASIONS[occasion]?.emoji ?? "🎁",
      grad: OCCASIONS[occasion]?.grad ?? "coral",
    });
    setSubmitting(false);
  };

  return (
    <div className="mb-6 rounded-3xl border border-line bg-surface p-5">
      <h2 className="font-bold text-ink">Start a group gift</h2>
      <div className="mt-3 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the gift? (e.g. Maya's birthday camera)" className="w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-coral" />
        <div className="flex gap-3">
          <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className="flex-1 rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-coral">
            {Object.keys(OCCASIONS).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-cream px-4 py-2.5">
            <span className="text-sm text-ink-faint">Goal $</span>
            <input value={goal} onChange={(e) => setGoal(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-20 bg-transparent text-sm font-bold text-ink outline-none" />
          </div>
        </div>
        <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={2} placeholder="Add a note for contributors…" className="w-full resize-none rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-coral" />
        <button onClick={submit} disabled={!title.trim() || submitting} className="w-full rounded-full bg-coral py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
          {submitting ? "Creating…" : "Create pool"}
        </button>
      </div>
    </div>
  );
}

const OCCASIONS: Record<string, { emoji: string; grad: Grad }> = {
  Birthday: { emoji: "🎂", grad: "rose" },
  Graduation: { emoji: "🎓", grad: "lilac" },
  Wedding: { emoji: "💍", grad: "butter" },
  Farewell: { emoji: "🛫", grad: "sky" },
  "Baby shower": { emoji: "🍼", grad: "sage" },
  Housewarming: { emoji: "🏡", grad: "peach" },
  Anniversary: { emoji: "💞", grad: "coral" },
  "Group gift": { emoji: "🎁", grad: "coral" },
};
