// Bundled fallback list of the embedded Pinterest pins (key + short title +
// source). Generated from infra/ingest/pins.manifest.json. Used to pick seed
// vectors for the S3 Vectors kNN ("show me more like these") when the live
// GET /pins endpoint isn't reachable yet. A pin's key === its postId in the
// DynamoDB posts table === its key in the S3 Vectors `pins` index.

export type SeedPin = { k: string; t: string; u: string };

export const SEED_PINS: SeedPin[] = [
  {"k":"pin-155303888285817876","t":"Get ready for your garden party, Eurotrip, girls night out, honeymoon, or all of","u":"etsy"},
  {"k":"pin-155303888285815829","t":"The old school charm of quilting, but this time in a cute ceramic charm! Add one","u":"etsy"},
  {"k":"pin-155303888285813910","t":"Romanticize your everyday with a beautiful vintage lipstick carousel. These orna","u":"etsy"},
  {"k":"pin-155303888285811197","t":"Didn't think a charm necklace could get any cuter? Think again! Etsy seller Shel","u":"etsy"},
  {"k":"pin-155303888285810000","t":"Long live girlhood, and a ballet themed birthday party for you and all your best","u":"etsy"},
  {"k":"pin-155303888285807923","t":"Lace is known for its timeless elegance, and it adds an effortlessly romantic to","u":"etsy"},
  {"k":"pin-155303888285806680","t":"Gifts for your best girls should be as unique as they are. From sporty to thrift","u":"etsy"},
  {"k":"pin-155303888285804679","t":"Display your favorite photos with a punchy, monochromatic frame that will pop on","u":"etsy"},
  {"k":"pin-155303888285803288","t":"Peanut butter and jelly gets the all-star treatment in this original oil paintin","u":"etsy"},
  {"k":"pin-155303888285801802","t":"Whether you plan to spend the summer boating, or just want to embrace a nautical","u":"etsy"},
  {"k":"pin-155303888285800628","t":"Made to emulate a painter's palette, this hair accessory pins into your hair tha","u":"etsy"},
  {"k":"pin-155303888285798442","t":"Bring a bold pop of color to the table all season long with block-printed daisy ","u":"etsy"},
  {"k":"pin-155303888285795959","t":"Save these DIY projects for your next rainy day and get into your craft era. Vin","u":"etsy"},
  {"k":"pin-155303888285790678","t":"This is what happens when you pair a vintage tennis racket with unique hand-embr","u":"etsy"},
  {"k":"pin-155303888285789342","t":"Bring a smile to your kitchen space with this spoonrest and utensil holder set. ","u":"etsy"},
  {"k":"pin-155303888285787320","t":"Whether you're a beach bride, or just love coastal-inspired style, these nautilu","u":"etsy"},
  {"k":"pin-155303888285786269","t":"Your walls have been asking for a burst of color, and Etsy seller MikDuds has yo","u":"etsy"},
  {"k":"pin-155303888285784557","t":"Hot dogs are the unofficial meal of a perfect summer, and that calls for a theme","u":"etsy"},
  {"k":"pin-155303888285783570","t":"A refined blue bloom ring for everyday, or the most special events. Handcrafted ","u":"etsy"},
  {"k":"pin-155303888285782114","t":"Add a touch of '90's flair to your wardrobe with this vintage tie-front tan lace","u":"etsy"},
  {"k":"pin-155303888285780857","t":"Summer calls for ice cream, and parties call for fun crafts to keep everyone bus","u":"etsy"},
  {"k":"pin-155303888285778376","t":"You're going to want to add these cross-stitch designs by Etsy seller StitchinWi","u":"etsy"},
  {"k":"pin-155303888285774821","t":"Bring a little woodland magic to your baby’s nursery decor, or your little one's","u":"etsy"},
  {"k":"pin-155303888285773543","t":"Travel-ready outfits are easy to find if you know where to look, and Etsy has ev","u":"etsy"},
  {"k":"pin-32088216099431408","t":"Learn how to grow roses from cuttings following these expert guidelines. Plant s","u":"marthastewart"},
  {"k":"pin-32088216099431159","t":"Drought-tolerant fruit trees are more adaptable to hot, dry climates. Here, gard","u":"marthastewart"},
  {"k":"pin-32088216099431071","t":"These five summer vegetables can boost your protein intake, say nutrition expert","u":"marthastewart"},
  {"k":"pin-32088216099430957","t":"This easy four-ingredient vinaigrette recipe is one you'll turn to time and agai","u":"marthastewart"},
  {"k":"pin-32088216099429555","t":"Our chicken piccata recipe is quick enough for a weeknight but special enough fo","u":"marthastewart"},
  {"k":"pin-32088216099429406","t":"Backyards are a wonderful space to bring together family and friends—if it feels","u":"marthastewart"},
  {"k":"pin-32088216099429275","t":"These adorable animals may not be welcome visitors if you have pets around. Get ","u":"marthastewart"},
  {"k":"pin-32088216099429200","t":"Keep wasps away naturally with essential oils. Pest control experts share which ","u":"marthastewart"},
  {"k":"pin-32088216099429119","t":"Individually wrapped brownie cups are a chocolate lover’s dream with both milk-c","u":"marthastewart"},
  {"k":"pin-32088216099429027","t":"This is how to keep your dog away from snakes, including what to do if you think","u":"marthastewart"},
  {"k":"pin-32088216099428913","t":"These drought-tolerant summer flowers will thrive even when rainfall is minimal ","u":"marthastewart"},
  {"k":"pin-32088216099428813","t":"Chipmunks are adorable, but they can wreak havoc on your potted plants. We asked","u":"marthastewart"},
  {"k":"pin-32088216099428481","t":"What is the number-one best bedtime drink for deeper sleep? We spoke to nutritio","u":"marthastewart"},
  {"k":"pin-32088216099428320","t":"This easy blueberry crisp has a toasty oat topping and sweet, juicy filling burs","u":"marthastewart"},
  {"k":"pin-32088216099428253","t":"Our strawberry desserts collection is packed with irresistible strawberry recipe","u":"marthastewart"},
  {"k":"pin-32088216099426801","t":"This marble cake recipe is from the Martha Stewart Baking Handbook. Baked in a l","u":"marthastewart"},
  {"k":"pin-32088216099426609","t":"There are a few décor mistakes that can make a home feel outdated, but one in pa","u":"marthastewart"},
  {"k":"pin-32088216099426548","t":"Squirrels love to feast on fruit trees, which can be a real problem for your nex","u":"marthastewart"},
  {"k":"pin-32088216099426466","t":"Baby raccoons are adorable, but it's best to keep your distance from them. We as","u":"marthastewart"},
  {"k":"pin-32088216099426364","t":"Find out everything you need to know about freezing sourdough properly, includin","u":"marthastewart"},
  {"k":"pin-32088216099426220","t":"Wondering what fermented foods actually do for your health? Nutrition experts br","u":"marthastewart"},
  {"k":"pin-32088216099426090","t":"Some trees may look beautiful in your yard, but they can wreak havoc on the surr","u":"marthastewart"},
  {"k":"pin-32088216099426008","t":"Vintage and antique experts share the most covetable flea market finds. From ant","u":"marthastewart"},
  {"k":"pin-32088216099425902","t":"Don’t toss your banana peels—use them to boost your rose garden. Discover these ","u":"marthastewart"},
  {"k":"pin-120752833755403666","t":"Thoughtful gifts for grill masters, sports fans, hobbyists, and more. Skip the l","u":"uncommongoods"},
  {"k":"pin-120752833755388364","t":"Aesthetic meets actually useful. These gifts make everyday organization way more","u":"uncommongoods"},
  {"k":"pin-120752833755388363","t":"The kind of birthday gifts people instantly become obsessed with. Unique, unexpe","u":"uncommongoods"},
  {"k":"pin-120752833755388362","t":"The kind of birthday gift they’ll immediately put on display. And never stop tal","u":"uncommongoods"},
  {"k":"pin-120752833755388361","t":"Perfect for movie nights, sweet cravings, and late-night spoonfuls. Cozy gifting","u":"uncommongoods"},
  {"k":"pin-120752833755388360","t":"The kind of birthday gifts people instantly obsess over. Fun, whimsical, and ser","u":"uncommongoods"},
  {"k":"pin-120752833755355233","t":"No matter what Dad’s into, there’s a gift for it here. Thoughtful, unique, and a","u":"uncommongoods"},
  {"k":"pin-120752833755355231","t":"The perfect gifts for sports fans who love a little history. Thoughtful, unique,","u":"uncommongoods"},
  {"k":"pin-120752833755355230","t":"Upgrade his grilling game with gifts he’ll actually use. Perfect for BBQ season ","u":"uncommongoods"},
  {"k":"pin-120752833755346842","t":"A graduation gift they’ll actually use long after the ceremony. Personalized wit","u":"uncommongoods"},
  {"k":"pin-120752833755346841","t":"Celebrate their next chapter with something meaningful. These gifts go beyond th","u":"uncommongoods"},
  {"k":"pin-120752833755346840","t":"Celebrate their next chapter with something meaningful. These gifts go beyond th","u":"uncommongoods"},
  {"k":"pin-120752833755346585","t":"Perfect for people who take their water bottle everywhere. Lightweight, practica","u":"uncommongoods"},
  {"k":"pin-120752833755346583","t":"Perfect for people who take their water bottle everywhere. Lightweight, practica","u":"uncommongoods"},
  {"k":"pin-120752833755304748","t":"Upgrade any hockey fan's home bar with team-themed gear you can't find anywhere ","u":"uncommongoods"},
  {"k":"pin-120752833755304730","t":"Give them something they’ve never seen before. Our unique gifts for little ones ","u":"uncommongoods"},
  {"k":"pin-120752833755304729","t":"Give them something they’ve never seen before. Our unique gifts for little ones ","u":"uncommongoods"},
  {"k":"pin-120752833755304728","t":"Give them something they’ve never seen before. Our unique gifts for little ones ","u":"uncommongoods"},
  {"k":"pin-120752833755268032","t":"The funniest way to keep plants thriving. Functional, clever, and impossible not","u":"uncommongoods"},
  {"k":"pin-120752833755268031","t":"A thoughtful gift for pet and plant lovers. Safe, stylish, and easy to care for.","u":"uncommongoods"},
  {"k":"pin-120752833755268030","t":"A thoughtful gift for pet and plant lovers. Safe, stylish, and easy to care for.","u":"uncommongoods"},
  {"k":"pin-120752833755268029","t":"A fresh, thoughtful way to gift something meaningful. These houseplants bring li","u":"uncommongoods"},
  {"k":"pin-120752833755268028","t":"A thoughtful gift for pet and plant lovers. Safe, stylish, and easy to care for.","u":"uncommongoods"},
  {"k":"pin-120752833755265464","t":"For all the things that make her smile. Find a gift she’ll truly connect with.","u":"uncommongoods"},
];

