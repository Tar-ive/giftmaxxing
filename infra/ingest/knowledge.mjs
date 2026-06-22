// Gift-knowledge miner.
//
// Reddit is the KNOWLEDGE source, not a product catalog. This reads the scraped
// discussions and learns, per recipient (mom, girlfriend, coworker, ...):
//   • which gift IDEAS people actually recommend (ranked, with example threads)
//   • which ideas get suggested TOGETHER (co-occurrence bundles)
//
// Output: knowledge.json -> { recipients: [{ recipient, postCount, ideas[], bundles[] }] }
// Exports buildKnowledge() so the ingest step can write it to DynamoDB.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichRecord } from "./enrich.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rx = (words) => new RegExp(`(?:^|[^a-z])(?:${words.map(esc).join("|")})(?:[^a-z]|$)`, "i");

// Gift-idea lexicon: [key, label, emoji, category, [match keywords]].
// Keys are canonical; keywords are matched as whole words in title + body.
const GIFT_ITEMS = [
  // tech
  ["headphones", "Headphones", "🎧", "tech", ["headphones", "headphone", "earbuds", "earphones", "airpods"]],
  ["speaker", "Bluetooth speaker", "🔊", "tech", ["speaker", "bluetooth speaker", "soundbar"]],
  ["smartwatch", "Smartwatch", "⌚", "tech", ["smartwatch", "smart watch", "apple watch", "fitbit", "garmin"]],
  ["kindle", "E-reader", "📱", "tech", ["kindle", "e-reader", "ereader", "ebook reader"]],
  ["console", "Gaming console", "🎮", "tech", ["console", "playstation", "ps5", "xbox", "nintendo switch", "steam deck", "gaming"]],
  ["keyboard", "Mechanical keyboard", "⌨️", "tech", ["mechanical keyboard", "keyboard", "keycaps"]],
  ["camera", "Instant camera", "📷", "tech", ["camera", "polaroid", "instax", "instant camera", "film camera"]],
  ["projector", "Projector", "📽️", "tech", ["projector", "mini projector"]],
  ["powerbank", "Power bank", "🔋", "tech", ["power bank", "powerbank", "portable charger"]],
  ["smartbulb", "Smart lights", "💡", "tech", ["smart bulb", "smart light", "led strip", "govee", "nanoleaf"]],
  // home
  ["candle", "Candle", "🕯️", "home", ["candle", "soy candle", "scented candle"]],
  ["blanket", "Cozy blanket", "🧣", "home", ["blanket", "throw blanket", "weighted blanket", "heated blanket"]],
  ["plant", "Plant", "🪴", "home", ["plant", "succulent", "monstera", "houseplant", "bonsai"]],
  ["frame", "Photo frame", "🖼️", "home", ["picture frame", "photo frame", "digital frame", "nixplay"]],
  ["lamp", "Lamp", "🪔", "home", ["lamp", "sunset lamp", "salt lamp", "night light"]],
  ["diffuser", "Diffuser", "🌫️", "home", ["diffuser", "essential oil diffuser", "humidifier"]],
  ["mug", "Mug", "☕", "kitchen", ["mug", "coffee mug", "mug warmer"]],
  ["coffee", "Coffee gear", "☕", "kitchen", ["coffee maker", "espresso", "french press", "moka pot", "aeropress", "coffee grinder"]],
  ["tumbler", "Tumbler / bottle", "🥤", "kitchen", ["tumbler", "water bottle", "stanley", "hydro flask", "yeti"]],
  ["knife", "Knife set", "🔪", "kitchen", ["knife set", "chef knife", "kitchen knife", "santoku"]],
  ["cookbook", "Cookbook", "📕", "kitchen", ["cookbook", "recipe book"]],
  ["castiron", "Cast iron / cookware", "🍳", "kitchen", ["cast iron", "dutch oven", "skillet", "cookware"]],
  ["teaset", "Tea set", "🍵", "kitchen", ["tea set", "matcha", "teapot", "tea sampler"]],
  ["airfryer", "Air fryer", "🍟", "kitchen", ["air fryer", "airfryer", "blender", "ninja creami"]],
  // beauty / self-care
  ["perfume", "Perfume / cologne", "🌸", "beauty", ["perfume", "cologne", "fragrance", "eau de parfum"]],
  ["skincare", "Skincare set", "🧴", "beauty", ["skincare", "skin care", "serum", "moisturizer", "face mask"]],
  ["bath", "Bath set", "🛁", "beauty", ["bath bomb", "bath set", "bath salts", "spa set"]],
  ["robe", "Robe / slippers", "🥿", "beauty", ["robe", "slippers", "bathrobe"]],
  ["massagegun", "Massage gun", "💆", "beauty", ["massage gun", "theragun", "massager"]],
  // jewelry / accessories
  ["necklace", "Necklace", "📿", "jewelry", ["necklace", "pendant", "locket"]],
  ["bracelet", "Bracelet", "💫", "jewelry", ["bracelet", "bangle"]],
  ["ring", "Ring", "💍", "jewelry", ["ring"]],
  ["earrings", "Earrings", "👂", "jewelry", ["earrings", "earring", "studs"]],
  ["watch", "Watch", "⌚", "jewelry", ["watch", "wristwatch"]],
  ["wallet", "Wallet", "👛", "fashion", ["wallet", "card holder"]],
  ["bag", "Bag / backpack", "🎒", "fashion", ["backpack", "tote bag", "handbag", "purse", "duffel"]],
  ["scarf", "Scarf", "🧣", "fashion", ["scarf", "pashmina"]],
  ["sunglasses", "Sunglasses", "🕶️", "fashion", ["sunglasses", "shades"]],
  ["socks", "Fun socks", "🧦", "fashion", ["socks", "fun socks", "novelty socks"]],
  ["beanie", "Beanie / gloves", "🧤", "fashion", ["beanie", "gloves", "mittens"]],
  ["cufflinks", "Cufflinks", "🔗", "fashion", ["cufflinks", "tie clip", "tie bar"]],
  // books / stationery
  ["book", "Book", "📚", "books", ["book", "novel", "memoir"]],
  ["journal", "Journal", "📓", "books", ["journal", "notebook", "diary"]],
  ["planner", "Planner", "🗓️", "books", ["planner", "agenda"]],
  ["pen", "Fountain pen", "🖋️", "books", ["fountain pen", "nice pen"]],
  // hobby / games
  ["boardgame", "Board game", "🎲", "games", ["board game", "boardgame", "tabletop", "card game", "catan"]],
  ["puzzle", "Puzzle", "🧩", "games", ["puzzle", "jigsaw"]],
  ["lego", "LEGO set", "🧱", "games", ["lego", "building set", "brick set"]],
  ["vinyl", "Vinyl record", "🎶", "music", ["vinyl", "record player", "turntable", "vinyl record"]],
  ["instrument", "Instrument", "🎸", "music", ["guitar", "ukulele", "kalimba", "keyboard piano", "harmonica"]],
  ["artset", "Art / craft set", "🎨", "art_handmade", ["art set", "paint by numbers", "watercolor", "sketchbook", "craft kit", "pottery kit"]],
  ["modelkit", "Model kit", "🛠️", "games", ["model kit", "gunpla", "scale model", "diorama"]],
  // consumables / experiences
  ["chocolate", "Chocolate / sweets", "🍫", "food", ["chocolate", "candy", "sweets", "truffles"]],
  ["whiskey", "Whiskey / spirits", "🥃", "drinkware", ["whiskey", "whisky", "bourbon", "scotch", "spirits"]],
  ["wine", "Wine", "🍷", "drinkware", ["wine", "champagne", "prosecco"]],
  ["barware", "Barware", "🍸", "drinkware", ["cocktail set", "bar set", "barware", "decanter", "flask", "whiskey stones"]],
  ["hotsauce", "Hot sauce / snacks", "🌶️", "food", ["hot sauce", "snack box", "jerky", "spice set", "seasoning"]],
  ["coffeebeans", "Coffee / tea beans", "🫘", "food", ["coffee beans", "coffee subscription", "tea sampler"]],
  ["giftcard", "Gift card", "🎟️", "experience", ["gift card", "giftcard"]],
  ["flowers", "Flowers", "💐", "experience", ["flowers", "bouquet", "roses"]],
  ["experience", "Experience / class", "🎟️", "experience", ["concert tickets", "experience", "cooking class", "spa day", "workshop", "masterclass"]],
  // outdoors / fitness
  ["yoga", "Yoga mat", "🧘", "fitness", ["yoga mat", "yoga set"]],
  ["weights", "Weights / fitness", "🏋️", "fitness", ["dumbbell", "kettlebell", "resistance band", "weights"]],
  ["hammock", "Hammock", "🌴", "outdoors", ["hammock"]],
  ["camping", "Camping gear", "🏕️", "outdoors", ["camping", "tent", "sleeping bag", "cooler"]],
  ["multitool", "Multitool / knife", "🔧", "outdoors", ["multitool", "pocket knife", "swiss army", "leatherman"]],
  ["flashlight", "Flashlight", "🔦", "outdoors", ["flashlight", "headlamp", "lantern"]],
  // personalized / handmade
  ["starmap", "Custom star map", "🌌", "personalized", ["star map", "starmap", "constellation map", "night sky print"]],
  ["portrait", "Custom portrait", "🖼️", "personalized", ["custom portrait", "custom illustration", "pet portrait", "caricature", "commissioned"]],
  ["engraved", "Engraved keepsake", "✒️", "personalized", ["engraved", "engraving", "personalized", "monogram", "custom name"]],
  ["photobook", "Photo book", "📔", "personalized", ["photo book", "photobook", "scrapbook", "photo album"]],
  ["map", "Custom map / print", "🗺️", "personalized", ["custom map", "city map", "map print", "location print"]],
];

