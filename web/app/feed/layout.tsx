import { AppStore } from "@/components/app/store";
import { Sidebar, MobileBars } from "@/components/app/sidebar";
import { StoryViewer } from "@/components/app/stories";
import { PostModal } from "@/components/app/post-modal";
import { OnboardingGate } from "@/components/app/onboarding-gate";
import { AuthGate } from "@/components/app/auth-gate";
import { MaxiProvider } from "@/components/app/maxi-provider";
import { AdminSession } from "@/components/app/admin-session";

// When Clerk is configured, every /feed/* route requires a real signed-in
// session (AuthGate). A local onboarding profile alone no longer grants access,
// so completing the swipe/invite flow can't "log you in" without authenticating.
// When Clerk is absent (demo mode) we fall back to the profile-only gate.
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  const app = (
    <OnboardingGate>
      <AppStore>
        <MaxiProvider>
          <AdminSession />
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1">
              <MobileBars />
              <div className="pb-20 md:pb-0">{children}</div>
            </div>
          </div>
          <StoryViewer />
          <PostModal />
        </MaxiProvider>
      </AppStore>
    </OnboardingGate>
  );

  return clerkEnabled ? <AuthGate>{app}</AuthGate> : app;
}
