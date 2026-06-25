"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/ui";
import type { PaymentMethod } from "@/components/app/payment-method-sheet";

export function PaymentConfirmDialog({
  open,
  amount,
  method,
  poolTitle,
  onConfirm,
  onBack,
  onClose,
}: {
  open: boolean;
  amount: number;
  method: PaymentMethod;
  poolTitle: string;
  onConfirm: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset processing state when the dialog re-opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) setProcessing(false); }, [open]);

  const handleConfirm = () => {
    setProcessing(true);
    // Simulate a brief processing delay for realism.
    window.setTimeout(() => {
      onConfirm();
      setProcessing(false);
    }, 800);
  };

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
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-ink-faint transition-colors hover:text-ink"
            aria-label="Back to payment methods"
          >
            <Icons.back size={20} />
          </button>
          <h3 className="font-display text-lg font-extrabold text-ink">
            Confirm contribution
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            <Icons.close size={20} />
          </button>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-line bg-cream p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">Pool</span>
            <span className="text-sm font-bold text-ink">{poolTitle}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-ink-soft">Amount</span>
            <span className="text-lg font-extrabold text-ink">${amount}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-ink-soft">Method</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <span>{method.emoji}</span> {method.label}
            </span>
          </div>
        </div>

        {/* Demo notice */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-2.5">
          <span className="text-base">🧪</span>
          <p className="text-xs leading-snug text-amber-800">
            <span className="font-bold">Demo Mode</span> — Your contribution
            will be recorded locally. No real charge will occur. When a payment
            provider is connected, this flow will process real payments.
          </p>
        </div>

        {/* Card placeholder (only for card method) */}
        {method.id === "card" && (
          <div className="mt-4 space-y-3 rounded-2xl border border-line bg-cream p-4">
            <p className="text-xs font-semibold text-ink-soft">
              Card details (placeholder)
            </p>
            <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-3">
              <p className="text-sm text-ink-faint">
                •••• •••• •••• 4242
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl border border-dashed border-line bg-surface px-4 py-3">
                <p className="text-sm text-ink-faint">MM / YY</p>
              </div>
              <div className="w-24 rounded-xl border border-dashed border-line bg-surface px-4 py-3">
                <p className="text-sm text-ink-faint">CVC</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={processing}
          className="mt-4 w-full rounded-full bg-coral py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {processing ? "Processing…" : `Contribute $${amount}`}
        </button>

        <p className="mt-3 text-center text-[11px] text-ink-faint">
          Simulated transaction — no real payment provider connected yet.
        </p>
      </div>
    </div>
  );
}