// Recipients we surface in the UI (skip "anyone" from the picker, keep as pool).
const RECIPIENT_LABELS = {
  mom: "Mom", dad: "Dad", wife: "Wife", husband: "Husband",
  girlfriend: "Girlfriend", boyfriend: "Boyfriend", partner: "Partner",
  couple: "A couple", sister: "Sister", brother: "Brother",
  daughter: "Daughter", son: "Son", parents: "Parents",
  grandma: "Grandma", grandpa: "Grandpa", kids: "Kids", teen: "Teen",
  friend: "Friend", coworker: "Coworker", teacher: "Teacher",
  men: "Him", women: "Her", self: "Myself", anyone: "Anyone",
};

// Which gift items appear in a post (set of keys).
function itemsIn(text) {
  const hits = [];
  for (const [key, , , , kw] of GIFT_ITEMS) {
    if (rx(kw).test(text)) hits.push(key);
  }
  return hits;
}

const ITEM_META = Object.fromEntries(
  GIFT_ITEMS.map(([key, label, emoji, category]) => [key, { key, label, emoji, category }])
);

const scoreWeight = (score) => 1 + Math.log10(1 + Math.max(0, Number(score) || 0));

const snippet = (s) => (s || "").replace(/\s+/g, " ").trim().slice(0, 160);

