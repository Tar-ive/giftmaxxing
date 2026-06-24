"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Maxi, Icons } from "@/components/ui";
import { SwipeDeck } from "@/components/app/swipe-deck";
import { decodeInvite, saveInviteSession, clearInviteSession } from "@/lib/invite";
import { saveProfile, type UserProfile } from "@/lib/onboarding";
import { createConnection } from "@/lib/api";
import {
  type Recipient,
  type ImportantEvent,
  genId,
} from "@/lib/events";
import { swipeVibes, seedKeysFromSwipes, loadSwipes } from "@/lib/swipes";

// ── Phases ──────────────────────────────────────────────────────────────────
type Phase = "welcome" | "swipe" | "birthday" | "done";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const invite = useMemo(() => decodeInvite(code), [code]);
  const inviterName = invite?.name ?? "Someone";

  const [phase, setPhase] = useState<Phase>("welcome");
  const [guestName, setGuestName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);

  // Persist invite context on start so a page refresh doesn't lose the inviter.
  const startSwiping = useCallback(() => {
    saveInviteSession({ inviterName, code, startedAt: Date.now() });
    setPhase("swipe");
  }, [inviterName, code]);

  // Called when the user finishes swiping (clicks "See your gift matches" or
  // the deck runs out).  We intercept this to go to the birthday step instead
  // of showing results directly.
  const onSwipeDone = useCallback(() => {
    setPhase("birthday");
  }, []);

  const handleFinish = useCallback((nameOverride?: string) => {
    const finalName = (nameOverride ?? guestName).trim();
    if (!finalName) return;
    setSaving(true);

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

    // If a birthday was entered, create an event for the guest's birthday
    // tied to the inviter as recipient (so the inviter gets reminded).
    const recipients: Recipient[] = [inviterRecipient];
    const events: ImportantEvent[] = [];

    if (birthday) {
      events.push({
        id: genId("evt"),
        recipientId: inviterRecipient.id,
        type: "birthday",
        date: birthday,
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
        birthday: birthday || undefined,
        vibes,
        seeds,
        interests: derivedInterests,
        yesCount,
        totalSwipes: swipes.length,
      });
    }

    setPhase("done");

    // Small delay so the "done" screen flashes, then redirect to feed.
    window.setTimeout(() => router.push("/feed"), 1200);
    setSaving(false);
  }, [guestName, birthday, inviterName, router, invite]);

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
          No sign-up needed — just swipe!
        </p>
        <button
          onClick={startSwiping}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-coral px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90"
        >
          <Icons.heartFill size={20} /> Start swiping
        </button>
        <p className="mt-4 text-xs text-ink-faint">Takes less than a minute</p>
        <p className="mx-auto mt-3 max-w-xs text-center text-[11px] leading-relaxed text-ink-faint">
          By continuing, you let {inviterName} save your gift preferences to help them
          gift you.{" "}
          <a href="/privacy" className="underline hover:text-ink">
            Privacy
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

  // ── Birthday phase ────────────────────────────────────────────────────────
  if (phase === "birthday") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md">
          <div className="text-center">
            <span className="text-5xl">🎂</span>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink sm:text-3xl">
              Almost done!
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Tell us a bit about yourself so {inviterName} can surprise you at just the right time.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-widest text-ink-faint">
                Your name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="What should we call you?"
                autoFocus
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base font-medium text-ink outline-none transition-shadow focus:border-coral focus:ring-2 focus:ring-coral/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && guestName.trim()) {
                    const dateInput = document.getElementById("invite-birthday");
                    if (dateInput) dateInput.focus();
                  }
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-widest text-ink-faint">
                Your birthday
              </label>
              <input
                id="invite-birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base font-medium text-ink outline-none transition-shadow focus:border-coral focus:ring-2 focus:ring-coral/20"
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                So {inviterName} never forgets your birthday again
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => handleFinish()}
              disabled={!guestName.trim() || saving}
              className="w-full rounded-full bg-coral px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-coral/30 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Save & see my gift matches
            </button>
            <button
              onClick={() => {
                setBirthday("");
                handleFinish(guestName.trim() || "Friend");
              }}
              className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done phase (brief flash before redirect) ──────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <Maxi size={72} />
      <h2 className="mt-6 font-display text-2xl font-extrabold text-ink">You&apos;re all set!</h2>
      <p className="mt-2 text-sm text-ink-soft">
        {inviterName} now knows your gift taste. Heading to your feed...
      </p>
      <div className="mt-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-coral" />
    </div>
  );
}
