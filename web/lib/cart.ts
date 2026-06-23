// Simulated shopping cart, persisted in localStorage. This is a demo cart — no
// real payment/commerce backend. Maxi (agentic shopping) and product cards both
// read/write through these helpers. When a real commerce backend exists, swap
// the load/save functions for API calls and keep the same shapes.
import type { Grad } from "@/lib/data";
import type { Pin } from "@/lib/pins";

export type CartItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  image?: string | null;
  emoji: string;
  grad: Grad;
  qty: number;
};

const KEY = "giftmaxxing_cart";

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore quota errors */
  }
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, it) => sum + it.qty, 0);
}

export function pinToCartItem(pin: Pin): CartItem {
  return {
    id: pin.id,
    name: pin.title.length > 48 ? pin.title.slice(0, 45) + "…" : pin.title,
    brand: pin.brand,
    price: pin.price,
    image: pin.image,
    emoji: pin.emoji,
    grad: pin.grad,
    qty: 1,
  };
}

// Add a pin to a cart array (immutably), incrementing qty if already present.
export function addToCart(items: CartItem[], pin: Pin): CartItem[] {
  const idx = items.findIndex((it) => it.id === pin.id);
  if (idx >= 0) {
    const copy = items.slice();
    copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
    return copy;
  }
  return [...items, pinToCartItem(pin)];
}

export function removeFromCart(items: CartItem[], id: string): CartItem[] {
  return items.filter((it) => it.id !== id);
}
