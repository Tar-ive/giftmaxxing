import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Clerk requires CLERK_SECRET_KEY at runtime. When the key is absent (e.g. the
// Vercel project hasn't had Clerk env vars configured yet), fall back to a
// pass-through proxy so the site still renders instead of crashing.
const hasClerkKeys = !!(
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

function passthrough() {
  return NextResponse.next();
}

export default hasClerkKeys ? clerkMiddleware() : passthrough;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
