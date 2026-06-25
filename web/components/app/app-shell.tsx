"use client";

// App chrome for /feed/*. When a right-hand pane is open (Maxi chat OR the cart
// drawer) the main column reflows by reserving the pane's width instead of being
// overlaid — so nav | feed | suggestions | pane read as side-by-side panes with
// no overlap. The Sidebar collapses and the RightRail hides on narrower widths
// (they read the same open state via useMaxi) so the feed always stays readable.
import { Sidebar, MobileBars } from "@/components/app/sidebar";
import { useMaxi } from "@/components/app/maxi-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { open, cartOpen } = useMaxi();
  const paneOpen = open || cartOpen;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className={`min-w-0 flex-1 transition-[padding] duration-300 ${
          paneOpen ? "lg:pr-[400px]" : ""
        }`}
      >
        <MobileBars />
        <div className="pb-20 md:pb-0">{children}</div>
      </div>
    </div>
  );
}
