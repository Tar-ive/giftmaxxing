"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GRADIENTS, type Grad } from "@/lib/data";
import { loadPendingPoolJoin, clearPendingPoolJoin } from "@/lib/fundraisers";
import { useCurrentUser } from "@/lib/identity";
import { getMyUserId, isApiConfigured, fetchConnections, type SoftConnection } from "@/lib/api";
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
import { Icons, Maxi } from "@/components/ui";
import { loadLocalConnections, LOCAL_CONN_EVENT } from "@/lib/local-connections";
import { PINS } from "@/lib/pins";
import { shortTitle } from "@/lib/feed-builder";
import { GENDER_PREF_META, type GenderPref } from "@/lib/gender-prefs";
import { addToCart, loadCart, saveCart } from "@/lib/cart";
import type { Pin } from "@/lib/pins";

const QUICK = [10, 25, 50, 100];

// Build a Maxi gift bundle from seeds stored in a connection's soft profile
function buildMaxiBundle(conn: SoftConnection) {
  const seeds = conn.seeds ?? [];
  if (!seeds.length) return [] as typeof PINS;
  const pinMap = new Map(PINS.map((p) => [p.id, p]));
  const bundle = seeds.map((s) => pinMap.get(s)).filter((p): p is (typeof PINS)[number] => !!p);
  if (bundle.length) return bundle.slice(0, 6);
  // Fallback: pick items based on vibes/category matching
  const vibes = conn.vibes ?? [];
  return PINS.filter((p) => vibes.some((v) => p.category === v || p.title.toLowerCase().includes(v)))
    .slice(0, 6);
}

// Estimated delivery days based on price tier
function estimatedDeliveryDays(price: number): number {
  if (price > 200) return 7;
  if (price > 100) return 5;
  return 3;
}

function daysUntilDate(dateStr?: string): number | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

type Tab = "solo" | "group";

export default function PoolsPage() {
  const me = useCurrentUser();
  const myName = me.name && me.name !== "You" ? me.name : "You";
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("solo");
  const [soloGifts, setSoloGifts] = useState<SoftConnection[]>([]);
  const configured = isApiConfigured();

  // Load solo gifts (completed challenge connections)
  useEffect(() => {
    const uid = getMyUserId();
    let cancelled = false;

    const load = async () => {
      let apiConns: SoftConnection[] = [];
      if (uid && configured) {
        try {
          const { items } = await fetchConnections(uid);
          apiConns = items;
        } catch {
          // backend not available
        }
      }
      const localConns = loadLocalConnections();
      const apiIds = new Set(apiConns.map((c) => c.connectionId));
      const merged = [
        ...apiConns,
        ...localConns.filter((c) => !apiIds.has(c.connectionId)),
      ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      if (!cancelled) setSoloGifts(merged);
    };

    void load();
    const onLocal = () => void load();
    window.addEventListener(LOCAL_CONN_EVENT, onLocal);
    return () => {
      cancelled = true;
      window.removeEventListener(LOCAL_CONN_EVENT, onLocal);
    };
  }, [configured]);

  const refresh = useCallback(async () => {
    const uid = getMyUserId();
    if (!configured || !uid) {
      setPools([]);
      setLoading(false);
      return;
    }
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
          <h1 className="font-display text-3xl font-extrabold text-ink">Gifts</h1>
          <p className="mt-1 text-ink-soft">Your gift ideas from completed challenges and group pools.</p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="shrink-0 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {creating ? "Close" : "Start a pool"}
        </button>
      </header>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-line bg-cream p-1">
        <button
          onClick={() => setTab("solo")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === "solo" ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
          }`}
        >
          Solo Gifts {soloGifts.length > 0 && <span className="ml-1 rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-white">{soloGifts.length}</span>}
        </button>
        <button
          onClick={() => setTab("group")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === "group" ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
          }`}
        >
          Group Gifts {pools.length > 0 && <span className="ml-1 rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-white">{pools.length}</span>}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-coral/40 bg-coral-soft/60 px-4 py-3 text-sm text-coral-ink">
          <span aria-hidden className="mt-0.5 shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {creating && <CreatePool onCreate={handleCreate} />}

      {/* Solo gifts tab */}
      {tab === "solo" && (
        <div className="space-y-5">
          {soloGifts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-coral-soft text-3xl">🎁</div>
              <h2 className="mt-4 font-display text-xl font-extrabold text-ink">No solo gifts yet</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
                Share a swipe challenge with someone. When they finish, Maxi builds a gift bundle here.
              </p>
              <Link
                href="/challenge"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <Icons.share size={18} /> Share a challenge
              </Link>
            </div>
          ) : (
            soloGifts.map((conn) => (
              <SoloGiftCard key={conn.connectionId} conn={conn} />
            ))
          )}
        </div>
      )}

      {/* Group gifts tab */}
      {tab === "group" && (
        <>
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
        </>
      )}
    </div>
  );
}

