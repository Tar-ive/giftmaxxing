"use client";

// Lightweight identity layer. The onboarding name (localStorage) becomes the
// signed-in user that shows up across every interaction — comments, posts,
// profile, Maxi. When a real auth backend exists, swap getCurrentUser() to read
// from the session/users table instead of the onboarding profile.
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

// The current signed-in user, derived from the onboarding profile. Always has
// id "you" so existing like/save/comment plumbing keyed on "you" keeps working.
export function getCurrentUser(): User {
  if (typeof window === "undefined") return USERS.you;
  const p = loadProfile();
  if (!p || !p.name.trim()) return USERS.you;
  return { ...USERS.you, name: p.name.trim(), handle: handleFromName(p.name) };
}

// Resolve any userId to a displayable User, using the live current user for "you".
export function displayUser(userId: string, me: User): User {
  if (userId === "you") return me;
  return (
    USERS[userId] ?? { id: userId, name: userId, handle: userId, grad: "coral" }
  );
}

// React hook: current user, kept in sync across tabs via the storage event.
// Starts from the SSR-safe default and hydrates on mount to avoid mismatches.
export function useCurrentUser(): User {
  const [user, setUser] = useState<User>(USERS.you);
  useEffect(() => {
    // Intentional: hydrate from localStorage after mount (SSR-safe; reading
    // during render would cause hydration mismatches).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getCurrentUser());
    const sync = () => setUser(getCurrentUser());
    window.addEventListener("storage", sync);
    window.addEventListener("giftmaxxing:profile", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("giftmaxxing:profile", sync as EventListener);
    };
  }, []);
  return user;
}
