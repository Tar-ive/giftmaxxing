"use client";

import { useCallback, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/data";
import { USERS } from "@/lib/social";
import {
  buildTasteProfile,
  scoreCandidate,
  PRODUCT_META,
  type Scored,
  type TasteProfile,
} from "@/lib/recommend";
import {
  DEMO_PROFILES,
  synthesizePosts,
  type DemoProfile,
} from "@/lib/demo-profiles";
import { API_BASE, isApiConfigured, mapApiPost } from "@/lib/api";
import { Icons } from "@/components/ui";
import { GRADIENTS } from "@/lib/data";

// Run the client-side facet ranker for a given demo profile.
function runFacetRanker(profile: DemoProfile) {
  const posts = synthesizePosts(profile);
  const follows = new Set(profile.follows);
  const taste = buildTasteProfile(posts, follows);

  const authors = Object.keys(USERS).filter((u) => u !== "you");
  const scored: Scored[] = [];
  for (const product of PRODUCTS) {
    for (const user of authors) {
      scored.push(scoreCandidate(user, product, taste, follows));
    }
  }
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by product (keep highest-scored author per product)
  const seen = new Set<string>();
  const deduped = scored.filter((s) => {
    if (seen.has(s.product.id)) return false;
    seen.add(s.product.id);
    return true;
  });

  return { taste, scored: deduped, posts };
}

type VectorResult = {
  postId: string;
  name: string;
  image?: string;
  source?: string;
  reason?: string;
  _score?: number | null;
  _distance?: number | null;
};

export default function RecommendationsPage() {
  const [selectedId, setSelectedId] = useState(DEMO_PROFILES[0].id);
  const [vectorResults, setVectorResults] = useState<VectorResult[] | null>(null);
  const [vectorLoading, setVectorLoading] = useState(false);
  const [vectorError, setVectorError] = useState<string | null>(null);
  const [showEngine, setShowEngine] = useState(false);

  const profile = DEMO_PROFILES.find((p) => p.id === selectedId)!;
  const facetResult = useMemo(() => runFacetRanker(profile), [profile]);

  const fetchVectorRecs = useCallback(async () => {
    if (!isApiConfigured()) {
      setVectorError("NEXT_PUBLIC_API_URL not configured — cannot reach the vector recommender.");
      return;
    }
    setVectorLoading(true);
    setVectorError(null);
    setVectorResults(null);
    try {
      const q = new URLSearchParams({ limit: "12" });
      // Use the profile's vibes as hints for the facet fallback
      if (profile.expectedVibes.length) {
        q.set("vibes", profile.expectedVibes.join(","));
      }
      const res = await fetch(`${API_BASE}/recommendations?${q.toString()}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVectorResults(data.items ?? []);
    } catch (e: unknown) {
      setVectorError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setVectorLoading(false);
    }
  }, [profile]);

  return (
    <div className="mx-auto max-w-6xl px-3 py-7 sm:px-5">
      {/* Header */}
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-semibold text-ink-soft backdrop-blur">
          <Icons.sparkle size={14} className="text-coral" />
          Recommendation Engine · A/B Testing
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Recommendations Lab
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
          Select a demo profile to see how the recommendation engine ranks products.
          Compare the <strong>client-side facet ranker</strong> against the <strong>server-side vector recommender</strong> side by side.
        </p>
      </header>

      {/* Engine explainer toggle */}
      <button
        onClick={() => setShowEngine(!showEngine)}
        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
      >
        <Icons.sparkle size={16} className="text-coral" />
        {showEngine ? "Hide" : "Show"} Engine Details
        <span className="text-ink-faint">{showEngine ? "▲" : "▼"}</span>
      </button>

      {showEngine && <EngineExplainer />}

      {/* Profile picker */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">
          Demo Profiles
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DEMO_PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedId(p.id);
                setVectorResults(null);
                setVectorError(null);
              }}
              className={`rounded-2xl border p-3 text-left transition-all ${
                selectedId === p.id
                  ? "border-coral bg-coral-soft/60 shadow-sm"
                  : "border-line bg-surface hover:bg-ink/5"
              }`}
            >
              <div className="mb-2 text-2xl">{p.emoji}</div>
              <div className="text-sm font-bold text-ink">{p.name}</div>
              <div className="text-[11px] font-semibold text-coral">{p.persona}</div>
              <div className="mt-1 text-[11px] text-ink-faint">
                {p.age}y · {p.gender} · {p.budget} budget
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Profile detail */}
      <ProfileDetail profile={profile} taste={facetResult.taste} />

      {/* A/B comparison panels */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Panel A: Facet Ranker */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-coral px-2.5 py-0.5 text-[11px] font-bold text-white">
              A
            </span>
            <h3 className="font-display text-lg font-bold text-ink">
              Client-Side Facet Ranker
            </h3>
          </div>
          <p className="mb-4 text-xs text-ink-faint">
            Rule-based scoring over hand-tagged vibes, price preference, social proof,
            and follow graph. Weights: taste 0.45, price 0.15, social 0.2, follow 0.2.
          </p>
          <FacetResults scored={facetResult.scored} taste={facetResult.taste} />
        </div>

        {/* Panel B: Vector Recommender */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
              B
            </span>
            <h3 className="font-display text-lg font-bold text-ink">
              Server-Side Vector Recommender
            </h3>
          </div>
          <p className="mb-4 text-xs text-ink-faint">
            Titan Multimodal Embeddings (1024-d) → taste centroid → kNN cosine similarity
            against S3 Vectors. Falls back to DynamoDB scorePost() when no vectors.
          </p>
          {vectorResults ? (
            <VectorResults results={vectorResults} />
          ) : (
            <div className="text-center">
              <button
                onClick={fetchVectorRecs}
                disabled={vectorLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
              >
                {vectorLoading ? "Loading…" : "Fetch Vector Recommendations"}
              </button>
              {vectorError && (
                <p className="mt-3 text-sm text-red-500">{vectorError}</p>
              )}
              {!isApiConfigured() && (
                <p className="mt-3 text-xs text-ink-faint">
                  Set NEXT_PUBLIC_API_URL to enable the vector path.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature comparison table */}
      <FeatureComparison />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProfileDetail({
  profile,
  taste,
}: {
  profile: DemoProfile;
  taste: TasteProfile;
}) {
  const sortedVibes = Object.entries(taste.vibes).sort((a, b) => b[1] - a[1]);
  const maxWeight = sortedVibes[0]?.[1] ?? 1;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-coral-soft text-3xl">
          {profile.emoji}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-ink">
            {profile.name} — {profile.persona}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{profile.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-ink-soft">
              Age {profile.age}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-ink-soft">
              {profile.gender}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-ink-soft">
              {profile.budget} budget
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-ink-soft">
              {profile.likedProductIds.length} likes
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-ink-soft">
              {profile.savedProductIds.length} saves
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-ink-soft">
              {profile.follows.length} follows
            </span>
          </div>
        </div>
      </div>

      {/* Taste vector visualization */}
      {sortedVibes.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
            Computed Taste Vector
          </h3>
          <div className="space-y-1.5">
            {sortedVibes.map(([vibe, weight]) => (
              <div key={vibe} className="flex items-center gap-2">
                <span className="w-20 text-right text-[12px] font-semibold text-ink">
                  {vibe}
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-cream">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-coral/70 transition-all"
                    style={{ width: `${(weight / maxWeight) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[11px] font-mono text-ink-faint">
                  {weight.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          {taste.prefPrice != null && (
            <p className="mt-3 text-xs text-ink-faint">
              Preferred price: <strong className="text-ink">${taste.prefPrice.toFixed(0)}</strong>
            </p>
          )}
        </div>
      )}
      {sortedVibes.length === 0 && (
        <p className="mt-4 text-sm italic text-ink-faint">
          Cold start — no interactions yet. The ranker will use neutral scores.
        </p>
      )}
    </div>
  );
}

function FacetResults({
  scored,
  taste,
}: {
  scored: Scored[];
  taste: TasteProfile;
}) {
  return (
    <div className="space-y-2">
      {scored.map((s, i) => {
        const meta = PRODUCT_META[s.product.id];
        return (
          <div
            key={s.product.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-cream/50 p-3"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white bg-coral/80">
              {i + 1}
            </span>
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl"
              style={{ background: GRADIENTS[s.product.grad] }}
            >
              {s.product.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-sm font-bold text-ink">
                  {s.product.name}
                </span>
                <span className="text-[11px] text-ink-faint">
                  ${s.product.price}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-ink-faint">
                {s.reason}
              </div>
              {meta && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {meta.vibes.map((v) => (
                    <span
                      key={v}
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        (taste.vibes[v] ?? 0) > 0
                          ? "bg-coral/15 text-coral"
                          : "bg-cream text-ink-faint"
                      }`}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold text-ink">
                {s.score.toFixed(3)}
              </div>
              <div className="mt-0.5 space-y-0.5 text-[10px] text-ink-faint">
                <div>T:{s.breakdown.taste.toFixed(2)}</div>
                <div>P:{s.breakdown.price.toFixed(2)}</div>
                <div>S:{s.breakdown.social.toFixed(2)}</div>
                <div>F:{s.breakdown.follow.toFixed(2)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VectorResults({ results }: { results: VectorResult[] }) {
  if (results.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-faint">
        No vector results returned. The API may have fallen back to the facet scorer
        or no seed vectors were provided.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((r, i) => {
        const mapped = mapApiPost(r as never);
        return (
          <div
            key={r.postId}
            className="flex items-center gap-3 rounded-xl border border-line bg-cream/50 p-3"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white bg-sky-500/80">
              {i + 1}
            </span>
            {r.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.image}
                alt={r.name || r.postId}
                className="h-10 w-10 shrink-0 rounded-xl object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl"
                style={{ background: GRADIENTS[mapped.product.grad] }}
              >
                {mapped.product.emoji}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-ink">
                {r.name || mapped.product.name}
              </div>
              <div className="mt-0.5 text-[11px] text-ink-faint">
                {r.reason ?? "Vector similarity"} · {r.source ?? "pinterest"}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {r._score != null && (
                <div className="text-sm font-bold text-ink">
                  {r._score.toFixed(3)}
                </div>
              )}
              {r._distance != null && (
                <div className="text-[10px] text-ink-faint">
                  dist: {r._distance.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EngineExplainer() {
  return (
    <div className="mb-8 space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-ink">
        How the Recommendation Engine Works
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-coral-soft/50 p-4">
          <h3 className="mb-2 text-sm font-bold text-ink">
            A — Client-Side Facet Ranker
          </h3>
          <ul className="space-y-1.5 text-xs text-ink-soft">
            <li>
              <strong>Input:</strong> User interactions (likes, saves, comments, follows)
            </li>
            <li>
              <strong>Taste vector:</strong> Weighted sum over 15 hand-tagged &quot;vibes&quot;
              (cozy, film, retro, tech, music, home, wellness, kitchen, luxe,
              romantic, beauty, minimal, stationery, calm, warm)
            </li>
            <li>
              <strong>Scoring:</strong> 0.45 × taste_overlap + 0.15 × price_gaussian
              + 0.20 × social_proof + 0.20 × follow_affinity + jitter
            </li>
            <li>
              <strong>Price fit:</strong> Gaussian around mean price of liked/saved items
            </li>
            <li>
              <strong>Cold start:</strong> Neutral 0.5 for taste and price; relies on
              social proof and exploration jitter
            </li>
            <li>
              <strong>No ML model</strong> — purely deterministic rules
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-sky-100/60 p-4">
          <h3 className="mb-2 text-sm font-bold text-ink">
            B — Server-Side Vector Recommender
          </h3>
          <ul className="space-y-1.5 text-xs text-ink-soft">
            <li>
              <strong>Model:</strong> Amazon Titan Multimodal Embeddings G1
              (amazon.titan-embed-image-v1), 1024 dimensions
            </li>
            <li>
              <strong>Embedding space:</strong> Unified text + image — enables
              image→image and text→image similarity
            </li>
            <li>
              <strong>Taste centroid:</strong> Mean embedding of user&apos;s seed pins
              (liked/saved items)
            </li>
            <li>
              <strong>Index:</strong> Amazon S3 Vectors (72 Pinterest pins embedded),
              cosine distance
            </li>
            <li>
              <strong>Scoring:</strong> 1 − cosine_distance (higher = more similar)
            </li>
            <li>
              <strong>Fallback:</strong> DynamoDB scan + scorePost() facet formula
              (social 35%, type 15%, vibe 25%, recipient 20%, occasion 15%, category 20%,
              recency 10%)
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl bg-cream p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">Features Available</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-ink-soft sm:grid-cols-4">
          <div>
            <div className="font-semibold text-ink">Taste (vibes)</div>
            <div>15 hand-tagged categories</div>
          </div>
          <div>
            <div className="font-semibold text-ink">Price preference</div>
            <div>Gaussian around mean</div>
          </div>
          <div>
            <div className="font-semibold text-ink">Social proof</div>
            <div>Like count, saturating</div>
          </div>
          <div>
            <div className="font-semibold text-ink">Follow affinity</div>
            <div>Binary follow signal</div>
          </div>
          <div>
            <div className="font-semibold text-ink">Multimodal embeddings</div>
            <div>1024-d image+text vectors</div>
          </div>
          <div>
            <div className="font-semibold text-ink">Recipient match</div>
            <div>Exact facet match</div>
          </div>
          <div>
            <div className="font-semibold text-ink">Occasion match</div>
            <div>Exact facet match</div>
          </div>
          <div>
            <div className="font-semibold text-ink">Recency</div>
            <div>Linear decay (365d)</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-cream p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">Model Serving Architecture</h3>
        <ul className="space-y-1 text-xs text-ink-soft">
          <li>
            <strong>Embedding:</strong> Bedrock InvokeModel (on-demand, no provisioned
            throughput) — ~$0.00006/image
          </li>
          <li>
            <strong>Vector store:</strong> Amazon S3 Vectors (bucket: giftmaxxing-dev-vectors,
            index: pins) — lowest-cost managed vector DB
          </li>
          <li>
            <strong>Serving:</strong> Single Lambda behind API Gateway HTTP API — brute-force
            kNN via S3 Vectors QueryVectors API
          </li>
          <li>
            <strong>Latency:</strong> Cold start ~200ms, warm ~50ms for kNN query
          </li>
          <li>
            <strong>Scale path:</strong> S3 Vectors → OpenSearch Serverless (ANN/HNSW)
            when {">"} 100k vectors
          </li>
        </ul>
      </div>
    </div>
  );
}

function FeatureComparison() {
  const rows = [
    {
      feature: "Taste signal",
      facet: "Hand-tagged vibes (15 categories), weighted by interaction type",
      vector: "Multimodal embeddings (1024-d) capturing visual + textual similarity",
    },
    {
      feature: "Cold start",
      facet: "Neutral 0.5 score — needs 2-3 interactions to differentiate",
      vector: "No centroid without seeds — falls back to facet scoring",
    },
    {
      feature: "Catalog coverage",
      facet: "8 hardcoded demo products with manual vibe tags",
      vector: "72 Pinterest pins (expandable to full product catalog)",
    },
    {
      feature: "Price sensitivity",
      facet: "Gaussian fit around mean of liked/saved item prices",
      vector: "Not modeled — similarity is purely visual/semantic",
    },
    {
      feature: "Social signal",
      facet: "Like count (saturating at 250) + follow graph",
      vector: "Not modeled — could blend post-kNN",
    },
    {
      feature: "Explainability",
      facet: "Full breakdown: taste/price/social/follow scores + natural language reason",
      vector: "Cosine distance only — \"Similar to your taste\" generic reason",
    },
    {
      feature: "Latency",
      facet: "Instant (client-side, ~1ms)",
      vector: "~50-200ms (Lambda + S3 Vectors kNN)",
    },
    {
      feature: "Scalability",
      facet: "O(products × users) in-memory — fine for <1000 items",
      vector: "S3 Vectors scales to millions; upgrade to ANN for sub-10ms",
    },
  ];

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-xl font-bold text-ink">
        Feature Comparison
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/70">
              <th className="px-4 py-3 text-left font-bold text-ink">Feature</th>
              <th className="px-4 py-3 text-left font-bold text-coral">
                A — Facet Ranker
              </th>
              <th className="px-4 py-3 text-left font-bold text-sky-600">
                B — Vector Recommender
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.feature} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{r.feature}</td>
                <td className="px-4 py-3 text-ink-soft">{r.facet}</td>
                <td className="px-4 py-3 text-ink-soft">{r.vector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
