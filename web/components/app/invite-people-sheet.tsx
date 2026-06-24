"use client";

// One sheet to invite people to a group gift — both ways the user asked for:
//   1. "On Giftmaxxing"  → invite friends in-app (writes to the pool's invited[])
//   2. "Or share a link" → copy / email / SMS / WhatsApp / Instagram / native share
// Anyone who opens the link must sign in and agree to the terms before they can
// chip in (handled by the /invite landing). We never touch payments or splits —
// stated in the footer here and on every auth surface.
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icons } from "@/components/ui";
import { GRADIENTS } from "@/lib/data";
import { USERS } from "@/lib/social";

const enc = encodeURIComponent;

export function InvitePeopleSheet({
  open,
  onClose,
  url,
  poolTitle,
  invited,
  contributorIds,
  onInviteFriend,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  poolTitle: string;
  invited: string[];
  contributorIds: string[];
  onInviteFriend: (userId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  // Detect Web Share API without setState-in-effect (avoids hydration drift).
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false
  );

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const text = `Chip in with me for "${poolTitle}" on Giftmaxxing`;
  const msg = `${text} ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "Giftmaxxing group gift", text, url });
      onClose();
    } catch {
      /* dismissed */
    }
  };

  const instagram = async () => {
    await copy();
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const channels: { key: string; label: string; emoji: string; href: string; external?: boolean }[] = [
    { key: "email", label: "Email", emoji: "✉️", href: `mailto:?subject=${enc("Chip in for a group gift")}&body=${enc(msg)}` },
    { key: "sms", label: "Messages", emoji: "💬", href: `sms:?&body=${enc(msg)}` },
    { key: "whatsapp", label: "WhatsApp", emoji: "🟢", href: `https://wa.me/?text=${enc(msg)}`, external: true },
  ];

  const friends = Object.values(USERS).filter((u) => u.id !== "you");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-ink">Invite people to chip in</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            <Icons.close size={20} />
          </button>
        </div>
        <p className="mb-4 truncate text-xs text-ink-faint">{poolTitle}</p>

        {/* 1. In-app friends */}
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          On Giftmaxxing
        </p>
        <div className="space-y-1.5">
          {friends.map((u) => {
            const joined = contributorIds.includes(u.id);
            const isInvited = invited.includes(u.id);
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-cream px-3 py-2"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: GRADIENTS[u.grad] }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  <p className="truncate text-[11px] text-ink-faint">@{u.handle}</p>
                </div>
                {joined ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-600">
                    <Icons.check size={13} /> Joined
                  </span>
                ) : (
                  <button
                    onClick={() => onInviteFriend(u.id)}
                    disabled={isInvited}
                    className={
                      isInvited
                        ? "rounded-full bg-coral-soft px-3.5 py-1.5 text-xs font-bold text-coral-ink"
                        : "rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-cream transition-opacity hover:opacity-90"
                    }
                  >
                    {isInvited ? "Invited" : "Invite"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 2. Share a link */}
        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          Or share a link
        </p>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5">
          <span className="truncate text-sm text-ink-soft">{url}</span>
          <button
            onClick={copy}
            className="ml-auto shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-cream transition-opacity hover:opacity-90"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Tile emoji="🔗" label={copied ? "Copied" : "Copy"} onClick={copy} />
          {channels.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-cream py-3 transition-colors hover:bg-coral-soft"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-xl">
                {c.emoji}
              </span>
              <span className="text-[11px] font-semibold text-ink">{c.label}</span>
            </a>
          ))}
          <Tile emoji="📸" label="Instagram" onClick={instagram} />
          {canNativeShare && <Tile emoji="⤴️" label="More" onClick={nativeShare} />}
        </div>

        {/* Disclaimer — payments / splits are on the people, not Giftmaxxing. */}
        <p className="mt-4 rounded-2xl bg-cream p-3 text-[11px] leading-relaxed text-ink-faint">
          Anyone you invite signs in and agrees to our terms before they can chip in.
          Giftmaxxing{" "}
          <strong className="font-semibold text-ink-soft">
            doesn&apos;t process payments or manage how you split the cost
          </strong>{" "}
          — that&apos;s handled directly between you and your group.{" "}
          <a href="/privacy#group-gifts" className="underline hover:text-ink">
            Learn more
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function Tile({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-cream py-3 transition-colors hover:bg-coral-soft"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-xl">
        {emoji}
      </span>
      <span className="text-[11px] font-semibold text-ink">{label}</span>
    </button>
  );
}
