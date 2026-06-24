// Reusable affiliate primitives. No "use client" needed — these are pure render
// (an <a> + static text), so they're usable from server or client components.
import { amazonUrl, AFFILIATE_REL } from "@/lib/affiliate";
import { Icons } from "@/components/ui";

export function BuyOnAmazon({
  asin,
  label = "Buy on Amazon",
  className = "",
}: {
  asin: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={amazonUrl(asin)}
      target="_blank"
      rel={AFFILIATE_REL}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-coral px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 ${className}`}
    >
      {label}
      <Icons.arrow size={15} className="-rotate-45" />
    </a>
  );
}

// FTC + Amazon Operating Agreement require a clear affiliate disclosure near
// affiliate links. Render this on any page that shows BuyOnAmazon links.
export function AmazonDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-ink-faint ${className}`}>
      As an Amazon Associate, Giftmaxxing earns from qualifying purchases. Prices
      and availability are shown on Amazon and may change.
    </p>
  );
}
