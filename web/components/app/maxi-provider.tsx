"use client";

// App-wide Maxi: floating launcher + slide-over panel with chat, voice
// (Web Speech API), a simulated cart, and agentic checkout. Mounted once in the
// feed layout so Maxi (and the cart) are available on every page and can be
// triggered from anywhere (e.g. "@maxi" mentions) via the useMaxi() hook.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { GRADIENTS, type Grad } from "@/lib/data";
import { PINS, type Pin } from "@/lib/pins";
import { loadProfile } from "@/lib/onboarding";
import { visualSearch } from "@/lib/visual-search";
import {
  type CartItem,
  loadCart,
  saveCart,
  cartTotal as calcTotal,
  cartCount as calcCount,
  addToCart as addPinToCartArr,
  removeFromCart,
} from "@/lib/cart";
import { respond, type MaxiReply } from "@/lib/maxi";
import { productAmazonUrl, AFFILIATE_REL } from "@/lib/affiliate";
import { hiResImage } from "@/lib/images";
import { askMaxi, getMyUserId, type MaxiAgentProduct, type MaxiStep } from "@/lib/api";
import { Maxi, Icons } from "@/components/ui";

type Msg = {
  id: string;
  from: "maxi" | "you";
  text: string;
  imageUrl?: string; // object-URL preview of an uploaded photo
  pins?: Pin[];
  chips?: string[];
  source?: string;
  steps?: MaxiStep[]; // agent reasoning "layers" (scan orders -> deals -> …)
  products?: MaxiAgentProduct[]; // raw agent products (carry deal metadata)
};

type Order = { id: string; items: CartItem[]; total: number };

type MaxiStore = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  messages: Msg[];
  sending: boolean;
  send: (text: string) => void;
  ask: (text: string) => void; // open the panel + send (for @maxi mentions)
  commentReply: (query: string, contextName?: string) => Promise<string>; // inline @maxi reply (no panel)
  searchByImage: (file: File) => void; // visual search from an uploaded photo
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addPinToCart: (pin: Pin) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  lastOrder: Order | null;
  checkout: () => void;
};

const Ctx = createContext<MaxiStore | null>(null);

export function useMaxi() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMaxi must be used within <MaxiProvider>");
  return v;
}

function deriveVibes(): { vibes: string[]; name?: string } {
  const p = loadProfile();
  if (!p) return { vibes: [] };
  const vibes = [...(p.interests ?? []), ...(p.materialisticCategories ?? [])].map((s) =>
    String(s).toLowerCase()
  );
  return { vibes, name: p.name.trim().split(/\s+/)[0] };
}

let MID = 0;
const mkId = () => `m${Date.now()}_${MID++}`;

const GRAD_KEYS = Object.keys(GRADIENTS) as Grad[];
function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
// Render a visual-search hit that isn't in the bundled pin set as a Pin card
// (the live index normally holds the same pins, so this is a rare fallback).
function resultToPin(r: { id: string; imageUrl: string; title: string; brand?: string }): Pin {
  const h = hashNum(r.id);
  return {
    id: r.id,
    title: r.title || "Visual match",
    image: hiResImage(r.imageUrl),
    thumb: hiResImage(r.imageUrl),
    source: r.brand || "pinterest",
    brand: r.brand || "Pinterest",
    url: "#",
    price: 20 + (h % 180),
    grad: GRAD_KEYS[h % GRAD_KEYS.length],
    emoji: "\uD83C\uDF81",
    category: "visual",
  };
}

// Map an agent product to a Pin card: prefer the bundled pin (real photo/grad/
// emoji), else synthesize one from the returned fields.
function agentPinToPin(p: MaxiAgentProduct): Pin {
  const existing = PINS.find((x) => x.id === p.postId);
  if (existing) return existing;
  const h = hashNum(p.postId);
  return {
    id: p.postId,
    title: p.title || "Gift idea",
    image: hiResImage(p.image),
    thumb: hiResImage(p.image),
    source: p.brand || "giftmaxxing",
    brand: p.brand || "Giftmaxxing",
    url: "#",
    price: typeof p.price === "number" ? p.price : 20 + (h % 180),
    grad: GRAD_KEYS[h % GRAD_KEYS.length],
    emoji: "\uD83C\uDF81",
    category: p.category || "gift",
  };
}

