// Generate an editable PPTX from the Giftmaxxing pitch deck.
// Usage: node generate-pptx.mjs [output.pptx]
import PptxGenJS from "pptxgenjs";

const OUT = process.argv[2] || "Giftmaxxing-Pitch-Deck.pptx";

const pptx = new PptxGenJS();
pptx.author = "Giftmaxxing";
pptx.title = "Giftmaxxing Pitch Deck";
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in

// ── Brand tokens ─────────────────────────────────────────────
const C = {
  cream: "F7F2EB", bg: "FBF7F1", white: "FFFFFF",
  ink: "211A14", inkSoft: "6C6157", inkFaint: "9C9389", line: "E8E0D5",
  coral: "FB6F52", coralInk: "3A1206", coralSoft: "FDE7E0",
  peach: "FFD3A5", rose: "FFC2D1", butter: "FFE7A0",
  lilac: "D9C2FF", sky: "BFE3FF", sage: "CDE6C5",
};
const FONT = "Calibri";
const SERIF = "Georgia";
const MONO = "Consolas";

// Helpers
const footer = (slide, label) => {
  slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 6.7, w: 12.1, h: 0, line: { color: C.line, width: 1 } });
  slide.addText([
    { text: "Gift", options: { bold: true, fontSize: 11, color: C.ink } },
    { text: "maxxing", options: { bold: true, fontSize: 11, color: C.coral } },
  ], { x: 0.6, y: 6.75, w: 2, h: 0.4, fontFace: FONT });
  slide.addText(label, { x: 9, y: 6.75, w: 3.7, h: 0.4, align: "right", fontSize: 10, fontFace: MONO, color: C.inkFaint });
};

const eyebrow = (slide, text, y = 0.5) => {
  slide.addText(text.toUpperCase(), { x: 0.6, y, w: 5, h: 0.35, fontSize: 11, fontFace: MONO, color: C.inkFaint, letterSpacing: 4 });
  slide.addShape(pptx.ShapeType.line, { x: 0.6, y: y + 0.02, w: 0.4, h: 0, line: { color: C.coral, width: 2 } });
};

const card = (slide, x, y, w, h, opts = {}) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.2,
    fill: { color: opts.fill || C.white },
    line: { color: opts.border || C.line, width: 1 },
    shadow: { type: "outer", blur: 8, offset: 3, color: "000000", opacity: 0.06 },
  });
};

// ════════════════ SLIDE 1 — COVER ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "Pitch deck \u00b7 2026");
  s.addText([
    { text: "Gifting,\nmade ", options: { fontSize: 54, fontFace: SERIF, color: C.ink } },
    { text: "effortless", options: { fontSize: 54, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 54, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 6.2, h: 2.0, lineSpacingMultiple: 0.95 });
  s.addText("Maxi is an AI gift companion and a taste-learning feed that turns thoughtful gift-giving from a rare skill into a commodity \u2014 for everyone.", {
    x: 0.6, y: 3.1, w: 5.8, h: 1.0, fontSize: 16, fontFace: FONT, color: C.inkSoft, lineSpacingMultiple: 1.4,
  });
  // Tags
  ["AI companion", "Taste feed", "Group gifts"].forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.6 + i * 1.7, y: 4.3, w: 1.5, h: 0.38, rectRadius: 0.19, fill: { color: C.white }, line: { color: C.line, width: 1 } });
    s.addText(t, { x: 0.6 + i * 1.7, y: 4.3, w: 1.5, h: 0.38, align: "center", fontSize: 11, fontFace: FONT, bold: true, color: C.inkSoft });
  });
  // Product mock card
  card(s, 7.8, 1.2, 4.6, 4.8);
  s.addText("Maya Reyes", { x: 8.4, y: 1.5, w: 2.5, h: 0.3, fontSize: 13, fontFace: FONT, bold: true, color: C.ink });
  s.addText("posted a find \u00b7 12m", { x: 8.4, y: 1.8, w: 2.5, h: 0.25, fontSize: 10, color: C.inkFaint });
  s.addText("\u2665", { x: 11.6, y: 1.5, w: 0.5, h: 0.35, fontSize: 18, color: C.coral, align: "center" });
  s.addText("genuinely the move for anyone turning 22.\npoint-and-shoot szn is back \ud83d\udcf7", { x: 8.1, y: 2.2, w: 4.0, h: 0.6, fontSize: 11, color: C.inkSoft, lineSpacingMultiple: 1.3 });
  // Product tile
  s.addShape(pptx.ShapeType.roundRect, { x: 8.1, y: 3.0, w: 4.0, h: 1.8, rectRadius: 0.15, fill: { color: C.peach } });
  s.addText("\ud83d\udcf7", { x: 11.0, y: 3.1, w: 0.8, h: 0.6, fontSize: 32 });
  s.addText("Kodak M35 Film Camera", { x: 8.3, y: 4.0, w: 3.0, h: 0.3, fontSize: 13, fontFace: FONT, bold: true, color: C.coralInk });
  s.addText("$48", { x: 8.3, y: 4.3, w: 1.5, h: 0.3, fontSize: 15, fontFace: FONT, bold: true, color: C.coralInk });
  // Maxi bubble
  card(s, 7.2, 5.0, 4.2, 0.8);
  s.addShape(pptx.ShapeType.ellipse, { x: 7.4, y: 5.15, w: 0.45, h: 0.45, fill: { color: C.coral } });
  s.addText("Maya\u2019s birthday is in 4 days \ud83c\udf88 I lined up 7 ideas in your $60 budget.", {
    x: 8.0, y: 5.05, w: 3.2, h: 0.7, fontSize: 10, color: C.ink, lineSpacingMultiple: 1.3,
  });
  footer(s, "01");
}

