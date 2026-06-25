"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { USERS, GROUP_CHATS, type ChatMessage, type GroupChat } from "@/lib/social";
import { Avatar, Icons } from "@/components/ui";

const STORAGE_KEY = "giftmaxxing_messages";

function loadConversations(): GroupChat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GroupChat[];
  } catch { /* ignore */ }
  return GROUP_CHATS.filter((c) => !c.newChat);
}

function saveConversations(chats: GroupChat[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch { /* quota */ }
}

function lastMessage(chat: GroupChat): ChatMessage | undefined {
  return chat.messages[chat.messages.length - 1];
}

function chatTitle(chat: GroupChat): string {
  const u = USERS[chat.forUser];
  const name = u?.name ?? chat.forUser;
  if (chat.occasion === "birthday") return `${name}'s Birthday`;
  if (chat.occasion === "farewell") return `${name}'s Farewell`;
  if (chat.occasion === "housewarming") return `${name}'s Housewarming`;
  if (chat.occasion === "anniversary") return `${name}'s Anniversary`;
  if (chat.occasion) return `${name} — ${chat.occasion}`;
  return name;
}

function memberNames(chat: GroupChat): string {
  return chat.members
    .filter((m) => m !== "you")
    .map((m) => USERS[m]?.name?.split(" ")[0] ?? m)
    .join(", ");
}

export default function MessagesPage() {
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage unavailable during SSR
    setChats(loadConversations());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeId, chats]);

  const activeChat = chats.find((c) => c.id === activeId) ?? null;

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setChats((prev) => {
      const next = prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: `msg-${Date.now()}`,
                  user: "you",
                  text,
                  time: "now",
                } satisfies ChatMessage,
              ],
            }
          : c
      );
      saveConversations(next);
      return next;
    });
    setDraft("");
    inputRef.current?.focus();
  }, [draft, activeId]);

  // Conversation list view
  const ConversationList = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <h1 className="font-display text-xl font-extrabold text-ink">Messages</h1>
        <span className="text-xs font-semibold text-ink-faint">
          {chats.length} conversation{chats.length !== 1 ? "s" : ""}
        </span>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="text-5xl">✉️</span>
          <p className="text-sm text-ink-faint">
            No conversations yet. Start a group gift to message friends!
          </p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-line overflow-y-auto">
          {chats.map((chat) => {
            const last = lastMessage(chat);
            const u = USERS[chat.forUser];
            return (
              <button
                key={chat.id}
                onClick={() => setActiveId(chat.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink/5"
              >
                <div className="relative">
                  <Avatar
                    grad={u?.grad ?? "coral"}
                    label={u?.name ?? "?"}
                    size={48}
                  />
                  {chat.countdown && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {chat.countdown}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-ink">
                      {chatTitle(chat)}
                    </p>
                    {last && (
                      <span className="shrink-0 text-xs text-ink-faint">
                        {last.time}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-soft">
                    {memberNames(chat)}
                  </p>
                  {last && (
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                      {last.user === "you" ? "You: " : `${USERS[last.user]?.name?.split(" ")[0] ?? last.user}: `}
                      {last.text}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Conversation detail view
  const ConversationDetail = activeChat && (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          onClick={() => setActiveId(null)}
          className="text-ink md:hidden"
          aria-label="Back"
        >
          <Icons.back size={24} />
        </button>
        <button
          onClick={() => setActiveId(null)}
          className="hidden text-ink md:block"
          aria-label="Back"
        >
          <Icons.back size={24} />
        </button>
        <Avatar
          grad={USERS[activeChat.forUser]?.grad ?? "coral"}
          label={USERS[activeChat.forUser]?.name ?? "?"}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {chatTitle(activeChat)}
          </p>
          <p className="truncate text-xs text-ink-faint">
            {memberNames(activeChat)}
            {activeChat.countdown && ` · ${activeChat.countdown} away`}
          </p>
        </div>
        {activeChat.occasion && (
          <span className="shrink-0 rounded-full bg-coral-soft px-2.5 py-1 text-[11px] font-bold text-coral">
            {activeChat.occasion}
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {activeChat.messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-faint">
            Start the conversation! Coordinate gifts with your friends.
          </p>
        ) : (
          activeChat.messages.map((msg, i) => {
            const isMe = msg.user === "you";
            const sender = USERS[msg.user];
            const showAvatar =
              !isMe &&
              (i === 0 || activeChat.messages[i - 1].user !== msg.user);
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="w-7 shrink-0">
                    {showAvatar && (
                      <Avatar
                        grad={sender?.grad ?? "coral"}
                        label={sender?.name ?? "?"}
                        size={28}
                      />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                    isMe
                      ? "rounded-br-md bg-coral text-white"
                      : "rounded-bl-md bg-ink/5 text-ink"
                  }`}
                >
                  {showAvatar && !isMe && (
                    <p className="mb-0.5 text-[11px] font-bold text-ink-soft">
                      {sender?.name?.split(" ")[0] ?? msg.user}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p
                    className={`mt-0.5 text-right text-[10px] ${
                      isMe ? "text-white/60" : "text-ink-faint"
                    }`}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t border-line px-4 py-3"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-coral"
        />
        {draft.trim() && (
          <button
            type="submit"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-white transition-opacity hover:opacity-90"
            aria-label="Send"
          >
            <Icons.share size={18} />
          </button>
        )}
      </form>
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-3xl flex-col md:h-screen">
      {activeChat ? ConversationDetail : ConversationList}
    </div>
  );
}
