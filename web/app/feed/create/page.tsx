"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRADIENTS } from "@/lib/data";
import { PINS, type Pin } from "@/lib/pins";
import { pinToProduct } from "@/lib/feed-builder";
import type { Post } from "@/lib/social";
import { useCurrentUser } from "@/lib/identity";
import { useStore } from "@/components/app/store";
import { useMaxi } from "@/components/app/maxi-provider";
import { Icons } from "@/components/ui";

const PICKS = PINS.filter((_, i) => i % 3 === 0).slice(0, 18);

const CATEGORIES = [
  "Birthday",
  "Anniversary",
  "Housewarming",
  "Just Because",
  "Holiday",
  "Wedding",
  "Graduation",
  "Baby Shower",
  "Thank You",
];

const RECIPIENTS = ["Friend", "Partner", "Parent", "Sibling", "Coworker", "Child"];

export default function CreatePage() {
  const router = useRouter();
  const me = useCurrentUser();
  const { addPost, replyAsMaxi } = useStore();
  const { commentReply } = useMaxi();

  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<Pin | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recipient, setRecipient] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const share = () => {
    if (!selected && !imageUrl.trim() && !title.trim()) return;
    const text = caption.trim();
    const postTitle =
      title.trim() || selected?.title.slice(0, 60) || "A find worth gifting";

    const product = selected
      ? pinToProduct(selected)
      : {
          id: `custom-${Date.now()}`,
          name: postTitle,
          brand: "Custom",
          price: 0,
          grad: "coral" as const,
          emoji: "🎁",
          image: imageUrl.trim() || null,
        };

    const post: Post = {
      id: `you-${Date.now()}`,
      user: "you",
      time: "now",
      product,
      caption: text || "a find worth gifting 🎁",
      likes: 0,
      liked: false,
      saved: false,
      comments: [],
      commentCount: 0,
      source: selected?.brand ?? (recipient || undefined),
      url: selected?.url,
      productUrl: selected?.url,
    };

    addPost(post);

    if (/@maxi\b/i.test(text)) {
      const query = text.replace(/@maxi\b/i, "").trim() || `gift ideas like ${postTitle}`;
      // Maxi replies inline on the new post (does NOT open the side panel).
      void commentReply(query, postTitle).then((reply) => replyAsMaxi(post.id, reply));
    }

    router.push("/feed");
  };

  const hasContent = selected || imageUrl.trim() || title.trim();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink">
          New post
        </h1>
        <button
          onClick={share}
          disabled={!hasContent}
          className="rounded-full bg-coral px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Share
        </button>
      </div>

      {/* Caption */}
      <div className="mt-5 flex gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold text-white"
          style={{ background: GRADIENTS[me.grad] }}
        >
          {me.name.charAt(0)}
        </span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          placeholder="Say something about this find…  (mention @maxi for gift picks)"
          className="flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-coral"
        />
      </div>

      {/* Title */}
      <div className="mt-4">
        <label className="text-sm font-bold text-ink-soft">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your find a name"
          className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-coral"
        />
      </div>

      {/* Image URL */}
      <div className="mt-4">
        <label className="text-sm font-bold text-ink-soft">
          Image URL <span className="font-normal text-ink-faint">(optional)</span>
        </label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-coral"
        />
      </div>

      {/* Tags / Occasion */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowTagPicker(!showTagPicker)}
          className="flex items-center gap-2 text-sm font-bold text-ink-soft"
        >
          <Icons.calendar size={16} />
          Occasion / Tags
          <Icons.chevronR
            size={14}
            className={`transition-transform ${showTagPicker ? "rotate-90" : ""}`}
          />
        </button>
        {showTagPicker && (
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-coral text-white"
                      : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
        {selectedTags.length > 0 && !showTagPicker && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {selectedTags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-coral-soft px-2.5 py-0.5 text-xs font-semibold text-coral"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recipient */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowRecipientPicker(!showRecipientPicker)}
          className="flex items-center gap-2 text-sm font-bold text-ink-soft"
        >
          <Icons.users size={16} />
          Recipient
          <Icons.chevronR
            size={14}
            className={`transition-transform ${showRecipientPicker ? "rotate-90" : ""}`}
          />
        </button>
        {showRecipientPicker && (
          <div className="mt-2 flex flex-wrap gap-2">
            {RECIPIENTS.map((r) => {
              const active = recipient === r;
              return (
                <button
                  key={r}
                  onClick={() => setRecipient(active ? "" : r)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-coral text-white"
                      : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        )}
        {recipient && !showRecipientPicker && (
          <span className="mt-1.5 inline-block rounded-full bg-coral-soft px-2.5 py-0.5 text-xs font-semibold text-coral">
            For: {recipient}
          </span>
        )}
      </div>

      {/* Preview card */}
      {(selected || imageUrl.trim()) && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          <div
            className="relative aspect-[4/3] w-full"
            style={{
              background: selected
                ? GRADIENTS[selected.grad]
                : "linear-gradient(135deg, #ffb5a0, var(--color-coral))",
            }}
          >
            {selected && (
              <span className="absolute inset-0 grid place-items-center text-5xl">
                {selected.emoji}
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected?.image ?? imageUrl}
              alt={title || selected?.title || "Preview"}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <button
              onClick={() => {
                setSelected(null);
                setImageUrl("");
              }}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
              aria-label="Remove"
            >
              <Icons.close size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3">
            <p className="truncate text-sm font-semibold text-ink">
              {title || (selected?.title.slice(0, 48) ?? "Custom find")}
            </p>
            {selected && (
              <span className="shrink-0 text-sm font-bold text-ink">
                ${selected.price}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Attach a gift grid */}
      <p className="mt-6 text-sm font-bold text-ink-soft">Attach a gift</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {PICKS.map((p) => {
          const active = selected?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                if (!title) setTitle(p.title.slice(0, 60));
              }}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 ${
                active ? "border-coral" : "border-transparent"
              }`}
              style={{ background: GRADIENTS[p.grad] }}
            >
              <span className="absolute inset-0 grid place-items-center text-2xl">
                {p.emoji}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumb}
                alt={p.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
