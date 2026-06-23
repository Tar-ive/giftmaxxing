import { clerkMiddleware } from "@clerk/nextjs/server";

// Giftmaxxing keeps the marketing landing + demo feed publicly browsable, so we
// intentionally do NOT call a global auth.protect() here. Clerk context is
// available app-wide; sign-in/up is surfaced via nav controls, and user data is
// persisted only once a user is signed in. To gate specific routes later, use
// `createRouteMatcher([...])` + `auth.protect()` inside the callback.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
