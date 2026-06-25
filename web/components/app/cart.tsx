"use client";

// Standalone cart surface — decoupled from the Maxi chat. The same CartContents
// body powers both the quick-glance CartDrawer (opened from the nav cart badge)
// and the full /feed/cart page. Checkout works two ways: a manual "Place order"
// (provider.checkout(), no Maxi needed) or "Ask Maxi to check out" (opens Maxi).
import Link from "next/link";
import { GRADIENTS } from "@/lib/data";
import { Maxi, Icons } from "@/components/ui";
import { useMaxi } from "@/components/app/maxi-provider";

export function CartContents({ variant = "drawer" }: { variant?: "drawer" | "page" }) {
  const { cart, cartTotal, removeItem, checkout, lastOrder, ask, setCartOpen } = useMaxi();

  // Just placed an order (cart cleared) → show the confirmation.
  if (cart.length === 0 && lastOrder) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
          <Icons.check size={34} />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-ink">Order placed!</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {lastOrder.items.length} item{lastOrder.items.length > 1 ? "s" : ""} · ${Math.round(lastOrder.total)}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          Order {lastOrder.id} · simulated checkout, no real charge
        </p>
        <Link
          href="/feed"
          onClick={() => setCartOpen(false)}
          className="mt-6 rounded-full bg-coral px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  // Empty cart.
  if (cart.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-coral-soft text-coral">
          <Icons.cart size={32} />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-ink">Your cart is empty</h2>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">
          Add gifts from the feed or Drops, or ask Maxi to find something in your budget.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/feed"
            onClick={() => setCartOpen(false)}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-coral-soft"
          >
            Browse feed
          </Link>
          <button
            onClick={() => ask("Find me a gift in my budget")}
            className="flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            <Maxi size={18} /> Ask Maxi
          </button>
        </div>
      </div>
    );
  }

  // Cart with items.
  return (
    <div className="flex flex-1 flex-col">
      <div className={`flex-1 overflow-y-auto px-4 py-3 ${variant === "page" ? "space-y-3" : "space-y-2"}`}>
        {cart.map((it) => (
          <div key={it.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
            <span
              className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg text-2xl"
              style={{ background: GRADIENTS[it.grad] }}
            >
              {it.emoji}
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image}
                  alt={it.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{it.name}</p>
              <p className="text-xs text-ink-faint">
                {it.brand} · ${it.price}
                {it.qty > 1 ? ` × ${it.qty}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-ink">${it.price * it.qty}</span>
              <button
                onClick={() => removeItem(it.id)}
                className="text-ink-faint hover:text-coral"
                aria-label={`Remove ${it.name}`}
              >
                <Icons.close size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line bg-surface px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-ink-soft">Total</span>
          <span className="text-lg font-extrabold text-ink">${Math.round(cartTotal)}</span>
        </div>
        <button
          onClick={checkout}
          className="w-full rounded-full bg-coral py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Place order · ${Math.round(cartTotal)}
        </button>
        <button
          onClick={() => ask("checkout")}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-cream py-2.5 text-sm font-bold text-ink transition-colors hover:bg-coral-soft"
        >
          <Maxi size={18} /> Ask Maxi to check out
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-faint">Simulated checkout — no real charge</p>
      </div>
    </div>
  );
}

// Quick-glance slide-in cart drawer (separate from the Maxi chat panel). Opened
// from the nav cart badge; "Full cart" deep-links to the /feed/cart page.
export function CartDrawer() {
  const { cartOpen, setCartOpen, cartCount } = useMaxi();
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-[75] flex w-full max-w-[400px] flex-col border-l border-line bg-cream shadow-2xl transition-transform duration-300 ${
        cartOpen ? "translate-x-0" : "translate-x-full"
      }`}
      role="dialog"
      aria-label="Cart"
      aria-hidden={!cartOpen}
    >
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-coral-soft text-coral">
          <Icons.cart size={20} />
        </span>
        <div className="flex-1">
          <p className="font-bold text-ink">Your cart</p>
          <p className="text-xs text-ink-faint">
            {cartCount} item{cartCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/feed/cart"
          onClick={() => setCartOpen(false)}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral-soft"
        >
          Full cart
        </Link>
        <button
          onClick={() => setCartOpen(false)}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5"
          aria-label="Close cart"
        >
          <Icons.close size={22} />
        </button>
      </header>
      <CartContents variant="drawer" />
    </aside>
  );
}
