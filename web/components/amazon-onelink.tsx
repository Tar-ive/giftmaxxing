import Script from "next/script";

// Amazon OneLink — international affiliate link localization.
//
// Injects Amazon's OneLink JS, which rewrites our outbound US-tagged Amazon
// links so each visitor is sent to THEIR local marketplace (amazon.in,
// amazon.co.uk, …) with OUR local tracking tag — so we earn in that store.
// Our shop links already carry the US `-20` tag (see lib/affiliate.ts); OneLink
// swaps the store + tag client-side, so no link-building changes are needed.
//
// Prerequisites (one-time, in Associates Central):
//   1. Be an approved Associate in each target marketplace
//      (e.g. join Amazon India at affiliate-program.amazon.in → `-21` tag).
//   2. Link your tracking IDs across stores under Tools → OneLink.
//   3. Copy the adInstanceId GUID from the snippet it generates.
//
// Stays OFF until NEXT_PUBLIC_AMAZON_ONELINK_INSTANCE_ID is set (renders null),
// so it never loads a third-party script or affects anything before setup.
const INSTANCE_ID = process.env.NEXT_PUBLIC_AMAZON_ONELINK_INSTANCE_ID;
const HOME_MARKETPLACE = process.env.NEXT_PUBLIC_AMAZON_ONELINK_MARKETPLACE || "US";

export function AmazonOneLink() {
  if (!INSTANCE_ID) return null;

  // z-na host = North-America-hosted home marketplace (US). MarketPlace is the
  // HOME store; OneLink derives each visitor's destination from their geo.
  const src =
    "https://z-na.amazon-adsystem.com/widgets/onejs" +
    `?MarketPlace=${encodeURIComponent(HOME_MARKETPLACE)}` +
    `&adInstanceId=${encodeURIComponent(INSTANCE_ID)}`;

  return (
    <>
      <Script id="amazon-onelink-config" strategy="afterInteractive">
        {`amzn_assoc_isOneLinkEnabled = true;`}
      </Script>
      <Script id="amazon-onelink" src={src} strategy="afterInteractive" />
    </>
  );
}
