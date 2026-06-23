"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Post } from "@/lib/social";
import { buildPinFeed } from "@/lib/feed-builder";

const FEED_CAP = 216; // soft cap (~3 passes over the pin set) for the cycling feed

type Store = {
  posts: Post[];
  follows: Set<string>;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  addPost: (post: Post) => void;
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
  // Feed is built from the bundled Pinterest pins (real photos). Initialize
  // synchronously so the feed is never blank on first paint.
  const [posts, setPosts] = useState<Post[]>(() => buildPinFeed(0, 12));
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false); // guards against duplicate observer fires
  const seqRef = useRef(0); // makes appended feed item ids unique across cycles
  const offsetRef = useRef(12); // next flat offset into the cycling pin feed

  // Pins repeat once we loop the set; give every appended item a unique id so
  // React keys + like/save stay correct.
  const appendUnique = useCallback(
    (list: Post[]) => list.map((p) => ({ ...p, id: `${p.id}~${seqRef.current++}` })),
    []
  );

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

  const addPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
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
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    // brief latency so the skeletons flash, then append the next cycled page
    setTimeout(() => {
      setPosts((prev) => {
        if (prev.length >= FEED_CAP) {
          setHasMore(false);
          return prev;
        }
        const next = appendUnique(buildPinFeed(offsetRef.current, 8));
        offsetRef.current += 8;
        return [...prev, ...next];
      });
      setLoadingMore(false);
      loadingRef.current = false;
    }, 450);
  }, [hasMore, appendUnique]);

  const value = useMemo<Store>(
    () => ({
      posts,
      follows,
      toggleLike,
      toggleSave,
      addComment,
      addPost,
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
    [posts, follows, toggleLike, toggleSave, addComment, addPost, toggleFollow, isFollowing, loadMore, hasMore, loadingMore, openPostId, storyIndex]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
