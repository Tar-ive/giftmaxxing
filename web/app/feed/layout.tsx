import { AppStore } from "@/components/app/store";
import { Sidebar, MobileBars } from "@/components/app/sidebar";
import { StoryViewer } from "@/components/app/stories";
import { PostModal } from "@/components/app/post-modal";
import { OnboardingGate } from "@/components/app/onboarding-gate";
import { MaxiProvider } from "@/components/app/maxi-provider";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <AppStore>
        <MaxiProvider>
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
}
