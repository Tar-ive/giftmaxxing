import Link from "next/link";

export const metadata = {
  title: "Privacy — Giftmaxxing",
  description: "How Giftmaxxing handles your data, including soft profiles from the swipe challenge.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/" className="text-sm font-semibold text-coral hover:underline">
        ← Giftmaxxing
      </Link>
      <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Privacy</h1>
      <p className="mt-2 text-sm text-ink-faint">Last updated June 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-ink-soft">
        <p>
          Giftmaxxing helps you find and time gifts for the people you care about. We
          store your profile, the people you shop for, and the dates you care about so
          your recommendations and reminders work across your devices.
        </p>

        <h2 id="sender" className="scroll-mt-24 pt-4 font-display text-xl font-bold text-ink">
          If you shared a challenge (sender)
        </h2>
        <p>
          When you share a “swipe challenge” link and someone completes it, we create a{" "}
          <strong className="text-ink">soft profile</strong> on{" "}
          <strong className="text-ink">your</strong> account: the gift taste implied by
          their swipes, plus the name and any occasion or date <em>you</em> set when you
          shared the link. It is a <em>soft</em> profile — a lightweight record to help
          you gift them, not a full account — and it is visible only to you.
        </p>
        <p>
          By sharing the link you confirm the recipient is okay with it, and{" "}
          <strong className="text-ink">you take responsibility for the soft profile you
          create</strong> and for using it respectfully. You can delete it from your
          connections at any time.
        </p>

        <h2 id="recipient" className="scroll-mt-24 pt-4 font-display text-xl font-bold text-ink">
          If you received a challenge (recipient)
        </h2>
        <p>
          You don&apos;t need an account, and we don&apos;t ask you for your name or
          birthday. Swiping simply shares your{" "}
          <strong className="text-ink">gift taste</strong> (and the occasion the sender
          chose) with the person who invited you, so they can pick something you&apos;d
          actually love. Those matches become your gift set.
        </p>
        <p>
          You can ask the person who invited you to remove your soft profile at any time.
          We retain only what&apos;s needed to provide the feature.
        </p>

        <h2 className="pt-4 font-display text-xl font-bold text-ink">Your choices</h2>
        <p>
          You can edit or delete your profile, recipients, events, and connections from
          within the app. Questions? Reach out and we&apos;ll help.
        </p>
      </section>
    </main>
  );
}