// ════════════════ SLIDE 2 — PROBLEM ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "The problem");
  s.addText([
    { text: "A good gift is real ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "work", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 10, h: 0.8 });
  s.addText("A present that actually lands takes time, attention, and genuinely knowing someone. Most people don\u2019t have all three \u2014 so gifting becomes a chore.", {
    x: 0.6, y: 1.9, w: 9, h: 0.8, fontSize: 16, color: C.inkSoft, lineSpacingMultiple: 1.4,
  });
  const problems = [
    ["\u23f3", "It takes time", "Dozens of tabs, endless scrolling, and second-guessing \u2014 for one halfway-decent idea."],
    ["\ud83e\udde0", "It takes insight", "You have to read someone\u2019s taste \u2014 their vibe, not just the wishlist they never update."],
    ["\ud83e\udd1d", "It takes coordination", "Group gifts mean spreadsheets, chasing Venmo, and one person fronting the cost."],
  ];
  problems.forEach(([ico, title, desc], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 3.0, 3.8, 2.8);
    s.addText(ico, { x: x + 0.2, y: 3.2, w: 0.6, h: 0.5, fontSize: 24 });
    s.addText(title, { x: x + 0.2, y: 3.8, w: 3.4, h: 0.5, fontSize: 22, fontFace: SERIF, color: C.ink });
    s.addText(desc, { x: x + 0.2, y: 4.4, w: 3.4, h: 1.2, fontSize: 13, color: C.inkSoft, lineSpacingMultiple: 1.35 });
  });
  s.addText("The result: forgettable gifts \u2014 or a last-minute gift card.", {
    x: 0.6, y: 6.1, w: 10, h: 0.4, fontSize: 14, color: C.inkSoft,
  });
  footer(s, "Problem \u00b7 02");
}

// ════════════════ SLIDE 3 — INSIGHT ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "The insight", 2.0);
  s.addText([
    { text: "Gift-giving is a ", options: { fontSize: 54, fontFace: SERIF, color: C.ink } },
    { text: "skill", options: { fontSize: 54, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 54, fontFace: SERIF, color: C.ink } },
  ], { x: 1.5, y: 2.5, w: 10.3, h: 1.0, align: "center" });
  s.addText("Some people just have it \u2014 they notice, they remember, they nail the thing you didn\u2019t know you wanted. Most of us don\u2019t, or can\u2019t spare the hours. So great gifting stays a privilege of the thoughtful and the time-rich.", {
    x: 2, y: 3.7, w: 9.3, h: 1.2, align: "center", fontSize: 16, color: C.inkSoft, lineSpacingMultiple: 1.4,
  });
  s.addText([
    { text: "What if it could be a ", options: { fontSize: 38, fontFace: SERIF, color: C.coral } },
    { text: "commodity?", options: { fontSize: 38, fontFace: SERIF, color: C.coral, italic: true } },
  ], { x: 1.5, y: 5.2, w: 10.3, h: 0.8, align: "center" });
  footer(s, "Insight \u00b7 03");
}

