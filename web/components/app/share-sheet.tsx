"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icons } from "@/components/ui";

// Wispr-style share sheet: one tap opens a bottom sheet (mobile) / dialog
// (desktop) with copy-link + every easy channel. Instagram has no web
// link-share intent, so we copy the link and open IG for pasting into a DM/story.

const enc = encodeURIComponent;

export function ShareSheet({
  url,
  text,
  title = "Giftmaxxing",
  subject = "Find me the perfect gift",
  triggerLabel = "Share the challenge",
  triggerClassName,
  note,
}: {
  url: string;
  text: string;
  title?: string;
  subject?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  note?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Detect the Web Share API without a setState-in-effect (avoids hydration
  // drift): server snapshot is false, client snapshot reflects real capability.
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
      await navigator.share({ title, text, url });
      setOpen(false);
    } catch {
      /* dismissed */
    }
  };

  const instagram = async () => {
    await copy();
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const msg = `${text} ${url}`;
  const links: { key: string; label: string; emoji: string; href: string; external?: boolean }[] = [
    { key: "email", label: "Email", emoji: "✉️", href: `mailto:?subject=${enc(subject)}&body=${enc(msg)}` },
    { key: "sms", label: "Messages", emoji: "💬", href: `sms:?&body=${enc(msg)}` },
    { key: "whatsapp", label: "WhatsApp", emoji: "🟢", href: `https://wa.me/?text=${enc(msg)}`, external: true },
    { key: "x", label: "X", emoji: "𝕏", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, external: true },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-coral/25 transition-opacity hover:opacity-90"
        }
      >
        <Icons.share size={16} /> {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-ink">
                Share your gift challenge
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-ink-faint transition-colors hover:text-ink"
              >
                <Icons.close size={20} />
              </button>
            </div>

            {/* Link preview + copy */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5">
              <span className="truncate text-sm text-ink-soft">{url}</span>
              <button
                onClick={copy}
                className="ml-auto shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-cream transition-opacity hover:opacity-90"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Channels */}
            <div className="grid grid-cols-4 gap-2">
              <Tile emoji="🔗" label={copied ? "Copied" : "Copy link"} onClick={copy} />
              {links.map((l) => (
                <a
                  key={l.key}
                  href={l.href}
                  target={l.external ? "_blank" : undefined}
                  rel={l.external ? "noopener noreferrer" : undefined}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-cream py-3 transition-colors hover:bg-coral-soft"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-xl">
                    {l.emoji}
                  </span>
                  <span className="text-[11px] font-semibold text-ink">{l.label}</span>
                </a>
              ))}
              <Tile emoji="📸" label="Instagram" onClick={instagram} />
              {canNativeShare && <Tile emoji="⤴️" label="More" onClick={nativeShare} />}
            </div>

            {note && (
              <div className="mt-4 text-[11px] leading-relaxed text-ink-faint">{note}</div>
            )}
          </div>
        </div>
      )}
    </>
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
