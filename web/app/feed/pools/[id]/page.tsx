"use client";

// Pool detail — the heart of a backend-backed group gift. Everyone who opens it
// is auto-joined (idempotent), can chip in toward the shared goal, see who's in,
// and talk it out in a live group chat. Visiting requires being signed in (this
// route lives under /feed, which is gated by AuthGate).
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GRADIENTS, type Grad } from "@/lib/data";
import { Icons, Maxi } from "@/components/ui";
import { useCurrentUser } from "@/lib/identity";
import { getMyUserId, isApiConfigured, relativeTime } from "@/lib/api";
import {
  type PoolDetail,
  type PoolMessage,
  fetchPool,
  joinPool,
  contributeToPool,
  fetchPoolMessages,
  postPoolMessage,
} from "@/lib/pools";
import { buildPoolInviteUrl, type PoolInviteSnapshot } from "@/lib/invite";
import { ShareSheet } from "@/components/app/share-sheet";
import { PaymentMethodSheet, type PaymentMethod } from "@/components/app/payment-method-sheet";
import { PaymentConfirmDialog } from "@/components/app/payment-confirm-dialog";

const QUICK = [10, 25, 50, 100];
const GRAD_POOL: Grad[] = ["peach", "rose", "butter", "lilac", "sky", "sage", "coral"];