// ════════════════ SLIDE 4 — SOLUTION ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "The solution");
  s.addText([
    { text: "We make the skill a ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "commodity", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 10, h: 0.8 });
  s.addText("Meet Maxi \u2014 an AI gift companion wrapped in a taste-learning feed. Anyone can give like the most thoughtful person they know.", {
    x: 0.6, y: 1.9, w: 9, h: 0.7, fontSize: 16, color: C.inkSoft, lineSpacingMultiple: 1.4,
  });
  const solutions = [
    ["\ud83d\udc40", "Learns taste", "From swipes, a linked Pinterest, and the finds you save \u2014 Maxi learns the vibe, not just a wishlist.", false],
    ["\ud83c\udfaf", "Finds the gift", "Real, buyable products in your budget \u2014 each with a reason you can trust.", true],
    ["\u2728", "Makes it effortless", "Save, claim, and group-gift in a tap. Reminders mean you never panic-buy again.", false],
  ];
  solutions.forEach(([ico, title, desc, accent], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 2.9, 3.8, 2.8, accent ? { border: "FB6F52" } : {});
    s.addText(ico, { x: x + 0.2, y: 3.1, w: 0.6, h: 0.5, fontSize: 24 });
    s.addText(title, { x: x + 0.2, y: 3.7, w: 3.4, h: 0.5, fontSize: 22, fontFace: SERIF, color: C.ink });
    s.addText(desc, { x: x + 0.2, y: 4.3, w: 3.4, h: 1.2, fontSize: 13, color: C.inkSoft, lineSpacingMultiple: 1.35 });
  });
  s.addText("The thought, the taste, the timing \u2014 handled.", { x: 0.6, y: 6.0, w: 10, h: 0.4, fontSize: 14, color: C.inkSoft });
  footer(s, "Solution \u00b7 04");
}

// ════════════════ SLIDE 5 — HOW IT WORKS ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "How it works");
  s.addText([
    { text: "Connect. Discover. ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "Give.", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
  ], { x: 0.6, y: 1.0, w: 10, h: 0.8 });
  const steps = [
    ["01", "Connect", "their taste", "Link a friend\u2019s Pinterest, Spotify, or just their saved finds. Maxi quietly learns what they\u2019re actually into."],
    ["02", "Discover", "the gift", "Browse the feed or ask Maxi. Get ideas matched to their taste and your budget \u2014 no more guessing."],
    ["03", "Give", "together", "Buy it solo or pool money with the group. Track it, ship it, and watch them light up."],
  ];
  steps.forEach(([num, title, sub, desc], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 2.2, 3.8, 3.8);
    s.addText(num, { x: x + 0.3, y: 2.5, w: 1, h: 0.5, fontSize: 30, fontFace: SERIF, color: C.coral });
    s.addText(title, { x: x + 0.3, y: 3.1, w: 3.2, h: 0.5, fontSize: 24, fontFace: SERIF, color: C.ink });
    s.addText(sub, { x: x + 0.3, y: 3.6, w: 3.2, h: 0.35, fontSize: 16, fontFace: SERIF, color: C.inkFaint });
    s.addText(desc, { x: x + 0.3, y: 4.1, w: 3.2, h: 1.5, fontSize: 13, color: C.inkSoft, lineSpacingMultiple: 1.35 });
  });
  footer(s, "How it works \u00b7 05");
}

