"use client";

import { useEffect } from "react";
import { Icons } from "@/components/ui";

export type PaymentMethodId =
  | "card"
  | "apple_pay"
  | "google_pay"
  | "venmo"
  | "paypal";

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  emoji: string;
  enabled: boolean;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "card", label: "Credit / Debit card", emoji: "💳", enabled: true },
  { id: "apple_pay", label: "Apple Pay", emoji: "🍎", enabled: false },
  { id: "google_pay", label: "Google Pay", emoji: "🔵", enabled: false },
  { id: "venmo", label: "Venmo", emoji: "💙", enabled: false },
  { id: "paypal", label: "PayPal", emoji: "🅿️", enabled: false },
];

export function PaymentMethodSheet({
  open,
  amount,
  onSelect,
  onClose,
}: {
  open: boolean;
  amount: number;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-ink">
            Payment method
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            <Icons.close size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-ink-soft">
          Choose how to contribute{" "}
          <span className="font-bold text-ink">${amount}</span>
        </p>

        {/* Demo banner */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-2.5">
          <span className="text-base">🧪</span>
          <p className="text-xs leading-snug text-amber-800">
            <span className="font-bold">Demo Mode</span> — No real payment is
            processed. This UI is a scaffold for a future payment integration.
          </p>
        </div>

        <div className="space-y-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-cream px-4 py-3.5 text-left transition-colors hover:bg-coral-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-xl">
                {m.emoji}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-ink">
                  {m.label}
                </span>
                {!m.enabled && (
                  <span className="text-[11px] text-ink-faint">
                    Coming soon
                  </span>
                )}
              </span>
              {!m.enabled && (
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink-faint">
                  Soon
                </span>
              )}
              {m.enabled && (
                <Icons.chevronR
                  size={18}
                  className="shrink-0 text-ink-faint"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
