"use client";

// Shared client hook for the signed-in user's backend group-gift pools. Both the
// home-feed stories tray and the messages tab use it so a pool the user creates
// or joins shows up in those places too — not only on /feed/pools. Degrades to an
// empty list when the API isn't configured or the user isn't signed in.
import { useCallback, useEffect, useState } from "react";
import { getMyUserId, isApiConfigured } from "@/lib/api";
import { fetchMyPools, type Pool } from "@/lib/pools";

export function useMyPools(): {
  pools: Pool[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const uid = getMyUserId();
    if (!isApiConfigured() || !uid) {
      setPools([]);
      setLoading(false);
      return;
    }
    const list = await fetchMyPools(uid);
    setPools(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { pools, loading, refresh };
}
