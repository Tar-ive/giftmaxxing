// Demo user profiles for A/B testing the recommendation engine.
// Each profile simulates a distinct demographic + gifting persona by
// pre-setting the interaction signals that buildTasteProfile() reads.

import { PRODUCTS, type Product } from "@/lib/data";
import type { Post } from "@/lib/social";
import type { Vibe } from "@/lib/recommend";

export type DemoProfile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  persona: string;
  description: string;
  emoji: string;
  budget: "low" | "mid" | "high";
  // Simulated interactions: which product ids are liked/saved, who they follow
  likedProductIds: string[];
  savedProductIds: string[];
  commentedProductIds: string[];
  follows: string[];
  // Expected top vibes (for validation)
  expectedVibes: Vibe[];
};

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "cozy-college",
    name: "Priya",
    age: 21,
    gender: "Female",
    persona: "Cozy Minimalist",
    description:
      "College senior who loves warm lighting, journaling, and film photography. Gravitates toward affordable, aesthetic finds.",
    emoji: "📷",
    budget: "low",
    likedProductIds: ["candle", "journal", "camera"],
    savedProductIds: ["candle", "journal"],
    commentedProductIds: ["camera"],
    follows: ["maya", "noor"],
    expectedVibes: ["cozy", "calm", "warm", "film"],
  },
  {
    id: "tech-dad",
    name: "Marcus",
    age: 45,
    gender: "Male",
    persona: "Practical Tech Enthusiast",
    description:
      "Mid-career dad shopping for his kids and wife. Values functionality and deals. Drawn to tech and kitchen gear.",
    emoji: "🧰",
    budget: "mid",
    likedProductIds: ["buds", "lamp"],
    savedProductIds: ["buds", "matcha"],
    commentedProductIds: [],
    follows: ["sam"],
    expectedVibes: ["tech", "music", "home"],
  },
  {
    id: "luxe-gifter",
    name: "Camille",
    age: 34,
    gender: "Female",
    persona: "Luxe Maximalist",
    description:
      "Loves premium gifts with presentation — perfume, vinyl, high-end candles. Willing to spend more for the 'wow' factor.",
    emoji: "💐",
    budget: "high",
    likedProductIds: ["perfume", "vinyl", "candle"],
    savedProductIds: ["perfume", "vinyl"],
    commentedProductIds: ["perfume"],
    follows: ["theo", "ivy"],
    expectedVibes: ["luxe", "romantic", "cozy", "music"],
  },
  {
    id: "trendy-teen",
    name: "Jayden",
    age: 17,
    gender: "Non-binary",
    persona: "Trend-Chasing Social Gifter",
    description:
      "Buys whatever is hot on socials. Follows everyone, saves everything. Strong social-proof signal.",
    emoji: "🎧",
    budget: "low",
    likedProductIds: ["buds", "camera", "lamp", "vinyl"],
    savedProductIds: ["buds", "camera"],
    commentedProductIds: ["buds", "lamp"],
    follows: ["maya", "jules", "sam", "theo", "ivy"],
    expectedVibes: ["tech", "film", "retro", "music"],
  },
  {
    id: "sentimental-mom",
    name: "Diane",
    age: 58,
    gender: "Female",
    persona: "Sentimental Gift-Giver",
    description:
      "Shops for family milestones — birthdays, graduations. Values meaning over flashiness. Prefers home and wellness.",
    emoji: "🌷",
    budget: "mid",
    likedProductIds: ["candle", "journal"],
    savedProductIds: ["candle", "matcha", "journal"],
    commentedProductIds: ["candle", "journal"],
    follows: ["noor"],
    expectedVibes: ["cozy", "calm", "home", "wellness"],
  },
  {
    id: "new-user",
    name: "Alex",
    age: 28,
    gender: "Male",
    persona: "Cold-Start New User",
    description:
      "Just signed up. No likes, no saves, no follows. Tests the cold-start fallback behavior of the recommender.",
    emoji: "🆕",
    budget: "mid",
    likedProductIds: [],
    savedProductIds: [],
    commentedProductIds: [],
    follows: [],
    expectedVibes: [],
  },
];

const P = (id: string): Product => PRODUCTS.find((p) => p.id === id)!;
const authors = ["maya", "jules", "sam", "noor", "theo", "ivy", "remy"];

// Synthesize a Post[] from a demo profile's interactions, as if the user had
// engaged with those products in their feed.
export function synthesizePosts(profile: DemoProfile): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();

  const addProduct = (
    productId: string,
    liked: boolean,
    saved: boolean,
    commented: boolean
  ) => {
    if (seen.has(productId)) return;
    seen.add(productId);
    const product = P(productId);
    if (!product) return;
    const author = authors[posts.length % authors.length];
    posts.push({
      id: `demo-${profile.id}-${productId}`,
      user: author,
      time: `${1 + posts.length}d`,
      product,
      caption: "",
      likes: 40 + Math.floor(Math.random() * 160),
      liked,
      saved,
      comments: commented
        ? [{ id: `dc-${productId}`, user: "you", text: "love this" }]
        : [],
    });
  };

  // Add interacted products first
  for (const id of profile.savedProductIds) {
    addProduct(
      id,
      profile.likedProductIds.includes(id),
      true,
      profile.commentedProductIds.includes(id)
    );
  }
  for (const id of profile.likedProductIds) {
    addProduct(id, true, false, profile.commentedProductIds.includes(id));
  }
  for (const id of profile.commentedProductIds) {
    addProduct(id, false, false, true);
  }

  // Fill in remaining products as unseen candidates
  for (const product of PRODUCTS) {
    if (!seen.has(product.id)) {
      posts.push({
        id: `demo-${profile.id}-${product.id}`,
        user: authors[posts.length % authors.length],
        time: `${1 + posts.length}d`,
        product,
        caption: "",
        likes: 40 + Math.floor(Math.random() * 160),
        liked: false,
        saved: false,
        comments: [],
      });
    }
  }

  return posts;
}
