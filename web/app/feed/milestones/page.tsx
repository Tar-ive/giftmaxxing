"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MilestonesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/feed/events");
  }, [router]);
  return null;
}
