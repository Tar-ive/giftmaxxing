// Giftmaxxing — mock data

// warm gradient pairs for product tiles + avatars (no real imagery available)
const GRADS = {
  peach:   ['#FFD3A5', '#FF9A76'],
  rose:    ['#FFC2D1', '#FF8FA3'],
  butter:  ['#FFE7A0', '#FFC24B'],
  clay:    ['#E8B59A', '#C97B5A'],
  lilac:   ['#D9C2FF', '#A98BFF'],
  sky:     ['#BFE3FF', '#7FB8FF'],
  sage:    ['#CDE6C5', '#8FC79A'],
  cocoa:   ['#D8C3B0', '#9C7A5C'],
  blush:   ['#FFD9D2', '#FFB0A3'],
  coral:   ['#FFB5A0', '#FB6F52'],
};
const gradKeys = Object.keys(GRADS);

const U = {
  you:   { id: 'you',   name: 'You',          handle: 'you',           grad: 'coral'  },
  maya:  { id: 'maya',  name: 'Maya Reyes',   handle: 'mayareyes',     grad: 'rose'   },
  jules: { id: 'jules', name: 'Jules Park',   handle: 'julesp',        grad: 'lilac'  },
  sam:   { id: 'sam',   name: 'Sam Okafor',   handle: 'samok',         grad: 'sky'    },
  noor:  { id: 'noor',  name: 'Noor Haddad',  handle: 'noorh',         grad: 'butter' },
  theo:  { id: 'theo',  name: 'Theo Lin',     handle: 'theolin',       grad: 'sage'   },
  ivy:   { id: 'ivy',   name: 'Ivy Castellano',handle: 'ivycast',      grad: 'blush'  },
  remy:  { id: 'remy',  name: 'Remy Adebayo', handle: 'remyy',         grad: 'clay'   },
};

const P = {
  tumbler:  { id: 'tumbler',  name: '40oz Insulated Tumbler', brand: 'Driftwell',  price: 42, was: null, grad: 'sage',   cat: 'Home' },
  beanie:   { id: 'beanie',   name: 'Cropped Ribbed Beanie',  brand: 'Northbound', price: 28, was: 38,   grad: 'clay',   cat: 'Fashion' },
  camera:   { id: 'camera',   name: 'Mini Instant Camera',    brand: 'Halo',       price: 79, was: null, grad: 'sky',    cat: 'Tech' },
  buds:     { id: 'buds',     name: 'Wireless Buds Pro',      brand: 'Aera',       price: 149,was: 179,  grad: 'lilac',  cat: 'Tech' },
  blindbox: { id: 'blindbox', name: 'Mystery Figure — S3',    brand: 'Pocket Pals',price: 18, was: null, grad: 'rose',   cat: 'Collect' },
  slides:   { id: 'slides',   name: 'Cloud Slides',           brand: 'Loafe',      price: 35, was: null, grad: 'butter', cat: 'Fashion' },
  matcha:   { id: 'matcha',   name: 'Matcha Starter Kit',     brand: 'Kettl',      price: 54, was: null, grad: 'sage',   cat: 'Food' },
  perfume:  { id: 'perfume',  name: 'Eau de Parfum 50ml',     brand: 'Dusk',       price: 88, was: 110,  grad: 'blush',  cat: 'Beauty' },
  clip:     { id: 'clip',     name: 'Claw Clip Trio',         brand: 'Knotted',    price: 16, was: null, grad: 'peach',  cat: 'Beauty' },
  vinyl:    { id: 'vinyl',    name: 'Vinyl — Midnight Hours', brand: 'Lowtide',    price: 32, was: null, grad: 'cocoa',  cat: 'Music' },
  candle:   { id: 'candle',   name: 'Soy Candle — Fig & Oud', brand: 'Ember',      price: 24, was: null, grad: 'clay',   cat: 'Home' },
  journal:  { id: 'journal',  name: 'Linen Daily Journal',    brand: 'Margin',     price: 22, was: null, grad: 'butter', cat: 'Stationery' },
  lamp:     { id: 'lamp',     name: 'Sunset Projector Lamp',  brand: 'Glow',       price: 39, was: 49,   grad: 'coral',  cat: 'Home' },
  totebag:  { id: 'totebag',  name: 'Heavyweight Canvas Tote',brand: 'Carry',      price: 30, was: null, grad: 'sky',    cat: 'Fashion' },
};

// Home feed — mix of friend finds, activity, group gifts, curated drops
const FEED = [
  { type: 'find', id: 'f1', user: 'maya', time: '12m', product: 'camera',
    caption: 'genuinely the move for anyone turning 22. point-and-shoot szn is back 📸',
    likes: 214, savedBy: 31, comments: [
      { user: 'jules', text: 'adding to my list immediately' },
      { user: 'theo', text: 'the film aesthetic >>>' },
    ], you_liked: false, you_saved: false },
  { type: 'group', id: 'f2', groupId: 'g_sam',
    title: 'Sam is leaving for Lisbon 🛫', org: 'jules',
    item: 'buds', goal: 149, raised: 96, contributors: ['jules','theo','noor','ivy'], count: 6, of: 9 },
  { type: 'find', id: 'f3', user: 'theo', time: '1h', product: 'vinyl',
    caption: 'found Ivy\u2019s most-played record on her linked Spotify. she has no idea.',
    likes: 88, savedBy: 12, comments: [{ user: 'noor', text: 'stealth gifting unlocked' }],
    you_liked: true, you_saved: false, fromSocial: 'Spotify' },
  { type: 'activity', id: 'f4', user: 'noor', time: '2h',
    text: 'added 4 things to', target: 'Apartment Warming', count: 4,
    preview: ['candle','lamp','tumbler','journal'] },
  { type: 'drop', id: 'f5', title: 'Today\u2019s Curated Drop', subtitle: 'Cozy season picks, live for 24h',
    ends: '23:41:08', items: ['candle','matcha','slides','beanie'] },
  { type: 'find', id: 'f6', user: 'jules', time: '4h', product: 'perfume',
    caption: 'price dropped 20% — Maxi pinged me the second it did. snagged it for mom.',
    likes: 156, savedBy: 22, comments: [], you_liked: false, you_saved: true, priceDrop: true },
];