// Solo gift card — shows Maxi's bundle from a completed swipe challenge
function SoloGiftCard({ conn }: { conn: SoftConnection }) {
  const router = useRouter();
  const bundle = buildMaxiBundle(conn);
  const daysLeft = daysUntilDate(conn.birthday);
  const genderLabel = conn.genderPref && conn.genderPref in GENDER_PREF_META
    ? GENDER_PREF_META[conn.genderPref as GenderPref].label
    : null;
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Derive top category from bundle for "Browse similar" navigation
  const topCategory = (() => {
    const counts = new Map<string, number>();
    for (const p of bundle) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    let best = "";
    let max = 0;
    for (const [cat, n] of counts) {
      if (n > max) { best = cat; max = n; }
    }
    return best;
  })();

  const handleAddToCart = (pin: Pin) => {
    const cart = loadCart();
    const updated = addToCart(cart, pin);
    saveCart(updated);
    setAddedIds((prev) => new Set(prev).add(pin.id));
  };

  const handleAddAll = () => {
    let cart = loadCart();
    for (const pin of bundle) {
      if (!addedIds.has(pin.id)) {
        cart = addToCart(cart, pin);
      }
    }
    saveCart(cart);
    setAddedIds(new Set(bundle.map((p) => p.id)));
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral text-lg text-white">
          🎁
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-extrabold text-ink">{conn.guestName}</h3>
            {genderLabel && (
              <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{genderLabel}</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            Completed swipe challenge · {conn.yesCount ?? 0} likes across {conn.totalSwipes ?? 0} swipes
          </p>
          {conn.birthday && (
            <p className="mt-1 text-xs text-ink-faint">
              🎂 {conn.birthday}
              {daysLeft !== null && daysLeft > 0 && (
                <span className="ml-1 font-semibold text-coral"> · {daysLeft} days away</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Maxi bundle suggestion */}
      {bundle.length > 0 && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center gap-2">
            <Maxi size={20} />
            <p className="text-xs font-bold text-ink">
              Maxi&apos;s picks based on {conn.guestName}&apos;s swipes
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {bundle.map((pin) => {
              const deliveryDays = estimatedDeliveryDays(pin.price);
              const canDeliver = daysLeft === null || deliveryDays <= daysLeft;
              return (
                <div
                key={pin.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-line bg-cream transition-shadow hover:shadow-md"
                onClick={() => { if (pin.url) window.open(pin.url, "_blank", "noopener"); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && pin.url) window.open(pin.url, "_blank", "noopener"); }}
              >
                  <div className="relative aspect-square w-full" style={{ background: GRADIENTS[pin.grad] }}>
                    <span className="absolute inset-0 grid place-items-center text-2xl">{pin.emoji}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pin.image}
                      alt={pin.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    {!canDeliver && (
                      <span className="absolute right-1 top-1 rounded bg-red-500/90 px-1 py-0.5 text-[9px] font-bold text-white">
                        Late
                      </span>
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="line-clamp-1 text-[10px] font-semibold text-ink">{shortTitle(pin.title)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-ink">${pin.price}</span>
                      <span className="text-[9px] text-ink-faint">{deliveryDays}d ship</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(pin); }}
                      disabled={addedIds.has(pin.id)}
                      className="mt-1 w-full rounded-md bg-coral px-1 py-0.5 text-[9px] font-bold text-white transition-opacity hover:opacity-90 disabled:bg-ink-faint disabled:opacity-60"
                    >
                      {addedIds.has(pin.id) ? "Added" : "+ Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {daysLeft !== null && daysLeft > 0 && (
            <p className="mt-2 text-[11px] text-ink-faint">
              📦 Items marked ship within the {conn.birthday} deadline. Ones marked &ldquo;Late&rdquo; may not arrive in time.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAddAll}
              disabled={addedIds.size === bundle.length}
              className="flex-1 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {addedIds.size === bundle.length ? "All added to cart ✓" : "Add all to cart"}
            </button>
            <button
              onClick={() => router.push(`/feed/shop${topCategory ? `?category=${encodeURIComponent(topCategory)}` : ""}`)}
              className="flex-1 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-bold text-ink transition-opacity hover:opacity-90"
            >
              Browse similar
            </button>
          </div>
        </div>
      )}

      {/* Vibes tags */}
      {(conn.vibes?.length ?? 0) > 0 && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Gift vibes</p>
          <div className="flex flex-wrap gap-1.5">
            {conn.vibes?.map((v) => (
              <span key={v} className="rounded-full bg-coral-soft px-2.5 py-1 text-[11px] font-semibold text-coral-ink capitalize">{v}</span>
            ))}
          </div>
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
