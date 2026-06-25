"use client";

import { useEffect, useRef, useState } from "react";
import { GRADIENTS } from "@/lib/data";
import { USERS } from "@/lib/social";
import { useCurrentUser } from "@/lib/identity";
import { Icons, Avatar } from "@/components/ui";
import { useStore } from "@/components/app/store";

// ── Group Chat Tray (replaces stories) ──────────────────────────────────────

export function StoriesTray() {
  const { groupChats, openChat } = useStore();
  const me = useCurrentUser();
  // Pinned chats first, then the rest (excluding "new chat" placeholder which is always first)
  const sorted = [
    ...groupChats.filter((c) => c.newChat),
    ...groupChats.filter((c) => !c.newChat && c.pinned),
    ...groupChats.filter((c) => !c.newChat && !c.pinned),
  ];
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icons.users size={14} className="text-coral" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">
          Group Pitch-ins
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.map((gc) => {
          const u = gc.forUser === "you" ? me : USERS[gc.forUser];
          if (!u) return null;
          return (
            <button
              key={gc.id}
              onClick={() => openChat(gc.id)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`grid place-items-center rounded-full p-[2.5px] ${
                  gc.newChat
                    ? "bg-line"
                    : gc.pinned
                    ? "bg-gradient-to-tr from-coral via-rose-2 to-butter-2"
                    : "bg-gradient-to-tr from-coral to-lilac-2"
                }`}
              >
                <span className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-cream bg-surface">
                  <span
                    className="grid h-full w-full place-items-center rounded-full text-lg font-bold text-white"
                    style={{ background: GRADIENTS[u.grad] }}
                  >
                    {u.name.charAt(0)}
                  </span>
                  {gc.newChat && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-cream bg-coral text-white">
                      <Icons.plusSquare size={12} />
                    </span>
                  )}
                  {gc.pinned && !gc.newChat && (
                    <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-coral text-white">
                      <PinIcon size={10} />
                    </span>
                  )}
                  {gc.countdown && (
                    <span className="absolute -bottom-1 rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-bold text-cream">
                      {gc.countdown}
                    </span>
                  )}
                </span>
              </span>
              <span className="max-w-16 truncate text-[11px] text-ink-soft">
                {gc.newChat ? "New chat" : u.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Group Chat Viewer (replaces story viewer) ───────────────────────────────

export function StoryViewer() {
  const { openChatId, openChat, groupChats, sendChatMessage, togglePinChat, togglePinMessage } =
    useStore();
  const me = useCurrentUser();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const chat = openChatId ? groupChats.find((c) => c.id === openChatId) : null;

  const [prevChatId, setPrevChatId] = useState(openChatId);
  if (openChatId !== prevChatId) {
    setPrevChatId(openChatId);
    setInput("");
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages.length]);

  useEffect(() => {
    if (chat) inputRef.current?.focus();
  }, [chat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openChat(null);
    };
    if (chat) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chat, openChat]);

  if (!chat) return null;

  // "New chat" placeholder shows a creation prompt
  if (chat.newChat) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <button
          onClick={() => openChat(null)}
          className="absolute right-5 top-5 text-white/80 hover:text-white"
          aria-label="Close"
        >
          <Icons.close size={30} />
        </button>
        <div className="w-[min(440px,92vw)] rounded-3xl bg-cream p-8 text-center">
          <span className="text-5xl">🎁</span>
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">
            Start a Group Pitch-in
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Pick a person, invite friends, and coordinate the perfect gift together.
          </p>
          <button className="mt-6 rounded-xl bg-coral px-6 py-3 text-sm font-bold text-white">
            Choose a Recipient
          </button>
        </div>
      </div>
    );
  }

  const u = chat.forUser === "you" ? me : USERS[chat.forUser];
  if (!u) return null;

  const pinnedMessages = chat.messages.filter((m) => m.pinned);
  const firstName = u.name.split(" ")[0];
  const occasionLabel = chat.occasion
    ? chat.occasion.charAt(0).toUpperCase() + chat.occasion.slice(1)
    : "";

  const handleSend = () => {
    if (!input.trim()) return;
    sendChatMessage(chat.id, input);
    setInput("");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <button
        onClick={() => openChat(null)}
        className="absolute right-5 top-5 text-white/80 hover:text-white"
        aria-label="Close"
      >
        <Icons.close size={30} />
      </button>

      <div className="relative flex h-[85vh] w-[min(440px,92vw)] flex-col overflow-hidden rounded-3xl bg-cream">
        {/* Header */}
        <div className="shrink-0 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <Avatar grad={u.grad} label={u.name} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-ink">
                  Gift for {firstName}
                </h3>
                {chat.countdown && (
                  <span className="shrink-0 rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coral">
                    {chat.countdown}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-ink-faint">
                {occasionLabel && `${occasionLabel} · `}
                {chat.members.length} members
              </p>
            </div>
            <button
              onClick={() => togglePinChat(chat.id)}
              className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
                chat.pinned
                  ? "bg-coral/10 text-coral"
                  : "text-ink-faint hover:bg-ink/5"
              }`}
              title={chat.pinned ? "Unpin chat" : "Pin chat"}
            >
              <PinIcon size={16} />
            </button>
          </div>

          {/* Members row */}
          <div className="mt-2 flex items-center gap-1">
            {chat.members.slice(0, 5).map((mid) => {
              const mu = mid === "you" ? me : USERS[mid];
              if (!mu) return null;
              return (
                <Avatar key={mid} grad={mu.grad} label={mu.name} size={20} />
              );
            })}
            {chat.members.length > 5 && (
              <span className="text-[10px] font-medium text-ink-faint">
                +{chat.members.length - 5}
              </span>
            )}
          </div>
        </div>

        {/* Pinned messages banner */}
        {pinnedMessages.length > 0 && (
          <div className="shrink-0 border-b border-line bg-coral-soft/40 px-4 py-2">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-coral">
              <PinIcon size={10} /> Pinned ({pinnedMessages.length})
            </p>
            {pinnedMessages.map((pm) => {
              const pu = pm.user === "you" ? me : USERS[pm.user];
              return (
                <p key={pm.id} className="truncate text-xs text-ink-soft">
                  <span className="font-semibold text-ink">
                    {pu?.name.split(" ")[0] ?? pm.user}:
                  </span>{" "}
                  {pm.text}
                </p>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-3">
            {chat.messages.map((msg) => {
              const isMe = msg.user === "you";
              const mu = isMe ? me : USERS[msg.user];
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <Avatar
                    grad={mu?.grad ?? "peach"}
                    label={mu?.name ?? msg.user}
                    size={28}
                  />
                  <div
                    className={`group relative max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                      isMe
                        ? "rounded-br-md bg-coral text-white"
                        : "rounded-bl-md bg-surface text-ink"
                    }`}
                  >
                    {!isMe && (
                      <p className="mb-0.5 text-[10px] font-bold text-ink-faint">
                        {mu?.name.split(" ")[0]}
                      </p>
                    )}
                    <p className="text-[13px] leading-snug">{msg.text}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] ${
                          isMe ? "text-white/60" : "text-ink-faint"
                        }`}
                      >
                        {msg.time}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinMessage(chat.id, msg.id);
                        }}
                        className={`opacity-0 transition-opacity group-hover:opacity-100 ${
                          msg.pinned
                            ? "!opacity-100"
                            : ""
                        } ${isMe ? "text-white/60 hover:text-white" : "text-ink-faint hover:text-coral"}`}
                        title={msg.pinned ? "Unpin" : "Pin message"}
                      >
                        <PinIcon size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder={`Message the group...`}
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
            />
            <button
              onClick={handleSend}
              className="grid h-8 w-8 place-items-center rounded-full bg-coral text-white transition-colors hover:bg-coral/80"
            >
              <Icons.share size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny pin icon
function PinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
    </svg>
  );
}