// Map facet "vibes" to keyword groups that appear in pin titles, so a demo
// profile's declared taste can be turned into a few representative seed pins.
const VIBE_KEYWORDS: Record<string, string[]> = {
  cozy: ["cozy", "candle", "blanket", "quilt", "warm", "nursery", "bedtime", "movie night"],
  calm: ["sleep", "bedtime", "garden", "plant", "tea", "rose", "flower"],
  warm: ["warm", "cozy", "summer", "sun"],
  film: ["photo", "frame", "vintage", "paint", "painting", "oil"],
  retro: ["vintage", "old school", "antique", "flea market", "'90"],
  tech: ["useful", "organization", "practical", "upgrade", "gear", "functional"],
  music: ["vinyl", "record", "party", "ballet"],
  home: ["home", "decor", "vase", "frame", "plant", "houseplant", "spoonrest", "wall"],
  wellness: ["sleep", "health", "fermented", "nutrition", "protein", "tea"],
  kitchen: ["kitchen", "recipe", "bake", "brownie", "cake", "spoonrest", "vinaigrette", "crisp", "sourdough"],
  luxe: ["elegant", "refined", "handcrafted", "jewel", "ring", "necklace", "lace"],
  romantic: ["romantic", "romanticize", "lace", "bloom", "ring", "lipstick", "charm"],
  beauty: ["lipstick", "hair", "lace", "beauty"],
  minimal: ["monochromatic", "refined", "aesthetic", "minimal"],
  stationery: ["frame", "paint", "craft", "diy", "cross-stitch", "photo"],
};

// Pick up to `n` seed pin keys that best represent the given vibes. Falls back
// to an evenly-spaced sample of the whole set so different (or vibe-less)
// profiles still get a varied, non-empty seed.
export function pickSeedPins(
  pins: { k: string; t: string }[],
  vibes: string[] = [],
  n = 4
): string[] {
  if (!pins.length) return [];
  const spread = (arr: { k: string }[]): string[] => {
    const step = Math.max(1, Math.floor(arr.length / n));
    const out: string[] = [];
    for (let i = 0; i < arr.length && out.length < n; i += step) out.push(arr[i].k);
    return out;
  };

  if (vibes.length) {
    const kws = vibes
      .flatMap((v) => VIBE_KEYWORDS[v] ?? [v])
      .map((s) => s.toLowerCase());
    const matched = pins.filter((p) => {
      const t = p.t.toLowerCase();
      return kws.some((kw) => t.includes(kw));
    });
    if (matched.length) return spread(matched);
  }
  return spread(pins);
}