// Quality guardrails for the shipped knowledge base.
const MIN_IDEA_COUNT = 2; // an idea must be suggested >=2x to be surfaced
const MIN_RECIPIENT_IDEAS = 3; // hide very thin recipients (not enough signal)
const ADULT_ONLY = new Set(["wine", "whiskey", "barware"]); // age-gated items
const CHILD_RECIPIENTS = new Set(["kids", "teen"]); // never get age-gated items

export function buildKnowledge(records, commentRecords = []) {
  // recipient -> { postCount, items: Map(key -> {count, weight, examples[]}) }
  const byRecipient = {};
  // global co-occurrence: "a|b" -> count (items mentioned together)
  const cooc = new Map();
  const slotFor = (recipient) => (byRecipient[recipient] ||= { postCount: 0, items: new Map() });

  const addItem = (slot, key, weight, example) => {
    const it = slot.items.get(key) || { count: 0, weight: 0, examples: [] };
    it.count++;
    it.weight += weight;
    if (example && it.examples.length < 3 && !it.examples.some((e) => e.quote === example.quote && e.url === example.url)) {
      it.examples.push(example);
    }
    slot.items.set(key, it);
  };
  const addCooc = (items) => {
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const pair = [items[i], items[j]].sort().join("|");
        cooc.set(pair, (cooc.get(pair) || 0) + 1);
      }
  };

  // 1) submissions — the gift named/showcased in the post itself
  for (const r of records) {
    if (r.nsfw) continue;
    const text = `${r.name || ""}\n${r.selftext || ""}`.toLowerCase();
    const recipient = (r.__enriched ?? enrichRecord(r)).recipient;
    const items = itemsIn(text);
    if (items.length === 0) continue;
    const slot = slotFor(recipient);
    slot.postCount++;
    const w = scoreWeight(r.score);
    for (const key of items) addItem(slot, key, w, { title: r.name, url: r.url, score: r.score || 0 });
    addCooc(items);
  }

  // 2) comments — the actual "you should give them X" suggestions (primary signal)
  for (const t of commentRecords) {
    const slot = slotFor(t.recipient);
    let contributed = false;
    for (const c of t.comments || []) {
      const items = itemsIn((c.body || "").toLowerCase());
      if (items.length === 0) continue;
      contributed = true;
      const w = scoreWeight(c.score) * 1.5;
      for (const key of items) {
        addItem(slot, key, w, { title: t.title, url: t.url, score: c.score || 0, quote: snippet(c.body) });
      }
      addCooc(items); // items co-mentioned in one comment = a genuine pairing
    }
    if (contributed) slot.postCount++;
  }

  // strongest co-occurring partner for an item (from global cooc)
  const partnersOf = (key, exclude = new Set()) => {
    const parts = [];
    for (const [pair, count] of cooc) {
      const [a, b] = pair.split("|");
      if (a === key && !exclude.has(b)) parts.push([b, count]);
      else if (b === key && !exclude.has(a)) parts.push([a, count]);
    }
    return parts.sort((x, y) => y[1] - x[1]);
  };

  const recipients = [];
  for (const [recipient, slot] of Object.entries(byRecipient)) {
    const childSafe = CHILD_RECIPIENTS.has(recipient);
    const ideas = [...slot.items.entries()]
      .filter(([key, v]) => v.count >= MIN_IDEA_COUNT && !(childSafe && ADULT_ONLY.has(key)))
      .map(([key, v]) => ({ ...ITEM_META[key], count: v.count, weight: Math.round(v.weight * 10) / 10, examples: v.examples }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 12);

    // Hide very thin recipients — need a few solid, repeated ideas to be useful.
    if (ideas.length < MIN_RECIPIENT_IDEAS) continue;

    // bundles: take top ideas, attach their best co-occurring partner
    const topKeys = ideas.slice(0, 8).map((i) => i.key);
    const seen = new Set();
    const bundles = [];
    for (const seed of topKeys) {
      const partner = partnersOf(seed, new Set([seed])).find(([k, c]) => topKeys.includes(k) && c >= 2);
      if (!partner) continue;
      const id = [seed, partner[0]].sort().join("|");
      if (seen.has(id)) continue;
      seen.add(id);
      bundles.push({
        items: [ITEM_META[seed], ITEM_META[partner[0]]].map(({ key, label, emoji }) => ({ key, label, emoji })),
        score: partner[1],
        why: "Often suggested together",
      });
      if (bundles.length >= 4) break;
    }
    // fallback: a "popular picks" bundle from distinct categories
    if (bundles.length === 0 && ideas.length >= 3) {
      const distinct = [];
      const cats = new Set();
      for (const i of ideas) {
        if (cats.has(i.category)) continue;
        cats.add(i.category);
        distinct.push({ key: i.key, label: i.label, emoji: i.emoji });
        if (distinct.length >= 3) break;
      }
      bundles.push({ items: distinct, score: 0, why: "Popular picks for this person" });
    }

    recipients.push({
      recipient,
      label: RECIPIENT_LABELS[recipient] ?? recipient,
      postCount: slot.postCount,
      ideas,
      bundles,
    });
  }

  recipients.sort((a, b) => b.postCount - a.postCount);
  return { generatedAt: new Date().toISOString(), recipients };
}

