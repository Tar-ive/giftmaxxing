"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Maxi, Icons } from "@/components/ui";
import { SwipeDeck } from "@/components/app/swipe-deck";
import { decodeInvite, saveInviteSession, clearInviteSession } from "@/lib/invite";
import { saveProfile, type UserProfile } from "@/lib/onboarding";
import { createConnection } from "@/lib/api";
import {
  EVENT_TYPE_META,
  type EventType,
  type Recipient,
  type ImportantEvent,
  genId,
} from "@/lib/events";
import { swipeVibes, seedKeysFromSwipes, loadSwipes } from "@/lib/swipes";

// ── Phases ──────────────────────────────────────────────────────────────────
type Phase = "welcome" | "swipe" | "reveal";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const invite = useMemo(() => decodeInvite(code), [code]);
  const inviterName = invite?.name ?? "Someone";

  const [phase, setPhase] = useState<Phase>("welcome");
  const [saving, setSaving] = useState(false);

  // The sender can pre-set who the gift set is for (and the event), so the guest
  // never types a name or picks a birthday.
  const guestName = invite?.to?.trim() || "Friend";
  const guestFirst = guestName.split(/\s+/)[0];

  // Persist invite context on start so a page refresh doesn't lose the inviter.
  const startSwiping = useCallback(() => {
    saveInviteSession({ inviterName, code, startedAt: Date.now() });
    setPhase("swipe");
  }, [inviterName, code]);

  // Called when the user finishes swiping (or the deck runs out). Go straight to
  // the reveal — no name/birthday step; the sender already set those.
  const onSwipeDone = useCallback(() => {
    setPhase("reveal");
  }, []);

  const handleFinish = useCallback(() => {
    setSaving(true);
    const finalName = guestName;

    // Build a minimal onboarding profile from the swipe preferences so the
    // user can browse the feed afterwards without hitting the OnboardingGate.
    const vibes = swipeVibes(5);
    const seeds = seedKeysFromSwipes(8);
    const swipes = loadSwipes();
    const yesCount = swipes.filter((s) => s.dir === "yes").length;

    // Derive rough interest tags from swipe vibes (map category → interest tag).
    const vibeToInterest: Record<string, string> = {
      tech: "minimalist",
      fashion: "luxury",
      beauty: "wellness",
      home: "cozy",
      kitchen: "foodie",
      fitness: "outdoors",
      travel: "outdoors",
      gaming: "pop-culture",
      jewelry: "luxury",
      books: "cozy",
      music: "vintage",
      art: "diy",
      plants: "plants",
      candles: "candles",
      coffee: "coffee-tea",
      pets: "pets",
      stationery: "stationery",
      photography: "photography",
    };
    const derivedInterests = vibes
      .map((v) => vibeToInterest[v])
      .filter((v): v is string => Boolean(v));
    // Ensure at least 3 interests (the validator requires it).
    while (derivedInterests.length < 3) {
      const fallback = ["cozy", "foodie", "pop-culture"];
      for (const f of fallback) {
        if (!derivedInterests.includes(f)) {
          derivedInterests.push(f);
          if (derivedInterests.length >= 3) break;
        }
      }
    }

    // Create a Recipient for the inviter (they show up as the guest's friend).
    const inviterRecipient: Recipient = {
      id: genId("rcp"),
      name: inviterName,
      relation: "friend",
      pinSeeds: seeds,
      interests: vibes,
    };

    // The event is decided by the SENDER (carried in the invite link), so the
    // guest never enters a birthday. Only log one if the sender set a date.
    const recipients: Recipient[] = [inviterRecipient];
    const events: ImportantEvent[] = [];

    const occasion: EventType =
      invite?.occasion && invite.occasion in EVENT_TYPE_META
        ? (invite.occasion as EventType)
        : "birthday";
    if (invite?.date) {
      events.push({
        id: genId("evt"),
        recipientId: inviterRecipient.id,
        type: occasion,
        date: invite.date,
        recurrence: "annual",
        reminderLeadDays: 7,
      });
    }

    const profile: UserProfile = {
      name: finalName,
      role: "both",
      difficulty: yesCount > 8 ? "easy" : "moderate",
      style: "mix",
      materialisticCategories: [],
      interests: derivedInterests as UserProfile["interests"],
      dealPreferences: {
        sensitivity: "value-conscious",
        budgetRange: "mid",
        dealTypes: [],
        priceAlerts: false,
      },
      pinterestLinks: [],
      eventLoggingEnabled: events.length > 0,
      recipients,
      events,
      completedAt: Date.now(),
    };

    saveProfile(profile);
    clearInviteSession();
    window.dispatchEvent(new Event("giftmaxxing:profile"));

    // Viral loop: report completion back to the sender (best-effort). Creates a
    // soft profile on the sender's account + an unseen notification. No-op when
    // the link carried no senderId (the sender was signed out when sharing).
    if (invite?.senderId) {
      void createConnection(invite.senderId, {
        name: finalName,
        birthday: invite.date || undefined,
        vibes,
        seeds,
        interests: derivedInterests,
        yesCount,
        totalSwipes: swipes.length,
      });
    }

    // Reveal == "log me in": drop them straight into their gift set (the feed).
    router.push("/feed");
  }, [guestName, inviterName, router, invite]);

  // ── Invalid invite code ─────────────────────────────────────────────────
  if (!invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
        <Maxi size={64} />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">
          Hmm, that link doesn&apos;t look right
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Ask your friend to send a new invite link.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-opacity hover:opacity-90"
        >
          Go to Giftmaxxing
        </button>
      </div>
    );
  }

  // ── Welcome phase ─────────────────────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
        <Maxi size={72} />
        <h1 className="mt-6 text-center font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
          {inviterName} wants to find<br />your perfect gift
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-ink-soft">
          Swipe on gift ideas so {inviterName} knows exactly what you&apos;d love.
          No sign-up, no forms — just swipe!
        </p>
        <button
          onClick={startSwiping}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90"
        >
          <Icons.heartFill size={20} /> Start swiping
        </button>
        <p className="mt-4 text-xs text-ink-faint">Takes less than a minute</p>
        <p className="mx-auto mt-3 max-w-xs text-center text-[11px] leading-relaxed text-ink-faint">
          Swiping shares your gift taste with {inviterName} so they can gift you — no
          account or personal details needed.{" "}
          <a href="/privacy#recipient" className="underline hover:text-ink">
            How we use this
          </a>
          .
        </p>
      </div>
    );
  }

  // ── Swipe phase ───────────────────────────────────────────────────────────
  if (phase === "swipe") {
    return (
      <div className="min-h-screen bg-cream">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 text-xs font-bold text-coral">
              <Icons.gift size={14} /> {inviterName}&apos;s invite
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink">
              Would you want this gifted to you?
            </h1>
            <p className="mx-auto mt-2 max-w-md text-ink-soft">
              Swipe right for yes, left for no. This helps {inviterName} pick the perfect gift for you.
            </p>
          </div>

          <div className="mt-8">
            <SwipeDeck onMatchesReady={onSwipeDone} />
          </div>
        </div>
      </div>
    );
  }

  // ── Reveal phase — show the gift set + drop them into the app ──────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <span className="text-5xl">�</span>
      <h2 className="mt-4 text-center font-display text-3xl font-extrabold leading-tight text-ink">
        Your gift set is ready{guestFirst !== "Friend" ? `, ${guestFirst}` : ""}!
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-ink-soft">
        Based on your swipes, we built a gift set {inviterName} can shop from. Tap below
        to see it.
      </p>
      <button
        onClick={handleFinish}
        disabled={saving}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Icons.gift size={20} /> {saving ? "Loading\u2026" : "See your gift set"}
      </button>
    </div>
  );
}
