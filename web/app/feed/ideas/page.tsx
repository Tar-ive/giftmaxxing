"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IdeasExplorer } from "@/components/app/ideas-explorer";

// Gift ideas + co-occurrence bundles for a recipient (Reddit-mined knowledge
// base). The event banner deep-links here with ?recipient=<relation key> so an
// upcoming birthday/anniversary lands straight on bundles for that person.
function IdeasPageInner() {
  const params = useSearchParams();
  const recipient = params.get("recipient") ?? undefined;
  const recipientId = params.get("rid") ?? undefined;
  const connectionId = params.get("cid") ?? undefined;
  return (
    <IdeasExplorer initialRecipient={recipient} recipientId={recipientId} connectionId={connectionId} />
  );
}

export default function IdeasPage() {
  return (
    <Suspense fallback={null}>
      <IdeasPageInner />
    </Suspense>
  );
}
