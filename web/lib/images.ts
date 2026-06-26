// Image URL helpers.
//
// Pinterest (i.pinimg.com) serves the same photo at several widths via a size
// segment in the path: /236x/, /474x/, /564x/, /736x/, or /originals/. The
// ingest pipeline sometimes stores a small 236x thumbnail, which looks soft in
// the feed. hiResImage() normalizes any Pinterest URL to the 736x variant —
// crisp enough for feed cards without the size/availability risk of /originals/.
// Non-Pinterest URLs (and empty values) are returned unchanged.

const PINIMG_SIZE_RE = /\/(?:\d{2,4}x|originals)\//;

export function hiResImage(url?: string | null): string {
  if (!url) return "";
  if (!url.includes("i.pinimg.com")) return url;
  return url.replace(PINIMG_SIZE_RE, "/736x/");
}
