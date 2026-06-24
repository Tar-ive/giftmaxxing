import { AMAZON_PICKS } from "@/lib/amazon-picks";
import { GRADIENTS } from "@/lib/data";
import { gradForAsin, emojiForAsin } from "@/lib/affiliate";
import { BuyOnAmazon, AmazonDisclosure } from "@/components/app/buy-on-amazon";
import { Icons } from "@/components/ui";

// Real, buyable Amazon affiliate picks (the only surface with real commerce —
// the feed/cart elsewhere is a simulated demo). Cards intentionally show no
// scraped price/image: until PA-API access lands we only render our own visuals
// and link out, staying inside the Associates Operating Agreement.
export default function ShopPage() {
  const picks = AMAZON_PICKS;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-coral-soft text-coral">
            <Icons.gift size={24} />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink">Shop</h1>
            <p className="text-sm text-ink-soft">
              {picks.length} hand-picked gifts on Amazon — every purchase supports Giftmaxxing.
            </p>
          </div>
        </div>
        <AmazonDisclosure className="mt-3" />
      </header>

      {picks.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-faint">
          No picks yet. Add ASINs with the importer to populate the shop.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {picks.map((p) => {
            const grad = p.grad ?? gradForAsin(p.asin);
            const emoji = p.emoji ?? emojiForAsin(p.asin);
            return (
              <div
                key={p.asin}
                className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-md"
              >
                <div
                  className="grid aspect-square place-items-center text-5xl"
                  style={{ background: GRADIENTS[grad] }}
                >
                  {emoji}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-ink">
                    {p.title ?? "Amazon find"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">{p.brand ?? "Amazon"}</p>
                  <div className="mt-auto pt-3">
                    <p className="mb-2 text-[11px] text-ink-faint">See price on Amazon</p>
                    <BuyOnAmazon asin={p.asin} className="w-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
