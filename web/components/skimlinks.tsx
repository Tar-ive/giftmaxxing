import Script from "next/script";

// Skimlinks — affiliate monetization for merchants we can't (yet) join directly.
//
// Skimlinks is an affiliate AGGREGATOR: a single Skimlinks approval gives access
// to 48k+ merchant programs (Sephora, Urban Outfitters, Target, …). This in-page
// script scans the DOM and rewrites eligible retailer <a href> links into
// commission-tracked links at click time — so we earn on brands whose own
// programs we're not enrolled in. It deliberately ignores Amazon (Amazon isn't
// in Skimlinks); Amazon links keep OUR associate tag instead (see
// lib/affiliate.ts + components/amazon-onelink.tsx).
//
// The publisher id is PUBLIC (it ships in the script URL), so it has a safe
// default and can be overridden per-environment. Set the env var to "" to
// disable the script entirely.
//
//   NEXT_PUBLIC_SKIMLINKS_ID   (default: the Giftmaxxing publisher id)
//
// Prerequisite: add your production domain as a site in the Skimlinks dashboard,
// otherwise links are NOT rewritten (localhost / preview URLs are ignored).
const SKIMLINKS_ID = process.env.NEXT_PUBLIC_SKIMLINKS_ID ?? "305299X1793495";

export function Skimlinks() {
  if (!SKIMLINKS_ID) return null;
  return (
    <Script
      id="skimlinks"
      src={`https://s.skimresources.com/js/${SKIMLINKS_ID}.skimlinks.js`}
      strategy="afterInteractive"
    />
  );
}
