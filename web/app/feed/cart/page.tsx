"use client";

import { CartContents } from "@/components/app/cart";
import { useMaxi } from "@/components/app/maxi-provider";
import { Icons } from "@/components/ui";

export default function CartPage() {
  const { cartCount } = useMaxi();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-coral-soft text-coral">
          <Icons.cart size={24} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Your cart</h1>
          <p className="text-sm text-ink-soft">
            {cartCount} item{cartCount === 1 ? "" : "s"} · simulated checkout, no real charge
          </p>
        </div>
      </header>
      <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-line bg-cream">
        <CartContents variant="page" />
      </div>
    </div>
  );
}