export function MaxiProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m_seed",
      from: "maxi",
      text: "Hi! I'm Maxi, your gift concierge. Tell me a budget, a vibe, or who it's for — I'll find the gift, add it to your cart, and even check out for you.",
      chips: ["Gift under $40", "Something cozy", "Find a deal", "Like my taste"],
    },
  ]);
  const [sending, setSending] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const lastShownRef = useRef<Pin[]>([]);
  const profileRef = useRef<{ vibes: string[]; name?: string }>({ vibes: [] });
  const messagesRef = useRef<Msg[]>([]);
  const objectUrlsRef = useRef<string[]>([]);

  // hydrate cart + profile on mount (SSR-safe localStorage read)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(loadCart());
    profileRef.current = deriveVibes();
  }, []);
  useEffect(() => {
    saveCart(cart);
  }, [cart]);
  // Mirror messages into a ref so send() reads the live transcript for the agent
  // without re-creating the callback every render.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Revoke object URLs on unmount to free memory.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, []);

  const addPinToCart = useCallback((pin: Pin) => {
    setCart((prev) => addPinToCartArr(prev, pin));
    setLastOrder(null);
  }, []);
  const removeItem = useCallback((id: string) => {
    setCart((prev) => removeFromCart(prev, id));
  }, []);
  const clearCart = useCallback(() => setCart([]), []);
  const checkout = useCallback(() => {
    if (cart.length === 0) return;
    setLastOrder({
      id: `GM${Date.now().toString(36).toUpperCase()}`,
      items: cart,
      total: calcTotal(cart),
    });
    setCart([]);
  }, [cart]);

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || sending) return;
      setMessages((m) => [...m, { id: mkId(), from: "you", text: clean }]);
      setSending(true);
      (async () => {
        let reply: MaxiReply;
        let agentSteps: MaxiStep[] | undefined;
        let agentProducts: MaxiAgentProduct[] | undefined;
        // Try the real LLM agent first (behind a flag); fall back to the offline
        // rule-based responder on any miss so the panel always answers.
        const agent =
          process.env.NEXT_PUBLIC_MAXI_AGENT === "1"
            ? await askMaxi({
                userId: getMyUserId(),
                name: profileRef.current.name,
                message: clean,
                messages: messagesRef.current
                  .filter((mm) => mm.text)
                  .map((mm) => ({
                    role: mm.from === "you" ? ("user" as const) : ("assistant" as const),
                    text: mm.text,
                  })),
              })
            : null;
        if (agent) {
          agentSteps = agent.steps?.length ? agent.steps : undefined;
          agentProducts = agent.pins?.length ? agent.pins : undefined;
          const pins = agent.pins.map(agentPinToPin);
          const byId = new Map(pins.map((p) => [p.id, p]));
          const addPins = agent.actions
            .filter((a) => a.type === "add_to_cart")
            .flatMap((a) => a.postIds ?? [])
            .map((id) => byId.get(id) ?? PINS.find((p) => p.id === id))
            .filter((p): p is Pin => Boolean(p));
          reply = {
            text: agent.say,
            pins: pins.length ? pins : undefined,
            source: agent.source,
            addPins: addPins.length ? addPins : undefined,
            checkout: agent.actions.some((a) => a.type === "checkout"),
          };
        } else {
          try {
            reply = await respond(clean, {
              lastShown: lastShownRef.current,
              vibes: profileRef.current.vibes,
              cart,
              name: profileRef.current.name,
            });
          } catch {
            reply = { text: "Hmm, I glitched for a second — try that again?" };
          }
        }
        if (reply.addPins?.length) setCart((prev) => reply.addPins!.reduce((acc, p) => addPinToCartArr(acc, p), prev));
        if (reply.checkout) setCart([]);
        if (reply.pins?.length) lastShownRef.current = reply.pins;
        setMessages((m) => [
          ...m,
          { id: mkId(), from: "maxi", text: reply.text, pins: reply.pins, chips: reply.chips, source: reply.source, steps: agentSteps, products: agentProducts },
        ]);
        setSending(false);
        if (typeof window !== "undefined") {
          const synth = window.speechSynthesis;
          if (synth && (window as unknown as { __maxiSpeak?: boolean }).__maxiSpeak) {
            const u = new SpeechSynthesisUtterance(reply.text.replace(/[#*🎁✨🔖🛒✅]/gu, ""));
            u.rate = 1.05;
            synth.cancel();
            synth.speak(u);
          }
        }
      })();
    },
    [cart, sending]
  );

  const ask = useCallback(
    (text: string) => {
      setOpen(true);
      send(text);
    },
    [send]
  );

  // Generate a concise Maxi reply for an inline comment thread WITHOUT opening
  // the panel — used by "@maxi" mentions in comments.
  const commentReply = useCallback(
    async (query: string, contextName?: string): Promise<string> => {
      try {
        const r = await respond(query, {
          lastShown: lastShownRef.current,
          vibes: profileRef.current.vibes,
          cart,
          name: profileRef.current.name,
        });
        let text = (r.text || "").trim();
        if (r.pins && r.pins.length) {
          const top = r.pins
            .slice(0, 2)
            .map((p) => {
              const name = p.title.split(/[—,.:]/)[0].trim().slice(0, 36);
              return p.price > 0 ? `${name} ($${p.price})` : name;
            })
            .join(", ");
          if (top) text = `${text} Try: ${top}.`;
        }
        return text || "Tell me a budget and who it's for and I'll find a few ideas 🎁";
      } catch {
        return contextName
          ? `For something like ${contextName}, give me a budget and I'll line up options 🎁`
          : "Give me a budget and who it's for and I'll find a few ideas 🎁";
      }
    },
    [cart]
  );

  // Visual search: embed the uploaded photo (Titan Multimodal) -> S3 Vectors kNN.
  // Falls back to a local taste match if the endpoint isn't reachable/deployed.
  const searchByImage = useCallback(
    (file: File) => {
      if (!file || sending) return;
      setOpen(true);
      const label = file.name ? `Uploaded "${file.name.slice(0, 28)}"` : "Uploaded a photo";
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);
      setMessages((m) => [...m, { id: mkId(), from: "you", text: `\uD83D\uDCF7 ${label} — find similar gifts`, imageUrl: previewUrl }]);
      setSending(true);
      const who = profileRef.current.name ? `, ${profileRef.current.name}` : "";
      (async () => {
        let reply: Msg;
        try {
          const results = await visualSearch(file, { limit: 8 });
          if (results.length) {
            const byId = new Map(PINS.map((p) => [p.id, p]));
            const pins = results.map((r) => byId.get(r.id) ?? resultToPin(r)).slice(0, 6);
            lastShownRef.current = pins;
            reply = {
              id: mkId(),
              from: "maxi",
              text: `Found ${pins.length} visual matches to your photo${who} — ranked by similarity \u2728`,
              pins,
              source: "visual",
              chips: ["Add the first", "Cheaper options", "Checkout"],
            };
          } else {
            const r = await respond("like my taste", {
              lastShown: lastShownRef.current,
              vibes: profileRef.current.vibes,
              cart,
              name: profileRef.current.name,
            });
            if (r.pins?.length) lastShownRef.current = r.pins;
            reply = {
              id: mkId(),
              from: "maxi",
              text: `Visual search isn't live yet, so here are taste-based picks instead${who}. ${r.text}`,
              pins: r.pins,
              source: r.source ?? "local",
              chips: r.chips,
            };
          }
        } catch {
          const r = await respond("like my taste", {
            lastShown: lastShownRef.current,
            vibes: profileRef.current.vibes,
            cart,
            name: profileRef.current.name,
          });
          if (r.pins?.length) lastShownRef.current = r.pins;
          reply = {
            id: mkId(),
            from: "maxi",
            text: `I couldn't reach visual search just now${who} — here are taste-based matches instead.`,
            pins: r.pins,
            source: r.source ?? "local",
            chips: r.chips,
          };
        }
        setMessages((m) => [...m, reply]);
        setSending(false);
      })();
    },
    [cart, sending]
  );

  const value = useMemo<MaxiStore>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((o) => !o),
      messages,
      sending,
      send,
      ask,
      commentReply,
      searchByImage,
      cart,
      cartCount: calcCount(cart),
      cartTotal: calcTotal(cart),
      addPinToCart,
      removeItem,
      clearCart,
      cartOpen,
      setCartOpen,
      lastOrder,
      checkout,
    }),
    [open, messages, sending, send, ask, commentReply, searchByImage, cart, addPinToCart, removeItem, clearCart, cartOpen, lastOrder, checkout]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <MaxiDock />
    </Ctx.Provider>
  );
}