function printRecipient(r) {
  console.log(`\n### ${r.label}  (${r.postCount} posts)`);
  console.log("  ideas: " + r.ideas.slice(0, 8).map((i) => `${i.emoji} ${i.label}(${i.count})`).join(", "));
  for (const b of r.bundles) {
    console.log(`  bundle [${b.why}]: ` + b.items.map((i) => `${i.emoji} ${i.label}`).join(" + "));
  }
}

async function main() {
  const inFile = join(__dirname, "..", "..", "web", "lib", "reddit-gifts.json");
  const records = JSON.parse(await readFile(inFile, "utf8")).map((r) => ({ ...r, __enriched: enrichRecord(r) }));
  let comments = [];
  try {
    comments = JSON.parse(await readFile(join(__dirname, "reddit-comments.json"), "utf8"));
  } catch {
    console.warn("(no reddit-comments.json yet — mining submissions only)");
  }
  const kb = buildKnowledge(records, comments);
  const out = join(__dirname, "knowledge.json");
  await writeFile(out, JSON.stringify(kb, null, 2) + "\n");

  console.log(`Built knowledge for ${kb.recipients.length} recipients from ${records.length} posts + ${comments.length} comment threads.`);
  const show = ["mom", "dad", "girlfriend", "boyfriend", "wife", "husband", "couple", "coworker", "friend", "kids"];
  for (const key of show) {
    const r = kb.recipients.find((x) => x.recipient === key);
    if (r) printRecipient(r);
  }
  console.log(`\nWrote ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
