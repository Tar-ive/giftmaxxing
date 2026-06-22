"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { POSTS, type Post } from "@/lib/social";
import { buildTasteProfile, recommendPage } from "@/lib/recommend";
import { fetchFeed, isApiConfigured } from "@/lib/api";

const MAX_FEED = 40; // safety cap for the LOCAL fallback feed (API feed is infinite)

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
  // API mode starts empty (filled by the initial fetch); local fallback seeds now.
  const [posts, setPosts] = useState<Post[]>(() =>
    isApiConfigured() ? [] : POSTS.map((p) => ({ ...p }))
  );
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false); // guards against duplicate observer fires
  const cursorRef = useRef<string | null | undefined>(undefined); // API pagination cursor
  const seqRef = useRef(0); // makes feed item ids unique across pages/loops
  const apiModeRef = useRef(isApiConfigured());
  const startedRef = useRef(false); // guards the one-time initial fetch

  // Reddit-sourced posts can repeat once we loop the dataset; give every
  // appended item a unique id so React keys + like/save stay correct.
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

  const toggleFollow = useCallback((userId: string) => {
    setFollows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const isFollowing = useCallback((u: string) => follows.has(u), [follows]);

  // One-time initial fetch of the API feed (first page).
  useEffect(() => {
    if (!apiModeRef.current || startedRef.current) return;
    startedRef.current = true;
    loadingRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const page = await fetchFeed({ limit: 12 });
        if (cancelled) return;
        cursorRef.current = page.cursor ?? undefined;
        if (page.posts.length === 0) setHasMore(false);
        else setPosts(appendUnique(page.posts));
      } catch {
        // API unreachable -> fall back to the local demo feed.
        if (cancelled) return;
        apiModeRef.current = false;
        setPosts(POSTS.map((p) => ({ ...p })));
      } finally {
        loadingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appendUnique]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);

    // API-backed infinite feed: page via cursor, and when the dataset is
    // exhausted, loop back to the top so the feed never ends.
    if (apiModeRef.current) {
      (async () => {
        try {
          const page = await fetchFeed({ cursor: cursorRef.current ?? undefined, limit: 8 });
          cursorRef.current = page.cursor ?? undefined; // null -> restart from top
          if (page.posts.length > 0) {
            setPosts((prev) => [...prev, ...appendUnique(page.posts)]);
          } else if (!page.cursor) {
            setHasMore(false);
          }
        } catch {
          setHasMore(false);
        } finally {
          setLoadingMore(false);
          loadingRef.current = false;
        }
      })();
      return;
    }

    // Local fallback (no API configured): original client-side ranker.
    setTimeout(() => {
      setPosts((prev) => {
        if (prev.length >= MAX_FEED) {
          setHasMore(false);
          return prev;
        }
        const profile = buildTasteProfile(prev, follows);
        const exclude = new Set(prev.map((p) => `${p.user}:${p.product.id}`));
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
  }, [follows, hasMore, appendUnique]);

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
