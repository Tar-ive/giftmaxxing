import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Giftmaxxing",
  description: "How Giftmaxxing collects, uses, and protects your personal data.",
}

// Inline editorial theme tokens — no app shell dependency
const T = {
  bg: "#F7F2EB",
  surface: "#FFFFFF",
  text: "#211A14",
  text2: "rgba(33,26,20,0.62)",
  line: "rgba(33,26,20,0.10)",
  accent: "#FB6F52",
  accentSoft: "rgba(251,111,82,0.14)",
  fontDisplay: '"Instrument Serif", Georgia, serif',
  fontUI: '"Hanken Grotesk", -apple-system, system-ui, sans-serif',
  radius: "20px",
  radiusSm: "12px",
  shadow: "0 1px 2px rgba(60,40,20,0.04), 0 8px 24px rgba(60,40,20,0.06)",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontSize: 20,
          color: T.text,
          marginBottom: 10,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontFamily: T.fontUI,
          fontSize: 15,
          color: T.text2,
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 10px" }}>{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 22, margin: "0 0 10px" }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 7 }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: T.fontUI,
      }}
    >
      {/* Header bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(247,242,235,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.line}`,
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: T.fontUI,
            fontSize: 14,
            fontWeight: 600,
            color: T.accent,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          ← Back to app
        </Link>

        <span
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 17,
            fontWeight: 400,
            color: T.text,
            letterSpacing: -0.2,
          }}
        >
          Giftmaxxing
        </span>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: T.accentSoft,
            color: T.accent,
            fontFamily: T.fontUI,
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 999,
            marginBottom: 20,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          Last updated: June 2025
        </div>

        <h1
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 400,
            fontSize: 44,
            lineHeight: 1.1,
            color: T.text,
            margin: "0 0 14px",
          }}
        >
          Your privacy, handled carefully.
        </h1>
        <p
          style={{
            fontFamily: T.fontUI,
            fontSize: 16,
            color: T.text2,
            lineHeight: 1.65,
            margin: "0 0 48px",
            maxWidth: 580,
          }}
        >
          Giftmaxxing is built around trust — between you and your friends. This policy explains what data we collect, why we collect it, and how you stay in control.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: T.line, marginBottom: 40 }} />

        <Section title="1. Information we collect">
          <P>When you use Giftmaxxing we may collect:</P>
          <Ul
            items={[
              "Account information — name, email address, and profile photo you provide when signing up.",
              "Wishlist and gift data — the products you save, lists you create, and group gifts you join.",
              "Connected account data — if you link Instagram, Pinterest, or Spotify we access only the specific scopes you grant (public collections, boards, or top tracks) to power Maxi recommendations.",
              "Usage data — pages viewed, features used, and in-app actions, collected in aggregate to improve the product.",
              "Device and log data — IP address, browser type, and crash reports used for security and debugging.",
            ]}
          />
        </Section>

        <Section title="2. How we use your information">
          <P>We use the data we collect to:</P>
          <Ul
            items={[
              "Provide and personalise the Giftmaxxing service, including Maxi AI recommendations.",
              "Send you notifications about events, price drops, and group gift activity (only if you enable them).",
              "Improve and develop new features by understanding how people use the app.",
              "Detect and prevent fraud, abuse, or security incidents.",
              "Comply with applicable legal obligations.",
            ]}
          />
          <P>We do not sell your personal data to third parties.</P>
        </Section>

        <Section title="3. Sharing of information">
          <P>We share your data only in these limited cases:</P>
          <Ul
            items={[
              "With friends you choose to connect with or share lists with — only what you make visible.",
              "With service providers who process data on our behalf (e.g. cloud hosting, analytics) under strict data-processing agreements.",
              "If required by law, court order, or to protect the safety of our users.",
              "In connection with a merger, acquisition, or sale of assets, with advance notice to you.",
            ]}
          />
        </Section>

        <Section title="4. Linked accounts and third-party services">
          <P>
            When you connect a third-party account (Instagram, Pinterest, Spotify), you authorise us to read only the data scopes listed on the permissions screen. We do not post on your behalf without explicit action from you. You can disconnect any linked account at any time from Settings &rsaquo; Connected accounts.
          </P>
        </Section>

        <Section title="5. Data retention">
          <P>
            We keep your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or fraud-prevention purposes.
          </P>
        </Section>

        <Section title="6. Your rights">
          <P>Depending on where you live, you may have the right to:</P>
          <Ul
            items={[
              "Access — request a copy of the personal data we hold about you.",
              "Correction — ask us to fix inaccurate or incomplete data.",
              "Deletion — request that we delete your personal data.",
              "Portability — receive your data in a machine-readable format.",
              "Objection — opt out of certain processing, including personalised recommendations.",
              "Restriction — ask us to limit how we use your data while a dispute is resolved.",
            ]}
          />
          <P>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:privacy@giftmaxxing.com" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>
              privacy@giftmaxxing.com
            </a>
            . We will respond within 30 days.
          </P>
        </Section>

        <Section title="7. Cookies and tracking">
          <P>
            We use essential cookies to keep you logged in and maintain session security. We use analytics cookies (opt-in) to understand aggregate usage patterns. We do not use advertising cookies or cross-site trackers. You can manage cookie preferences in your browser settings at any time.
          </P>
        </Section>

        <Section title="8. Children&apos;s privacy">
          <P>
            Giftmaxxing is not directed at children under 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please contact us at{" "}
            <a href="mailto:privacy@giftmaxxing.com" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>
              privacy@giftmaxxing.com
            </a>{" "}
            and we will promptly delete it.
          </P>
        </Section>

        <Section title="9. Security">
          <P>
            We use industry-standard measures including TLS encryption in transit, encrypted storage at rest, and access controls to protect your data. No method of transmission over the internet is 100% secure, but we continuously review and improve our practices.
          </P>
        </Section>

        <Section title="10. Changes to this policy">
          <P>
            We may update this Privacy Policy from time to time. When we make material changes we will notify you via in-app notification and update the &ldquo;Last updated&rdquo; date above. Continued use of Giftmaxxing after changes take effect constitutes your acceptance of the revised policy.
          </P>
        </Section>

        <Section title="11. Contact us">
          <P>If you have questions about this Privacy Policy or how we handle your data, please reach out:</P>
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.line}`,
              borderRadius: T.radius,
              padding: "18px 20px",
              fontFamily: T.fontUI,
              fontSize: 15,
              color: T.text2,
              lineHeight: 1.75,
              boxShadow: T.shadow,
            }}
          >
            <div style={{ fontWeight: 700, color: T.text, marginBottom: 6 }}>Giftmaxxing Inc.</div>
            <div>
              Privacy:{" "}
              <a href="mailto:privacy@giftmaxxing.com" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>
                privacy@giftmaxxing.com
              </a>
            </div>
            <div>
              General:{" "}
              <a href="mailto:hello@giftmaxxing.com" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>
                hello@giftmaxxing.com
              </a>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
