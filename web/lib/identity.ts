"use client";

// ────────────────────────────────────────────────────────────────────────────
// Identity layer — resolves the signed-in user's display identity.
//
// Priority: Clerk auth user > localStorage fallback.
// The Clerk user's fullName / imageUrl is the canonical identity shown on the
// profile page, comments, posts, etc. The onboarding profile is taste data
// (interests, budget, style) NOT identity — its `name` field is a legacy
// artefact that is no longer used when Clerk is active.
// ────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { loadProfile } from "@/lib/onboarding";
import { USERS, type User } from "@/lib/social";

export function handleFromName(name: string): string {
  const h = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  return h || "you";
}

// Module-level identity cache — set by AccountSync (which has access to Clerk
// user data) so the rest of the app can read identity without Clerk hooks.
let _cachedClerkName: string | null = null;
let _cachedClerkImage: string | null = null;

export function setClerkIdentityCache(name: string | null, imageUrl: string | null): void {
  _cachedClerkName = name;
  _cachedClerkImage = imageUrl;
  // Notify subscribers (useCurrentUser hook) of the identity change.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("giftmaxxing:identity"));
  }
}

export function getCurrentUser(): User {
  if (typeof window === "undefined") return USERS.you;
  // Prefer Clerk identity when available
  if (_cachedClerkName) {
    return {
      ...USERS.you,
      name: _cachedClerkName,
      handle: handleFromName(_cachedClerkName),
    };
  }
  const p = loadProfile();
  if (!p || !p.name.trim()) return USERS.you;
  return { ...USERS.you, name: p.name.trim(), handle: handleFromName(p.name) };
}

export function getClerkImageUrl(): string | null {
  return _cachedClerkImage;
}

// Resolve any userId to a displayable User, using the live current user for "you".
export function displayUser(userId: string, me: User): User {
  if (userId === "you") return me;
  return (
    USERS[userId] ?? { id: userId, name: userId, handle: userId, grad: "coral" }
  );
}

// React hook: current user, derived from Clerk identity (via cache) or
// localStorage (fallback for demo/no-auth mode). Always id "you".
export function useCurrentUser(): User {
  const [user, setUser] = useState<User>(USERS.you);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getCurrentUser());
    const sync = () => setUser(getCurrentUser());
    window.addEventListener("storage", sync);
    window.addEventListener("giftmaxxing:profile", sync as EventListener);
    window.addEventListener("giftmaxxing:identity", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("giftmaxxing:profile", sync as EventListener);
      window.removeEventListener("giftmaxxing:identity", sync as EventListener);
    };
  }, []);
  return user;
}
