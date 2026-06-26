"use client";

import { MaxiChatSurface } from "@/components/app/maxi-provider";

// The dedicated Maxi page is a full-screen, ChatGPT-style chat (not the
// right-side dock). The floating launcher/dock is hidden here (see MaxiDock).
// Height mirrors /feed/messages so the composer stays pinned to the bottom.
export default function MaxiPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-3xl flex-col md:h-screen">
      <MaxiChatSurface variant="page" />
    </div>
  );
}
