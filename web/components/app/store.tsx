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
import { type Post } from "@/lib/social";
import { buildPinFeed } from "@/lib/feed-builder";
import { loadProfile } from "@/lib/onboarding";
import { tasteFromProfile } from "@/lib/taste";
import { fetchFeed, isApiConfigured } from "@/lib/api";

const FEED_CAP = 216; // soft cap (~3 passes over the pin set) for the cycling feed

// Only surface posts with a real, hotlinkable photo. Drops Reddit preview.redd.it
// images (they 403 cross-origin), matching the bundled feed's photo-only quality.
const isPhoto = (p: Post) => !!p.product.image && !p.product.image.includes("redd.it");

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
  // Taste derived from the onboarding profile, read once on mount. The feed tree
  // is client-only (it renders behind OnboardingGate, which shows a spinner on
  // the server), so localStorage is available here and there's no SSR/CSR
  // hydration mismatch. This biases the bundled feed toward what the user picked.
  const [taste] = useState(() => tasteFromProfile(loadProfile()));
  // Feed is built from the bundled Pinterest pins (real photos), ordered by the
  // user's taste. Initialize synchronously so it's never blank on first paint.
  const [posts, setPosts] = useState<Post[]>(() => buildPinFeed(0, 12, taste));
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false); // guards against duplicate observer fires
  const seqRef = useRef(0); // makes appended feed item ids unique across cycles
  const offsetRef = useRef(12); // next flat offset into the cycling pin feed
  const apiModeRef = useRef(false); // true once the live API feed takes over
  const cursorRef = useRef<string | null>(null); // API feed pagination cursor

  // Pins repeat once we loop the set; give every appended item a unique id so
  // React keys + like/save stay correct.
  const appendUnique = useCallback(
    (list: Post[]) => list.map((p) => ({ ...p, id: `${p.id}~${seqRef.current++}` })),
    []
  );

  // On mount, try the live API feed (real, scalable — paginated from DynamoDB via
  // the byFeed GSI). If it returns enough real-photo posts, it takes over from the
  // bundled pins; otherwise we keep the bundled feed so the app never goes blank.
  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const { posts: apiPosts, cursor } = await fetchFeed({ limit: 16 });
        const photos = apiPosts.filter(isPhoto);
        if (!cancelled && photos.length >= 6) {
          apiModeRef.current = true;
          cursorRef.current = cursor;
          setHasMore(cursor != null);
          setPosts(photos);
        }
      } catch {
        // keep the bundled feed on any error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

    // API mode: page the live feed via the cursor, de-duping by id.
    if (apiModeRef.current) {
      (async () => {
        try {
          const { posts: apiPosts, cursor } = await fetchFeed({
            limit: 12,
            cursor: cursorRef.current,
          });
          cursorRef.current = cursor;
          const photos = apiPosts.filter(isPhoto);
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...photos.filter((p) => !seen.has(p.id))];
          });
          setHasMore(cursor != null);
        } catch {
          setHasMore(false);
        } finally {
          setLoadingMore(false);
          loadingRef.current = false;
        }
      })();
      return;
    }

    // Bundled fallback: append the next cycled page after a brief skeleton flash.
    setTimeout(() => {
      setPosts((prev) => {
        if (prev.length >= FEED_CAP) {
          setHasMore(false);
          return prev;
        }
        const next = appendUnique(buildPinFeed(offsetRef.current, 8, taste));
        offsetRef.current += 8;
        return [...prev, ...next];
      });
      setLoadingMore(false);
      loadingRef.current = false;
    }, 450);
  }, [hasMore, appendUnique, taste]);

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