// Stable color per person so avatars are consistent across the chat + member list.
function gradFor(seed: string): Grad {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRAD_POOL[h % GRAD_POOL.length];
}
function initial(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

export default function PoolDetailPage() {
  const params = useParams<{ id: string }>();
  const poolId = params.id;
  const me = useCurrentUser();
  const myName = me.name && me.name !== "You" ? me.name : "You";
  const myUserId = getMyUserId();

  const [data, setData] = useState<PoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = getMyUserId();
      if (!isApiConfigured() || !uid || !poolId) {
        setMissing(true);
        setLoading(false);
        return;
      }
      // Opening a pool you were invited to = joining it (idempotent).
      await joinPool(poolId, uid, myName);
      const detail = await fetchPool(poolId);
      if (cancelled) return;
      if (!detail) setMissing(true);
      else setData(detail);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [poolId, myName]);

  const handleContributed = useCallback(
    (amount: number, raised: number) => {
      setData((d) => {
        if (!d) return d;
        const uid = getMyUserId() ?? "you";
        const contribution = {
          id: `local_${Date.now()}`,
          userId: uid,
          name: myName,
          amount,
          at: Date.now(),
        };
        return {
          ...d,
          pool: { ...d.pool, raised },
          contributions: [contribution, ...d.contributions],
        };
      });
    },
    [myName]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-ink-faint">
        Loading group gift…
      </div>
    );
  }

  if (missing || !data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <Maxi size={56} />
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ink">
          We couldn&apos;t find this group gift
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          The link may be old or the pool was removed. Ask the organizer for a fresh invite.
        </p>
        <Link
          href="/feed/pools"
          className="mt-6 rounded-full bg-coral px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Back to group gifts
        </Link>
      </div>
    );
  }

  const { pool, members, contributions, messages } = data;
  const pct = pool.goal ? Math.min(100, Math.round((pool.raised / pool.goal) * 100)) : 0;
  const funded = pool.raised >= pool.goal;

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
    senderId: myUserId ?? undefined,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/feed/pools"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-ink"
      >
        <Icons.back size={16} /> Group gifts
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="relative aspect-[16/9] w-full" style={{ background: GRADIENTS[pool.grad] }}>
          <span className="absolute inset-0 grid place-items-center text-6xl">{pool.emoji}</span>
          {pool.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pool.image}
              alt={pool.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4">
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-coral-ink">
              {pool.occasion}
            </span>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-white drop-shadow sm:text-3xl">
              {pool.title}
            </h1>
          </div>
        </div>

        <div className="p-5">
          {pool.blurb && <p className="text-sm text-ink-soft">{pool.blurb}</p>}
          <p className="mt-1.5 text-xs text-ink-faint">
            organized by {pool.organizerId === myUserId ? "you" : pool.organizerName}
          </p>

          {/* Progress */}
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${funded ? "bg-green-500" : "bg-coral"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-bold text-ink">
              ${pool.raised} <span className="font-medium text-ink-faint">of ${pool.goal}</span>
            </span>
            <span className="text-ink-soft">
              {pool.memberCount} in · {pct}%
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ContributeButton
              pool={pool}
              myName={myName}
              funded={funded}
              onContributed={handleContributed}
            />
            <ShareSheet
              url={inviteUrl}
              text={`Chip in with me for "${pool.title}" on Giftmaxxing`}
              subject={`${pool.organizerName || myName} invited you to chip in`}
              recipientName={pool.title}
              triggerLabel="Share to chip in"
              triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-coral-soft"
            />
          </div>
          <p className="mt-3 text-[11px] text-ink-faint">
            🧪 Demo Mode — Giftmaxxing coordinates the gift but never holds money or splits the
            cost.{" "}
            <Link href="/privacy#group-gifts" className="underline hover:text-ink">
              How group gifts work
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Members + contributions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <Icons.users size={18} /> In this pool
          </h2>
          <ul className="mt-3 space-y-2.5">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: GRADIENTS[gradFor(m.userId)] }}
                >
                  {initial(m.name)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {m.userId === myUserId ? "You" : m.name}
                </span>
                {m.role === "organizer" && (
                  <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[10px] font-bold text-coral-ink">
                    organizer
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <Icons.gift size={18} /> Chipped in
          </h2>
          {contributions.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">Be the first to chip in ✨</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {contributions.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-ink">
                    {c.userId === myUserId ? "You" : c.name}
                  </span>
                  <span className="shrink-0 font-bold text-ink">${c.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Group chat */}
      <GroupChat
        poolId={pool.poolId}
        initialMessages={messages}
        myUserId={myUserId}
        myName={myName}
      />
    </div>
  );
}

// ── Chip-in (payment flow) ───────────────────────────────────────────────────
function ContributeButton({
  pool,
  myName,
  funded,
  onContributed,
}: {
  pool: PoolDetail["pool"];
  myName: string;
  funded: boolean;
  onContributed: (amount: number, raised: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const startPayment = (amount: number) => {
    if (amount > 0) {
      setPendingAmount(amount);
      setPaymentOpen(true);
    }
  };
  const closeFlow = () => {
    setPaymentOpen(false);
    setConfirmOpen(false);
    setPendingAmount(0);
    setSelectedMethod(null);
  };
  const confirm = async () => {
    const uid = getMyUserId();
    const amount = pendingAmount;
    setConfirmOpen(false);
    setOpen(false);
    setCustom("");
    setPendingAmount(0);
    setSelectedMethod(null);
    if (!uid || !(amount > 0)) return;
    const raised = await contributeToPool(pool.poolId, uid, myName, amount);
    onContributed(amount, raised ?? pool.raised + amount);
  };

  if (funded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-5 py-2.5 text-sm font-bold text-green-700">
        <Icons.check size={16} /> Goal reached!
      </span>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-coral px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Chip in
        </button>
      </div>

      {open && (
        <div className="w-full rounded-2xl border border-line bg-cream p-3">
          <p className="mb-2 text-xs font-semibold text-ink-soft">How much would you like to chip in?</p>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((a) => (
              <button
                key={a}
                onClick={() => startPayment(a)}
                className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold text-ink hover:bg-coral-soft"
              >
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
              <button
                onClick={() => startPayment(parseInt(custom || "0", 10))}
                disabled={!custom}
                className="text-sm font-bold text-coral disabled:opacity-30"
              >
                Give
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentMethodSheet
        open={paymentOpen}
        amount={pendingAmount}
        onSelect={(m) => {
          setSelectedMethod(m);
          setPaymentOpen(false);
          setConfirmOpen(true);
        }}
        onClose={closeFlow}
      />
      {selectedMethod && (
        <PaymentConfirmDialog
          open={confirmOpen}
          amount={pendingAmount}
          method={selectedMethod}
          poolTitle={pool.title}
          onConfirm={confirm}
          onBack={() => {
            setConfirmOpen(false);
            setPaymentOpen(true);
          }}
          onClose={closeFlow}
        />
      )}
    </>
  );
}

// ── Live group chat ──────────────────────────────────────────────────────────
function GroupChat({
  poolId,
  initialMessages,
  myUserId,
  myName,
}: {
  poolId: string;
  initialMessages: PoolMessage[];
  myUserId: string | null;
  myName: string;
}) {
  const [messages, setMessages] = useState<PoolMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const lastAtRef = useRef<number>(
    initialMessages.length ? initialMessages[initialMessages.length - 1].at : 0
  );
  const seenIds = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const merge = useCallback((incoming: PoolMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const next = [...prev];
      let changed = false;
      for (const m of incoming) {
        if (seenIds.current.has(m.id)) continue;
        seenIds.current.add(m.id);
        next.push(m);
        changed = true;
        if (m.at > lastAtRef.current) lastAtRef.current = m.at;
      }
      if (!changed) return prev;
      next.sort((a, b) => a.at - b.at);
      return next;
    });
  }, []);

  // Poll for new messages every 4s (HTTP API — no websockets).
  useEffect(() => {
    let active = true;
    const tick = async () => {
      const newer = await fetchPoolMessages(poolId, lastAtRef.current || undefined);
      if (active) merge(newer);
    };
    const iv = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [poolId, merge]);

  // Keep the latest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || !myUserId || sending) return;
    setSending(true);
    setText("");
    const msg = await postPoolMessage(poolId, myUserId, myName, t);
    if (msg) merge([msg]);
    else setText(t); // restore on failure so the user can retry
    setSending(false);
  };

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <Icons.message size={18} /> Group chat
        </h2>
        <p className="text-xs text-ink-faint">Talk it out — agree on the gift before anyone buys.</p>
      </div>

      <div className="max-h-[50vh] min-h-[220px] space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-faint">No messages yet. Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = !!myUserId && m.userId === myUserId;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: GRADIENTS[gradFor(m.userId)] }}
                >
                  {initial(m.name)}
                </span>
                <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
                  <p className="text-[11px] text-ink-faint">
                    {mine ? "You" : m.name} · {relativeTime(m.at)}
                  </p>
                  <p
                    className={`mt-0.5 inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-coral text-white" : "bg-cream text-ink"
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message the group…"
          maxLength={1000}
          className="flex-1 rounded-full border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-coral"
        />
        <button
          onClick={() => void send()}
          disabled={!text.trim() || sending}
          aria-label="Send message"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Icons.arrow size={18} />
        </button>
      </div>
    </div>
  );
}