const STORIES = [
  { id: 's_you', user: 'you', label: 'Your list', add: true },
  { id: 's_drop', user: null, label: 'Drops', live: true, drop: true },
  { id: 's_maya', user: 'maya', label: 'Maya · 4d', countdown: '4d', kind: 'birthday' },
  { id: 's_sam',  user: 'sam',  label: 'Sam · farewell', kind: 'event' },
  { id: 's_noor', user: 'noor', label: 'Noor · 11d', countdown: '11d', kind: 'birthday' },
  { id: 's_theo', user: 'theo', label: 'Theo · new', kind: 'list' },
  { id: 's_ivy',  user: 'ivy',  label: 'Ivy · 18d', countdown: '18d', kind: 'anniv' },
];

// Calendar / milestones
const EVENTS = [
  { id: 'e1', user: 'maya',  title: 'Maya\u2019s Birthday',   type: 'Birthday',    date: 'Jun 9',  days: 4,  ready: false, ideas: 7,  budget: 60 },
  { id: 'e2', user: 'sam',   title: 'Sam\u2019s Farewell',     type: 'Group gift',  date: 'Jun 14', days: 9,  ready: false, ideas: 3,  group: true, raised: 96, goal: 149 },
  { id: 'e3', user: 'noor',  title: 'Noor\u2019s Birthday',    type: 'Birthday',    date: 'Jun 16', days: 11, ready: true,  ideas: 5,  budget: 45 },
  { id: 'e4', user: 'ivy',   title: 'Ivy & Theo Anniversary', type: 'Anniversary', date: 'Jun 23', days: 18, ready: false, ideas: 4,  budget: 80 },
  { id: 'e5', user: 'remy',  title: 'Remy\u2019s Housewarming',type: 'Event',      date: 'Jul 02', days: 27, ready: false, ideas: 6,  budget: 50 },
];

// Personal wishlist
const MY_LIST = [
  { product: 'slides',  note: 'size 8 pls 🙏', reserved: false, priority: 'high' },
  { product: 'matcha',  note: 'ceremonial grade', reserved: true, reservedBy: 'jules', priority: 'mid' },
  { product: 'journal', note: '', reserved: false, priority: 'low' },
  { product: 'lamp',    note: 'warm tone version', reserved: false, priority: 'mid' },
  { product: 'totebag', note: '', reserved: true, reservedBy: 'theo', priority: 'low' },
  { product: 'clip',    note: 'the matte set', reserved: false, priority: 'low' },
];

// Collective / group wishlists
const COLLECTIONS = [
  { id: 'c1', title: 'Sam\u2019s Farewell', members: ['jules','theo','noor','ivy','you'], items: 5, raised: 96, goal: 149, group: true, cover: 'sky' },
  { id: 'c2', title: 'Apt 4B Housewarming', members: ['noor','remy','you'], items: 9, group: false, cover: 'sage' },
  { id: 'c3', title: 'Friendsgiving Swap', members: ['maya','jules','theo','ivy','you','noor'], items: 12, group: false, cover: 'butter' },
];

const GROUP_DETAIL = {
  id: 'g_sam', title: 'Sam is leaving for Lisbon', org: 'jules', item: 'buds',
  goal: 149, raised: 96, deadline: 'Jun 13', count: 6, of: 9,
  contributors: [
    { user: 'jules', amount: 25 }, { user: 'theo', amount: 20 }, { user: 'noor', amount: 20 },
    { user: 'ivy', amount: 16 }, { user: 'maya', amount: 15 },
  ],
  note: 'sending him off in style 💛 drops Jun 13 — chip in whatever feels right.',
};

// Maxi conversation
const MAXI_CHAT = [
  { from: 'maxi', text: 'hey! Maya\u2019s birthday is in 4 days 🎈 want me to pull ideas from her vibe?' },
  { from: 'you', text: 'yes do it' },
  { from: 'maxi', text: 'on it. I scanned her linked Pinterest + recent saves — she\u2019s deep in a film-photography + cozy-home phase rn.', chips: ['Pinterest', 'Saved posts'] },
  { from: 'maxi', text: 'top match, 94% her aesthetic and inside your $60 budget:', card: 'camera' },
  { from: 'maxi', text: 'want me to bundle it into a complete set? a film pack + photo album would round it out for +$24.', bundle: ['camera','journal'] },
];

const STYLE_TAGS = ['Film photography', 'Cozy minimal', 'Matcha core', 'Vinyl', 'Warm tones', 'Cloud aesthetic', 'Stationery'];

Object.assign(window, { GRADS, gradKeys, U, P, FEED, STORIES, EVENTS, MY_LIST, COLLECTIONS, GROUP_DETAIL, MAXI_CHAT, STYLE_TAGS });