// ── Floating launcher ────────────────────────────────────────────────────────
function MaxiDock() {
  const { open, toggle, cartCount } = useMaxi();
  const pathname = usePathname();
  // On the dedicated Maxi page the whole screen IS the chat, so skip the
  // floating launcher + slide-over dock there.
  if (pathname === "/feed/maxi") return null;
  return (
    <>
      {!open && (
        <button
          onClick={toggle}
          className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full bg-coral px-4 py-3 text-white shadow-lg shadow-coral/30 transition-transform hover:scale-105 md:bottom-6 md:right-6"
          aria-label="Open Maxi"
        >
          <Maxi size={26} />
          <span className="hidden text-sm font-bold sm:block">Ask Maxi</span>
          {cartCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-coral">
              {cartCount}
            </span>
          )}
        </button>
      )}
      <MaxiPanel />
    </>
  );
}

function MicIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function ImageIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

// ── Reusable chat surface — used by the dock AND the full-page /feed/maxi ─────
export function MaxiChatSurface({ variant = "dock" }: { variant?: "dock" | "page" }) {
  const { open, setOpen, messages, sending, send, searchByImage, cart, cartCount, cartTotal, addPinToCart, removeItem } = useMaxi();
  const isPage = variant === "page";
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"chat" | "cart">("chat");
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  const supportsVoice =
    typeof window !== "undefined" &&
    (("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window));

  useEffect(() => {
    (window as unknown as { __maxiSpeak?: boolean }).__maxiSpeak = speak;
  }, [speak]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, view, open]);

  // Extract the first image File from a DataTransfer (drag or paste).
  const extractImageFile = useCallback((dt: DataTransfer): File | null => {
    for (let i = 0; i < dt.files.length; i++) {
      if (dt.files[i].type.startsWith("image/")) return dt.files[i];
    }
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        return item.getAsFile();
      }
    }
    return null;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setDragging(false); }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    const file = extractImageFile(e.dataTransfer);
    if (file) searchByImage(file);
  }, [extractImageFile, searchByImage]);

  // Paste image from clipboard (Ctrl+V).
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!e.clipboardData) return;
    const file = extractImageFile(e.clipboardData);
    if (file) {
      e.preventDefault();
      searchByImage(file);
    }
  }, [extractImageFile, searchByImage]);

  const submit = (text: string) => {
    if (!text.trim()) return;
    send(text);
    setDraft("");
  };

  const startVoice = () => {
    type SR = {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void; onerror: () => void; start: () => void; stop: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) submit(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <div
      className="relative flex h-full w-full flex-col bg-cream"
      role={isPage ? undefined : "dialog"}
      aria-label="Maxi"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* drag-and-drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-cream/90 backdrop-blur-sm">
          <ImageIcon size={48} className="text-coral" />
          <p className="mt-3 text-sm font-bold text-ink">Drop an image to visual search</p>
          <p className="mt-1 text-xs text-ink-soft">Maxi will find gifts with a similar vibe</p>
        </div>
      )}

      {/* header */}
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <Maxi size={36} />
        <div className="flex-1">
          <p className="font-bold text-ink">Maxi</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            {sending ? "thinking…" : "gift concierge · agentic shopping"}
          </p>
        </div>
        <button
          onClick={() => setSpeak((s) => !s)}
          title={speak ? "Voice replies on" : "Voice replies off"}
          className={`grid h-9 w-9 place-items-center rounded-full ${speak ? "bg-coral text-white" : "text-ink-soft hover:bg-ink/5"}`}
        >
          {speak ? "🔊" : "🔈"}
        </button>
        <button
          onClick={() => setView((v) => (v === "chat" ? "cart" : "chat"))}
          className="relative grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5"
          title="Cart"
        >
          <Icons.gift size={20} />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </button>
        {!isPage && (
          <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5" aria-label="Close">
            <Icons.close size={22} />
          </button>
        )}
      </header>

      {view === "cart" ? (
        <CartView cart={cart} total={cartTotal} onRemove={removeItem} onCheckout={() => { setView("chat"); send("checkout"); }} onBack={() => setView("chat")} />
      ) : (
        <>
          {/* messages */}
          <div ref={scrollRef} className={`flex-1 space-y-3 overflow-y-auto px-4 py-4 ${isPage ? "mx-auto w-full max-w-2xl" : ""}`}>
            {messages.map((m) => (
              <MessageBubble key={m.id} m={m} onAdd={addPinToCart} onChip={submit} />
            ))}
            {sending && (
              <div className="flex items-center gap-1.5 px-1 text-ink-faint">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-faint" />
              </div>
            )}
          </div>

          {/* composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(draft); }}
            className="border-t border-line bg-surface px-3 py-3"
          >
            <div className={`flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-2 ${isPage ? "mx-auto w-full max-w-2xl" : ""}`}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-ink/5"
                title="Search by photo (visual search)"
                aria-label="Visual search by photo"
              >
                <ImageIcon size={18} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) searchByImage(f);
                  e.target.value = "";
                }}
              />
              {supportsVoice && (
                <button
                  type="button"
                  onClick={startVoice}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${listening ? "animate-pulse bg-coral text-white" : "text-ink-soft hover:bg-ink/5"}`}
                  title="Speak to Maxi"
                  aria-label="Voice input"
                >
                  <MicIcon size={18} />
                </button>
              )}
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPaste={handlePaste}
                placeholder={listening ? "Listening…" : "Ask Maxi for a gift…"}
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
              />
              <button type="submit" disabled={!draft.trim()} className="text-coral disabled:opacity-30" aria-label="Send">
                <Icons.arrow size={20} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

// ── Right-side dock (slide-over) — wraps the shared surface ───────────────────
function MaxiPanel() {
  const { open } = useMaxi();
  return (
    <div
      className={`fixed inset-y-0 right-0 z-[75] flex w-full max-w-[400px] flex-col border-l border-line bg-cream shadow-2xl transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <MaxiChatSurface variant="dock" />
    </div>
  );
}

function MessageBubble({ m, onAdd, onChip }: { m: Msg; onAdd: (p: Pin) => void; onChip: (t: string) => void }) {
  const mine = m.from === "you";
  const dealProducts =
    !mine && m.products?.some((p) => p.onDeal || typeof p.listPrice === "number") ? m.products : null;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[88%]">
        {!mine && m.steps && m.steps.length > 0 && (
          <div className="mb-2 space-y-1 rounded-xl border border-line bg-cream/60 px-3 py-2">
            {m.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-ink-soft">
                <span className="mt-0.5 text-coral">✓</span>
                <span>
                  <span className="font-semibold text-ink">{s.label}</span>
                  {s.detail ? ` — ${s.detail}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${mine ? "bg-ink text-cream" : "border border-line bg-surface text-ink"}`}>
          {m.imageUrl && (
            <div className="mb-2 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.imageUrl} alt="Uploaded photo" className="max-h-48 w-full object-cover" />
            </div>
          )}
          {m.text}
          {m.source && !mine && (
            <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide text-coral">· {m.source}</span>
          )}
        </div>
        {dealProducts && (
          <div className="mt-2 space-y-2">
            {dealProducts.map((p) => (
              <DealCard key={p.postId} p={p} onAdd={() => onAdd(agentPinToPin(p))} />
            ))}
          </div>
        )}
        {m.pins && m.pins.length > 0 && !dealProducts && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {m.pins.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                <div className="relative aspect-square w-full" style={{ background: GRADIENTS[p.grad] }}>
                  <span className="absolute inset-0 grid place-items-center text-4xl">{p.emoji}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hiResImage(p.image)} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
                <div className="p-2">
                  <p className="truncate text-[11px] font-semibold text-ink">{p.title.slice(0, 40)}</p>
                  <div className="mt-1 flex items-center justify-between">
                    {p.price > 0 ? (
                      <span className="text-xs font-bold text-ink">${p.price}</span>
                    ) : (
                      <span />
                    )}
                    <button onClick={() => onAdd(p)} className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white hover:opacity-90">
                      + Cart
                    </button>
                  </div>
                  <a
                    href={productAmazonUrl({ name: p.title, brand: p.brand })}
                    target="_blank"
                    rel={AFFILIATE_REL}
                    className="mt-1 block text-center text-[10px] font-bold text-ink-faint hover:text-coral"
                  >
                    View on Amazon ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        {m.chips && m.chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.chips.map((c) => (
              <button key={c} onClick={() => onChip(c)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-coral-soft">
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Alexa-style deal card: image + rating/bought + price w/ strikethrough list
// price + % off + delivery + Add to cart. Used for find_deals (restock) results.
function DealCard({ p, onAdd }: { p: MaxiAgentProduct; onAdd: () => void }) {
  const hasList = typeof p.listPrice === "number" && typeof p.price === "number" && p.listPrice > p.price;
  let deliveryLabel = "";
  if (p.delivery) {
    const d = new Date(p.delivery);
    if (!Number.isNaN(d.getTime())) deliveryLabel = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  return (
    <div className="flex gap-3 overflow-hidden rounded-xl border border-line bg-surface p-2">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-cream">
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hiResImage(p.image)} alt={p.title} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12px] font-semibold text-ink">{p.title}</p>
        {(typeof p.rating === "number" || p.boughtPastMonth) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-ink-faint">
            {typeof p.rating === "number" && <span className="font-bold text-amber-500">★ {p.rating.toFixed(1)}</span>}
            {typeof p.reviews === "number" && <span>({p.reviews.toLocaleString()})</span>}
            {p.boughtPastMonth && <span>· {p.boughtPastMonth} bought</span>}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          {typeof p.price === "number" && <span className="text-sm font-bold text-ink">${p.price}</span>}
          {hasList && <span className="text-[11px] text-ink-faint line-through">${p.listPrice}</span>}
          {hasList && typeof p.discountPct === "number" && <span className="rounded bg-coral/10 px-1 text-[10px] font-bold text-coral">{p.discountPct}% off</span>}
        </div>
        {deliveryLabel && <p className="text-[10px] text-ink-faint">FREE delivery {deliveryLabel}</p>}
        <div className="mt-1 flex items-center gap-3">
          <button onClick={onAdd} className="rounded-full bg-coral px-2.5 py-0.5 text-[11px] font-bold text-white hover:opacity-90">+ Cart</button>
          <a href={productAmazonUrl({ name: p.title, brand: p.brand ?? undefined })} target="_blank" rel={AFFILIATE_REL} className="text-[10px] font-bold text-ink-faint hover:text-coral">View ↗</a>
        </div>
      </div>
    </div>
  );
}

function CartView({ cart, total, onRemove, onCheckout, onBack }: { cart: CartItem[]; total: number; onRemove: (id: string) => void; onCheckout: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <button onClick={onBack} className="text-ink-soft hover:text-ink" aria-label="Back to chat">
          <Icons.back size={20} />
        </button>
        <p className="font-bold text-ink">Your cart</p>
        <span className="ml-auto text-sm font-bold text-ink">${Math.round(total)}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-faint">Cart is empty. Ask Maxi to find something 🎁</p>
        ) : (
          cart.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg text-xl" style={{ background: GRADIENTS[it.grad] }}>
                {it.emoji}
                {it.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hiResImage(it.image)} alt={it.name} className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">{it.name}</p>
                <p className="text-[11px] text-ink-faint">{it.brand} · ${it.price}{it.qty > 1 ? ` × ${it.qty}` : ""}</p>
              </div>
              <button onClick={() => onRemove(it.id)} className="text-ink-faint hover:text-coral" aria-label="Remove">
                <Icons.close size={16} />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-line bg-surface px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-ink-soft">Total</span>
          <span className="font-bold text-ink">${Math.round(total)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full rounded-full bg-coral py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Checkout with Maxi
        </button>
        <p className="mt-1.5 text-center text-[11px] text-ink-faint">Simulated checkout — no real charge</p>
      </div>
    </div>
  );
}