// ════════════════ SLIDE 6 — PRODUCT ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "The product");
  s.addText([
    { text: "A companion, not a ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "catalog", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 10, h: 0.8 });
  const features = [
    ["\ud83d\udecd\ufe0f", "Taste feed", "An Instagram-style feed of gift-worthy finds, ranked to each person."],
    ["\ud83e\udd16", "Maxi, your AI companion", "Chat or talk: ask for ideas, add to cart, check out \u2014 in budget."],
    ["\ud83d\udd25", "Swipe to train", "\u201cWould you want this gifted to you?\u201d \u2014 every swipe sharpens the recs."],
    ["\ud83d\udcf8", "Visual search", "Snap a photo, get buyable lookalikes \u2014 \u201cGoogle Lens for gifts.\u201d"],
    ["\ud83d\udc6f", "Group gifts & pools", "Chip in together with a live ledger and a deadline."],
    ["\ud83c\udf81", "Drops", "Curated, themed bundles built to hit a target budget."],
  ];
  features.forEach(([ico, title, desc], i) => {
    const y = 2.0 + i * 0.7;
    s.addText(ico, { x: 0.6, y, w: 0.5, h: 0.5, fontSize: 18 });
    s.addText(title, { x: 1.2, y, w: 3, h: 0.28, fontSize: 14, fontFace: FONT, bold: true, color: C.ink });
    s.addText(desc, { x: 1.2, y: y + 0.28, w: 5, h: 0.32, fontSize: 11, color: C.inkSoft });
  });
  // Maxi chat mock
  card(s, 7.5, 2.0, 5.0, 4.2);
  s.addShape(pptx.ShapeType.roundRect, { x: 8.8, y: 2.3, w: 3.4, h: 0.7, rectRadius: 0.15, fill: { color: C.coral } });
  s.addText("Something for my sister \u2014 she\u2019s obsessed with matcha. Under $50?", { x: 8.9, y: 2.35, w: 3.2, h: 0.6, fontSize: 11, color: "FFFFFF", bold: true, lineSpacingMultiple: 1.2 });
  s.addShape(pptx.ShapeType.ellipse, { x: 7.8, y: 3.3, w: 0.45, h: 0.45, fill: { color: C.coral } });
  s.addShape(pptx.ShapeType.roundRect, { x: 8.4, y: 3.2, w: 3.8, h: 0.7, rectRadius: 0.15, fill: { color: C.bg }, line: { color: C.line, width: 1 } });
  s.addText("Found 3 she\u2019d love \ud83c\udf75 Top pick, in budget:", { x: 8.5, y: 3.3, w: 3.6, h: 0.5, fontSize: 11, color: C.ink });
  s.addShape(pptx.ShapeType.roundRect, { x: 7.8, y: 4.2, w: 4.4, h: 1.6, rectRadius: 0.15, fill: { color: C.sage } });
  s.addText("\ud83c\udf75", { x: 11.0, y: 4.3, w: 0.8, h: 0.5, fontSize: 28 });
  s.addText("Ceremonial Matcha Starter Kit", { x: 8.0, y: 5.1, w: 3.0, h: 0.3, fontSize: 13, bold: true, color: "173A1C" });
  s.addText("$42", { x: 8.0, y: 5.4, w: 1, h: 0.3, fontSize: 15, bold: true, color: "173A1C" });
  footer(s, "Product \u00b7 06");
}

// ════════════════ SLIDE 7 — WHY NOW ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "Why now");
  s.addText([
    { text: "Three tailwinds, all at ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "once", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 10, h: 0.8 });
  const whynow = [
    ["\ud83e\udd16", "AI got cheap", "Embedding 10k gift ideas costs \u2248 $0.60 on Amazon Bedrock \u2014 no idle servers, pay per call. Taste-matching is finally affordable at consumer scale."],
    ["\ud83d\uded2", "Social shopping is proven", "Pinterest (shopping ads) and LTK (creator affiliate at scale) prove feed + affiliate + native ads works. The monetization playbook already exists."],
    ["\ud83c\udf81", "Gifting is still a utility", "Most incumbents are static wishlists or one-off quizzes \u2014 none is a social, taste-learning feed. That\u2019s wide-open whitespace."],
  ];
  whynow.forEach(([ico, title, desc], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 2.2, 3.8, 3.4);
    s.addText(ico, { x: x + 0.2, y: 2.4, w: 0.6, h: 0.5, fontSize: 24 });
    s.addText(title, { x: x + 0.2, y: 3.0, w: 3.4, h: 0.5, fontSize: 22, fontFace: SERIF, color: C.ink });
    s.addText(desc, { x: x + 0.2, y: 3.6, w: 3.4, h: 1.8, fontSize: 13, color: C.inkSoft, lineSpacingMultiple: 1.35 });
  });
  s.addText("Cheap intelligence, a proven model, and a category no one has made social \u2014 that\u2019s the window.", {
    x: 0.6, y: 6.0, w: 10, h: 0.4, fontSize: 14, color: C.inkSoft,
  });
  footer(s, "Why now \u00b7 07");
}

// ════════════════ SLIDE 8 — ARCHITECTURE ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "Architecture");
  s.addText([
    { text: "DynamoDB at the ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "core", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 7, h: 0.8 });

  // Tags
  ["PAY_PER_REQUEST", "PITR backups", "$1k kill-switch"].forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 8.2 + i * 1.8, y: 1.15, w: 1.6, h: 0.35, rectRadius: 0.17, fill: { color: C.white }, line: { color: C.line, width: 1 } });
    s.addText(t, { x: 8.2 + i * 1.8, y: 1.15, w: 1.6, h: 0.35, align: "center", fontSize: 9, fontFace: MONO, color: C.inkSoft });
  });

  // Service boxes — row 1
  const svcY = 1.9;
  const svcH = 0.9;
  const svcs = [
    { x: 0.8,  w: 1.6, fill: "F0EAE3", border: C.line, ico: "\ud83c\udf10", label: "Next.js", sub: "Vercel" },
    { x: 3.2,  w: 1.6, fill: "D9C2FF", border: "C4A6F5", ico: "\ud83d\udd11", label: "Clerk", sub: "JWT auth" },
    { x: 5.6,  w: 1.8, fill: "BFE3FF", border: "8EC4F4", ico: "\ud83d\udeaa", label: "API Gateway", sub: "HTTP API" },
    { x: 8.2,  w: 2.0, fill: "FFE3C2", border: "F0B878", ico: "\u26a1", label: "Lambda", sub: "Node 20 \u00b7 256 MB" },
  ];
  svcs.forEach((v) => {
    s.addShape(pptx.ShapeType.roundRect, { x: v.x, y: svcY, w: v.w, h: svcH, rectRadius: 0.12, fill: { color: v.fill }, line: { color: v.border, width: 1 } });
    s.addText(v.ico, { x: v.x, y: svcY + 0.05, w: v.w, h: 0.35, align: "center", fontSize: 18 });
    s.addText(v.label, { x: v.x, y: svcY + 0.38, w: v.w, h: 0.22, align: "center", fontSize: 10, fontFace: MONO, bold: true });
    s.addText(v.sub, { x: v.x, y: svcY + 0.58, w: v.w, h: 0.2, align: "center", fontSize: 8, color: C.inkFaint });
  });

  // Arrows between services
  [2.5, 4.9, 7.5].forEach((ax) => {
    s.addText("\u2192", { x: ax, y: svcY + 0.2, w: 0.6, h: 0.4, align: "center", fontSize: 18, color: C.inkFaint });
  });

  // Down arrows
  s.addText("\u2193", { x: 3.5, y: 2.9, w: 0.6, h: 0.4, align: "center", fontSize: 18, color: "4A9DE0" });
  s.addText("\u2193", { x: 7.0, y: 2.9, w: 0.6, h: 0.4, align: "center", fontSize: 18, color: "82C47A" });
  s.addText("\u2193", { x: 10.2, y: 2.9, w: 0.6, h: 0.4, align: "center", fontSize: 18, color: "F0A080" });

  // Data stores row
  const dsY = 3.35;
  // DynamoDB — large box
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: dsY, w: 6.0, h: 2.2, rectRadius: 0.15,
    fill: { color: "9ECFFF" }, line: { color: "4A9DE0", width: 1.5 },
    shadow: { type: "outer", blur: 10, offset: 3, color: "4A9DE0", opacity: 0.2 },
  });
  s.addText("\ud83d\uddc4\ufe0f", { x: 3.1, y: dsY + 0.05, w: 0.8, h: 0.35, align: "center", fontSize: 22 });
  s.addText("DynamoDB", { x: 0.8, y: dsY + 0.4, w: 5.6, h: 0.3, align: "center", fontSize: 14, fontFace: MONO, bold: true, color: "0A3A6E" });
  s.addText("8 tables \u00b7 on-demand \u00b7 single-digit ms", { x: 0.8, y: dsY + 0.7, w: 5.6, h: 0.22, align: "center", fontSize: 9, color: "0A3A6E" });

  // Table pills
  const tables = ["posts", "users", "interactions", "knowledge", "events", "connections", "graph", "config"];
  tables.forEach((t, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const px = 1.0 + col * 1.35;
    const py = dsY + 1.0 + row * 0.35;
    s.addShape(pptx.ShapeType.roundRect, { x: px, y: py, w: 1.2, h: 0.28, rectRadius: 0.06, fill: { color: "FFFFFF", transparency: 45 } });
    s.addText(t, { x: px, y: py, w: 1.2, h: 0.28, align: "center", fontSize: 8, fontFace: MONO, bold: true, color: "0A3A6E" });
  });
  // GSI pills
  const gsis = ["GSI: byFeed", "GSI: byAuthor", "GSI: byScope", "GSI: byEntity"];
  gsis.forEach((g, i) => {
    const px = 0.9 + i * 1.4;
    s.addShape(pptx.ShapeType.roundRect, { x: px, y: dsY + 1.78, w: 1.25, h: 0.28, rectRadius: 0.06, fill: { color: "4A9DE0", transparency: 82 } });
    s.addText(g, { x: px, y: dsY + 1.78, w: 1.25, h: 0.28, align: "center", fontSize: 7, fontFace: MONO, bold: true, italic: true, color: "0A3A6E" });
  });

  // S3 Vectors
  s.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: dsY, w: 2.6, h: 1.4, rectRadius: 0.12, fill: { color: "C0E8B8" }, line: { color: "82C47A", width: 1 } });
  s.addText("\ud83d\udd0d", { x: 7.0, y: dsY + 0.1, w: 2.6, h: 0.35, align: "center", fontSize: 20 });
  s.addText("S3 Vectors", { x: 7.0, y: dsY + 0.45, w: 2.6, h: 0.25, align: "center", fontSize: 11, fontFace: MONO, bold: true, color: "1A4E18" });
  s.addText("kNN similarity\nvisual search", { x: 7.0, y: dsY + 0.72, w: 2.6, h: 0.5, align: "center", fontSize: 8, color: "1A4E18", lineSpacingMultiple: 1.2 });

  // Bedrock
  s.addShape(pptx.ShapeType.roundRect, { x: 10.0, y: dsY, w: 2.6, h: 1.4, rectRadius: 0.12, fill: { color: "FFD4C2" }, line: { color: "F0A080", width: 1 } });
  s.addText("\ud83e\udd16", { x: 10.0, y: dsY + 0.1, w: 2.6, h: 0.35, align: "center", fontSize: 20 });
  s.addText("Bedrock", { x: 10.0, y: dsY + 0.45, w: 2.6, h: 0.25, align: "center", fontSize: 11, fontFace: MONO, bold: true, color: "6E2A0A" });
  s.addText("Titan embeddings\nMaxi (Converse)", { x: 10.0, y: dsY + 0.72, w: 2.6, h: 0.5, align: "center", fontSize: 8, color: "6E2A0A", lineSpacingMultiple: 1.2 });

  // 3 pillar cards at bottom
  const pillars = [
    ["\ud83d\udcca", "Data backbone", "8 on-demand tables with 4 GSIs power the feed, catalog, interactions, and knowledge base \u2014 no scans, just queries.", false],
    ["\ud83e\udde0", "Maxi\u2019s memory", "13 AI tool calls read/write DynamoDB. The graph table stores network, long-term memory, and orders in one single-table design.", true],
    ["\ud83d\udd10", "Auth & identity sync", "Clerk JWT \u2192 Lambda verifies \u2192 DynamoDB upserts identity. Cross-device restore in one GetItem.", false],
  ];
  pillars.forEach(([ico, title, desc, accent], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 5.8, 3.8, 1.15, accent ? { border: "FB6F52" } : {});
    s.addText(ico, { x: x + 0.15, y: 5.9, w: 0.5, h: 0.4, fontSize: 20 });
    s.addText(title, { x: x + 0.65, y: 5.88, w: 2.8, h: 0.32, fontSize: 15, fontFace: SERIF, color: C.ink });
    s.addText(desc, { x: x + 0.65, y: 6.2, w: 3.0, h: 0.65, fontSize: 10, color: C.inkSoft, lineSpacingMultiple: 1.25 });
  });

  footer(s, "Architecture \u00b7 08");
}

