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

        <h2 className="pt-4 font-display text-xl font-bold text-ink">
          Soft profiles &amp; the swipe challenge
        </h2>
        <p>
          You can share a “swipe challenge” link with a friend. When they complete it,
          they don&apos;t need to sign up. With their participation, we create a{" "}
          <strong className="text-ink">soft profile</strong> on your account containing
          the name and birthday they chose to share and the gift taste implied by their
          swipes. It is a <em>soft</em> profile — a lightweight record to help you gift
          them — not a full account, and it is visible only to you.
        </p>
        <p>
          Both people are assumed to consent: the sender chooses to share the link, and
          the recipient chooses to complete the challenge. As the person who shared the
          challenge, <strong className="text-ink">you take responsibility for the soft
          profile you create</strong> and for using it respectfully.
        </p>
        <p>
          A soft-profile person can ask to have their record removed at any time, and the
          sender can delete it from their connections. We retain only what&apos;s needed
          to provide the feature.
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
