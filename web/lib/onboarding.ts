// ────────────────────────────────────────────────────────────────────────────
// Onboarding — user profile + preferences persisted in localStorage.
//
// The onboarding wizard collects taste signals that feed into the
// recommendation engine (lib/recommend.ts, infra/src/handler.mjs).
// When a real auth backend exists, migrate this to the users DynamoDB table
// and hydrate on login instead of reading localStorage.
// ────────────────────────────────────────────────────────────────────────────

export type GiftRole = "giver" | "taker" | "both";
export type GiftDifficulty = "easy" | "moderate" | "hard";
export type GiftStyle = "thoughtful" | "materialistic" | "mix";

export type MaterialisticCategory =
  | "tech"
  | "fashion"
  | "beauty"
  | "home"
  | "kitchen"
  | "fitness"
  | "travel"
  | "gaming"
  | "jewelry"
  | "books"
  | "music"
  | "art";

export type InterestTag =
  | "cozy"
  | "minimalist"
  | "vintage"
  | "luxury"
  | "outdoors"
  | "foodie"
  | "wellness"
  | "photography"
  | "sustainable"
  | "diy"
  | "pop-culture"
  | "plants"
  | "pets"
  | "stationery"
  | "candles"
  | "coffee-tea";

export type PinterestLink = {
  profileUrl: string;
  linkedAt: number;
  // TODO(next-agent): after Pinterest OAuth is approved, store tokens here:
  // accessToken?: string;
  // refreshToken?: string;
  // scopes?: string[];
};

export type UserProfile = {
  name: string;
  role: GiftRole;
  difficulty: GiftDifficulty;
  style: GiftStyle;
  materialisticCategories: MaterialisticCategory[];
  interests: InterestTag[];
  pinterestLinks: PinterestLink[];
  completedAt: number;
};

const STORAGE_KEY = "giftmaxxing_onboarding";

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isOnboardingComplete(): boolean {
  return loadProfile() !== null;
}

// ────────────────────────────────────────────────────────────────────────────
// Display metadata for the interest/category picker chips (Pinterest-style).
// ────────────────────────────────────────────────────────────────────────────

export const INTEREST_META: Record<InterestTag, { label: string; emoji: string }> = {
  cozy: { label: "Cozy vibes", emoji: "🧸" },
  minimalist: { label: "Minimalist", emoji: "◻️" },
  vintage: { label: "Vintage & retro", emoji: "📻" },
  luxury: { label: "Luxury", emoji: "💎" },
  outdoors: { label: "Outdoors", emoji: "🏕️" },
  foodie: { label: "Foodie", emoji: "🍽️" },
  wellness: { label: "Wellness", emoji: "🧘" },
  photography: { label: "Photography", emoji: "📸" },
  sustainable: { label: "Sustainable", emoji: "♻️" },
  diy: { label: "DIY & crafts", emoji: "🎨" },
  "pop-culture": { label: "Pop culture", emoji: "🎬" },
  plants: { label: "Plants", emoji: "🌿" },
  pets: { label: "Pet lover", emoji: "🐾" },
  stationery: { label: "Stationery", emoji: "✏️" },
  candles: { label: "Candles & scents", emoji: "🕯️" },
  "coffee-tea": { label: "Coffee & tea", emoji: "☕" },
};

export const MATERIALISTIC_META: Record<MaterialisticCategory, { label: string; emoji: string }> = {
  tech: { label: "Tech & gadgets", emoji: "💻" },
  fashion: { label: "Fashion", emoji: "👗" },
  beauty: { label: "Beauty & skincare", emoji: "💄" },
  home: { label: "Home decor", emoji: "🏡" },
  kitchen: { label: "Kitchen & cooking", emoji: "🍳" },
  fitness: { label: "Fitness & sports", emoji: "🏋️" },
  travel: { label: "Travel gear", emoji: "✈️" },
  gaming: { label: "Gaming", emoji: "🎮" },
  jewelry: { label: "Jewelry & watches", emoji: "💍" },
  books: { label: "Books", emoji: "📚" },
  music: { label: "Music & vinyl", emoji: "🎵" },
  art: { label: "Art & prints", emoji: "🖼️" },
};