// ════════════════ SLIDE 9 — MARKET ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "Market");
  s.addText([
    { text: "Gifting is huge \u2014 and ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "high-intent", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 10, h: 0.8 });
  const markets = [
    ["TAM", "$1T+", "Global consumer gifting", "Everyone buys for someone \u2014 every birthday, holiday, and milestone.", false],
    ["SAM", "$100B+", "U.S. online gifting & social shopping", "The slice a taste-feed + AI companion can realistically win.", false],
    ["SOM \u00b7 BEACHHEAD", "[ target ]", "Gen-Z & millennial gifters", "Your 3-year obtainable share \u2014 fill from the bottoms-up model.", true],
  ];
  markets.forEach(([label, stat, subtitle, desc, accent], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 2.2, 3.8, 3.6, accent ? { border: "FB6F52" } : {});
    s.addText(label, { x: x + 0.3, y: 2.4, w: 3.2, h: 0.3, fontSize: 10, fontFace: MONO, letterSpacing: 3, color: accent ? C.coral : C.inkFaint });
    s.addText(stat, { x: x + 0.3, y: 2.8, w: 3.2, h: 0.8, fontSize: 44, fontFace: SERIF, color: C.ink });
    s.addText(subtitle, { x: x + 0.3, y: 3.7, w: 3.2, h: 0.4, fontSize: 13, color: C.inkSoft });
    s.addText(desc, { x: x + 0.3, y: 4.2, w: 3.2, h: 1.0, fontSize: 13, color: C.inkSoft, lineSpacingMultiple: 1.35 });
  });
  s.addText("Gift shoppers arrive ready to buy \u2014 ideal economics for both affiliate commissions and native ads.", {
    x: 0.6, y: 6.1, w: 10, h: 0.4, fontSize: 14, color: C.inkSoft,
  });
  footer(s, "Market \u00b7 09");
}

// ════════════════ SLIDE 10 — BUSINESS MODEL ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "Business model");
  s.addText([
    { text: "We earn when great gifts get ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "given", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 10, h: 0.8 });
  // Affiliate card
  card(s, 0.6, 2.2, 5.8, 3.0);
  s.addText("\ud83d\udd17", { x: 0.9, y: 2.4, w: 0.6, h: 0.5, fontSize: 24 });
  s.addText("Affiliate \u00b7 transactional", { x: 0.9, y: 2.9, w: 5.2, h: 0.45, fontSize: 22, fontFace: SERIF, color: C.ink });
  s.addText("A cut of every purchase made through an outbound link \u2014 taste-ranked, so people actually buy.", {
    x: 0.9, y: 3.4, w: 5.2, h: 0.6, fontSize: 13, color: C.inkSoft, lineSpacingMultiple: 1.35,
  });
  ["Sovrn / Skimlinks day-one", "eBay \u00b7 Best Buy \u00b7 Etsy", "Amazon / Walmart at scale"].forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 1.0 + i * 2.0, y: 4.2, w: 1.85, h: 0.35, rectRadius: 0.17, fill: { color: C.white }, line: { color: C.line, width: 1 } });
    s.addText(t, { x: 1.0 + i * 2.0, y: 4.2, w: 1.85, h: 0.35, align: "center", fontSize: 9, fontFace: FONT, bold: true, color: C.inkSoft });
  });
  // Native ads card
  card(s, 6.8, 2.2, 5.8, 3.0);
  s.addText("\ud83d\udce3", { x: 7.1, y: 2.4, w: 0.6, h: 0.5, fontSize: 24 });
  s.addText("Native ads \u00b7 brand-paid", { x: 7.1, y: 2.9, w: 5.2, h: 0.45, fontSize: 22, fontFace: SERIF, color: C.ink });
  s.addText("Pinterest-style placements \u2014 same card, ranked by the same taste vector, clearly labeled. Brands pay to be the gift.", {
    x: 7.1, y: 3.4, w: 5.2, h: 0.6, fontSize: 13, color: C.inkSoft, lineSpacingMultiple: 1.35,
  });
  ["Sponsored finds", "Sponsored drops", "Brand gift guides"].forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 7.2 + i * 1.8, y: 4.2, w: 1.6, h: 0.35, rectRadius: 0.17, fill: { color: C.white }, line: { color: C.line, width: 1 } });
    s.addText(t, { x: 7.2 + i * 1.8, y: 4.2, w: 1.6, h: 0.35, align: "center", fontSize: 9, fontFace: FONT, bold: true, color: C.inkSoft });
  });
  s.addText("Double-dip: a brand can pay for placement and we earn on the resulting sale \u2014 high-margin commerce media on high-intent traffic.", {
    x: 0.6, y: 5.6, w: 12, h: 0.5, fontSize: 14, color: C.inkSoft,
  });
  footer(s, "Business model \u00b7 10");
}

