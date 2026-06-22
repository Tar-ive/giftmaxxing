import { AppStore } from "@/components/app/store";
import { Sidebar, MobileBars } from "@/components/app/sidebar";
import { StoryViewer } from "@/components/app/stories";
import { PostModal } from "@/components/app/post-modal";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStore>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <MobileBars />
          <div className="pb-20 md:pb-0">{children}</div>
        </div>
      </div>
      <StoryViewer />
      <PostModal />
    </AppStore>
  );
}
