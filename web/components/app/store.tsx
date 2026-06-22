"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { POSTS, type Post } from "@/lib/social";
import { buildTasteProfile, recommendPage } from "@/lib/recommend";

const MAX_FEED = 40; // safety cap so the demo feed eventually ends

type Store = {
  posts: Post[];
  follows: Set<string>;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  toggleFollow: (userId: string) => void;
  isFollowing: (userId: string) => boolean;
  // infinite scroll
  loadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  // overlays
  openPostId: string | null;
  openPost: (id: string | null) => void;
  storyIndex: number | null;
  openStory: (i: number | null) => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within <AppStore>");
  return v;
}

export function AppStore({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(() => POSTS.map((p) => ({ ...p })));
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false); // guards against duplicate observer fires

  const toggleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
          : p
      )
    );
  }, []);

  const toggleSave = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p))
    );
  }, []);

  const addComment = useCallback((postId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                { id: `c-${Date.now()}`, user: "you", text: clean },
              ],
            }
          : p
      )
    );
  }, []);

  const toggleFollow = useCallback((userId: string) => {
    setFollows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const isFollowing = useCallback((u: string) => follows.has(u), [follows]);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);

    // Simulate a network round-trip to the rec service.
    setTimeout(() => {
      setPosts((prev) => {
        if (prev.length >= MAX_FEED) {
          setHasMore(false);
          return prev;
        }
        // 1) build the taste vector from everything the user has engaged with
        const profile = buildTasteProfile(prev, follows);
        // 2) exclude (author, product) pairs already in the feed
        const exclude = new Set(prev.map((p) => `${p.user}:${p.product.id}`));
        // 3) ask the ranker for the next page
        const next = recommendPage(profile, follows, exclude, 4);
        if (next.length === 0) {
          setHasMore(false);
          return prev;
        }
        return [...prev, ...next];
      });
      setLoadingMore(false);
      loadingRef.current = false;
    }, 650);
  }, [follows]);

  const value = useMemo<Store>(
    () => ({
      posts,
      follows,
      toggleLike,
      toggleSave,
      addComment,
      toggleFollow,
      isFollowing,
      loadMore,
      hasMore,
      loadingMore,
      openPostId,
      openPost: setOpenPostId,
      storyIndex,
      openStory: setStoryIndex,
    }),
    [posts, follows, toggleLike, toggleSave, addComment, toggleFollow, isFollowing, loadMore, hasMore, loadingMore, openPostId, storyIndex]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