// ════════════════ SLIDE 11 — COMPETITION ════════════════
{
  const s = pptx.addSlide({ bkgd: C.cream });
  eyebrow(s, "Competition");
  // Left side
  s.addText([
    { text: "The corner nobody ", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
    { text: "owns", options: { fontSize: 40, fontFace: SERIF, color: C.coral, italic: true } },
    { text: ".", options: { fontSize: 40, fontFace: SERIF, color: C.ink } },
  ], { x: 0.6, y: 1.0, w: 6, h: 0.8 });
  s.addText("Gifting apps are static lists. Social-shopping apps aren\u2019t built for giving. We\u2019re the only taste-feed + AI companion made for gifts.", {
    x: 0.6, y: 1.9, w: 5.5, h: 0.8, fontSize: 14, color: C.inkSoft, lineSpacingMultiple: 1.4,
  });
  const checks = [
    "List-first \u2192 we\u2019re feed-first.",
    "Generic shopping \u2192 we\u2019re gifting-native.",
    "Quiz \u2192 a persistent taste profile.",
  ];
  checks.forEach((t, i) => {
    s.addText("\u2713", { x: 0.6, y: 3.0 + i * 0.4, w: 0.4, h: 0.35, fontSize: 14, bold: true, color: C.coral });
    s.addText(t, { x: 1.1, y: 3.0 + i * 0.4, w: 5, h: 0.35, fontSize: 14, color: C.inkSoft });
  });

  // 2x2 grid
  const gx = 7.2, gy = 1.2, gw = 2.7, gh = 2.2, gg = 0.15;
  // Top-left: AI gift quizzes
  card(s, gx, gy, gw, gh);
  s.addText("AI gift quizzes", { x: gx + 0.2, y: gy + 0.6, w: gw - 0.4, h: 0.35, fontSize: 14, bold: true, color: C.ink });
  s.addText("Gifts.com \u00b7 Giftpack", { x: gx + 0.2, y: gy + 1.0, w: gw - 0.4, h: 0.25, fontSize: 10, color: C.inkFaint });
  s.addText("smart, but one-off lists", { x: gx + 0.2, y: gy + 1.35, w: gw - 0.4, h: 0.25, fontSize: 10, color: C.inkSoft, italic: true });
  // Top-right: Giftmaxxing (us)
  s.addShape(pptx.ShapeType.roundRect, { x: gx + gw + gg, y: gy, w: gw, h: gh, rectRadius: 0.12,
    fill: { color: C.coralSoft }, line: { color: C.coral, width: 1.5 },
    shadow: { type: "outer", blur: 10, offset: 3, color: C.coral, opacity: 0.15 },
  });
  s.addText("\u2605 Giftmaxxing", { x: gx + gw + gg + 0.2, y: gy + 0.6, w: gw - 0.4, h: 0.35, fontSize: 16, bold: true, color: C.coralInk });
  s.addText("feed + AI taste, built for gifting", { x: gx + gw + gg + 0.2, y: gy + 1.1, w: gw - 0.4, h: 0.3, fontSize: 10, bold: true, color: C.coralInk });
  // Bottom-left: Wishlists
  card(s, gx, gy + gh + gg, gw, gh);
  s.addText("Wishlists & registries", { x: gx + 0.2, y: gy + gh + gg + 0.6, w: gw - 0.4, h: 0.35, fontSize: 14, bold: true, color: C.ink });
  s.addText("Elfster \u00b7 Giftster \u00b7 MyRegistry", { x: gx + 0.2, y: gy + gh + gg + 1.0, w: gw - 0.4, h: 0.25, fontSize: 10, color: C.inkFaint });
  s.addText("static, holiday-only", { x: gx + 0.2, y: gy + gh + gg + 1.35, w: gw - 0.4, h: 0.25, fontSize: 10, color: C.inkSoft, italic: true });
  // Bottom-right: Social shopping
  card(s, gx + gw + gg, gy + gh + gg, gw, gh);
  s.addText("Social shopping", { x: gx + gw + gg + 0.2, y: gy + gh + gg + 0.6, w: gw - 0.4, h: 0.35, fontSize: 14, bold: true, color: C.ink });
  s.addText("Pinterest \u00b7 LTK \u00b7 Flip", { x: gx + gw + gg + 0.2, y: gy + gh + gg + 1.0, w: gw - 0.4, h: 0.25, fontSize: 10, color: C.inkFaint });
  s.addText("feeds, but not gifting", { x: gx + gw + gg + 0.2, y: gy + gh + gg + 1.35, w: gw - 0.4, h: 0.25, fontSize: 10, color: C.inkSoft, italic: true });

  // Axis labels
  s.addText("\u2191 AI \u00b7 taste-aware", { x: gx, y: gy - 0.35, w: gw * 2 + gg, h: 0.3, align: "center", fontSize: 9, fontFace: MONO, color: C.inkFaint });
  s.addText("List \u00b7 utility", { x: gx, y: gy + gh * 2 + gg + 0.05, w: 2, h: 0.3, fontSize: 9, fontFace: MONO, color: C.inkFaint });
  s.addText("Feed \u00b7 discovery \u2192", { x: gx + gw * 2 + gg - 2, y: gy + gh * 2 + gg + 0.05, w: 2, h: 0.3, align: "right", fontSize: 9, fontFace: MONO, color: C.inkFaint });
  footer(s, "Competition \u00b7 11");
}

// ── Write ────────────────────────────────────────────────────
await pptx.writeFile({ fileName: OUT });
console.log(`\u2713 wrote ${OUT}`);
