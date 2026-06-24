// ────────────────────────────────────────────────────────────────────────────
// Invite links — zero-friction sharing for the swipe challenge.
//
// An invite code is a base64url-encoded JSON payload containing the inviter's
// name (and, eventually, their userId / Pinterest handle once real auth exists).
// The invited user never needs to sign up — they swipe, enter their birthday,
// and the inviter is persisted as a friend + recipient on their local profile.
// ────────────────────────────────────────────────────────────────────────────

export type InvitePayload = {
  /** Display name of the person who sent the invite. */
  name: string;
  /** Optional handle (derived from name for now). */
  handle?: string;
  /** Clerk userId of the inviter, so a completed challenge can notify them and
   *  attach the resulting soft profile to their account. Absent when the sender
   *  is signed out (the link still works, it just can't report back). */
  senderId?: string;
};

// ── Encoding / decoding ──────────────────────────────────────────────────────

function toBase64Url(s: string): string {
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(s);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(s, "utf-8").toString("base64url");
}

function fromBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function encodeInvite(payload: InvitePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeInvite(code: string): InvitePayload | null {
  try {
    const raw: unknown = JSON.parse(fromBase64Url(code));
    if (
      raw &&
      typeof raw === "object" &&
      typeof (raw as InvitePayload).name === "string" &&
      (raw as InvitePayload).name.trim().length > 0
    ) {
      return raw as InvitePayload;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Invite-link builder (used in the share button) ───────────────────────────

export function buildInviteUrl(
  inviterName: string,
  opts: { senderId?: string; origin?: string } = {}
): string {
  const base = opts.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const payload: InvitePayload = { name: inviterName.trim() };
  if (opts.senderId) payload.senderId = opts.senderId;
  const code = encodeInvite(payload);
  return `${base}/invite/${code}`;
}

// ── Session persistence ──────────────────────────────────────────────────────
// Tracks the invite context across the swipe → birthday flow so we know who
// invited this user even if they navigate away mid-flow.

const INVITE_SESSION_KEY = "giftmaxxing_invite_session";

export type InviteSession = {
  inviterName: string;
  code: string;
  startedAt: number;
};

export function loadInviteSession(): InviteSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INVITE_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as InviteSession).inviterName === "string"
    ) {
      return parsed as InviteSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveInviteSession(session: InviteSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INVITE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // quota exceeded — non-critical
  }
}

export function clearInviteSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(INVITE_SESSION_KEY);
  } catch {
    // ignore
  }
}
