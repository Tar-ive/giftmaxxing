"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Maxi } from "@/components/ui";
import {
  type GiftRole,
  type GiftDifficulty,
  type GiftStyle,
  type MaterialisticCategory,
  type InterestTag,
  type PinterestLink,
  type UserProfile,
  type DealSensitivity,
  type DealType,
  type BudgetRange,
  INTEREST_META,
  MATERIALISTIC_META,
  DEAL_SENSITIVITY_META,
  BUDGET_RANGE_META,
  DEAL_TYPE_META,
  saveProfile,
} from "@/lib/onboarding";

// ── Step definitions ────────────────────────────────────────────────────────

const TOTAL_STEPS = 8; // welcome, role, difficulty, style, materialistic (conditional), interests, deals, pinterest

type StepProps = {
  onNext: () => void;
  onBack: () => void;
};

// ── Main page ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState<GiftRole | null>(null);
  const [difficulty, setDifficulty] = useState<GiftDifficulty | null>(null);
  const [style, setStyle] = useState<GiftStyle | null>(null);
  const [matCategories, setMatCategories] = useState<Set<MaterialisticCategory>>(new Set());
  const [interests, setInterests] = useState<Set<InterestTag>>(new Set());
  const [pinterestUrl, setPinterestUrl] = useState("");
  const [pinterestLinks, setPinterestLinks] = useState<PinterestLink[]>([]);
  const [dealSensitivity, setDealSensitivity] = useState<DealSensitivity | null>(null);
  const [budgetRange, setBudgetRange] = useState<BudgetRange | null>(null);
  const [dealTypes, setDealTypes] = useState<Set<DealType>>(new Set());
  const [priceAlerts, setPriceAlerts] = useState(false);

  // Whether the materialistic sub-step should show
  const showMaterialistic = style === "materialistic" || style === "mix";

  // Effective step count (materialistic step is conditional)
  const effectiveTotal = showMaterialistic ? TOTAL_STEPS : TOTAL_STEPS - 1;

  // Map visual step to logical step index
  const logicalStep = useMemo(() => {
    if (!showMaterialistic && step >= 4) return step + 1;
    return step;
  }, [step, showMaterialistic]);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, effectiveTotal - 1)), [effectiveTotal]);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const handleFinish = useCallback(() => {
    const profile: UserProfile = {
      name: name.trim(),
      role: role ?? "both",
      difficulty: difficulty ?? "moderate",
      style: style ?? "mix",
      materialisticCategories: showMaterialistic ? Array.from(matCategories) : [],
      interests: Array.from(interests),
      dealPreferences: {
        sensitivity: dealSensitivity ?? "value-conscious",
        budgetRange: budgetRange ?? "mid",
        dealTypes: Array.from(dealTypes),
        priceAlerts,
      },
      pinterestLinks,
      completedAt: Date.now(),
    };
    if (!saveProfile(profile)) return;
    router.push("/feed");
  }, [name, role, difficulty, style, showMaterialistic, matCategories, interests, dealSensitivity, budgetRange, dealTypes, priceAlerts, pinterestLinks, router]);

  const addPinterestLink = useCallback(() => {
    const url = pinterestUrl.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      if (host !== "pinterest.com" && host !== "pin.it") return;
    } catch {
      return;
    }
    setPinterestLinks((prev) => [...prev, { profileUrl: url, linkedAt: Date.now() }]);
    setPinterestUrl("");
  }, [pinterestUrl]);

  const removePinterestLink = useCallback((idx: number) => {
    setPinterestLinks((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const toggleMat = useCallback((cat: MaterialisticCategory) => {
    setMatCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleInterest = useCallback((tag: InterestTag) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const toggleDealType = useCallback((dt: DealType) => {
    setDealTypes((prev) => {
      const next = new Set(prev);
      if (next.has(dt)) next.delete(dt);
      else next.add(dt);
      return next;
    });
  }, []);

  const progress = ((step + 1) / effectiveTotal) * 100;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-line">
        <div
          className="h-full bg-coral transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Step content with a CSS transition wrapper */}
          <div key={step} className="animate-rise">
            {logicalStep === 0 && (
              <StepWelcome name={name} setName={setName} onNext={goNext} />
            )}
            {logicalStep === 1 && (
              <StepRole role={role} setRole={setRole} onNext={goNext} onBack={goBack} />
            )}
            {logicalStep === 2 && (
              <StepDifficulty
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {logicalStep === 3 && (
              <StepStyle style={style} setStyle={setStyle} onNext={goNext} onBack={goBack} />
            )}
            {logicalStep === 4 && (
              <StepMaterialistic
                selected={matCategories}
                toggle={toggleMat}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {logicalStep === 5 && (
              <StepInterests
                selected={interests}
                toggle={toggleInterest}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {logicalStep === 6 && (
              <StepDeals
                sensitivity={dealSensitivity}
                setSensitivity={setDealSensitivity}
                budgetRange={budgetRange}
                setBudgetRange={setBudgetRange}
                selectedDealTypes={dealTypes}
                toggleDealType={toggleDealType}
                priceAlerts={priceAlerts}
                setPriceAlerts={setPriceAlerts}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {logicalStep === 7 && (
              <StepPinterest
                url={pinterestUrl}
                setUrl={setPinterestUrl}
                links={pinterestLinks}
                onAdd={addPinterestLink}
                onRemove={removePinterestLink}
                onFinish={handleFinish}
                onBack={goBack}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step components ─────────────────────────────────────────────────────────

function StepWelcome({
  name,
  setName,
  onNext,
}: {
  name: string;
  setName: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Maxi size={72} />
      <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Welcome to Giftmaxxing
      </h1>
      <p className="mt-3 text-ink-soft">
        Let&apos;s personalize your experience. First, what should we call you?
      </p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoFocus
        className="mt-8 w-full max-w-xs rounded-xl border border-line bg-surface px-4 py-3 text-center text-lg font-medium text-ink outline-none transition-shadow focus:border-coral focus:ring-2 focus:ring-coral/20"
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onNext();
        }}
      />

      <button
        onClick={onNext}
        disabled={!name.trim()}
        className="mt-6 rounded-full bg-ink px-8 py-3 text-sm font-bold text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}

function StepRole({
  role,
  setRole,
  onNext,
  onBack,
}: {
  role: GiftRole | null;
  setRole: (v: GiftRole) => void;
} & StepProps) {
  const options: { value: GiftRole; label: string; desc: string; emoji: string }[] = [
    { value: "giver", label: "Gift giver", desc: "I love finding the perfect gift for others", emoji: "🎁" },
    { value: "taker", label: "Gift receiver", desc: "I want to build wishlists people can shop from", emoji: "🎀" },
    { value: "both", label: "Both!", desc: "I give and love receiving thoughtful gifts", emoji: "🤝" },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">About you</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        Are you a gift giver or receiver?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">This helps us tailor your feed</p>

      <div className="mt-8 flex w-full flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRole(opt.value)}
            className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
              role === opt.value
                ? "border-coral bg-coral-soft/50 shadow-sm"
                : "border-line bg-surface hover:border-ink/20"
            }`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <p className="font-bold text-ink">{opt.label}</p>
              <p className="text-sm text-ink-soft">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!role} />
    </div>
  );
}

function StepDifficulty({
  difficulty,
  setDifficulty,
  onNext,
  onBack,
}: {
  difficulty: GiftDifficulty | null;
  setDifficulty: (v: GiftDifficulty) => void;
} & StepProps) {
  const options: { value: GiftDifficulty; label: string; emoji: string }[] = [
    { value: "easy", label: "Easy — I always know what to get", emoji: "😎" },
    { value: "moderate", label: "Moderate — depends on the person", emoji: "🤔" },
    { value: "hard", label: "Hard — I need all the help I can get", emoji: "😅" },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Gift giving</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        How easy is gift giving for you?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">No wrong answers here</p>

      <div className="mt-8 flex w-full flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDifficulty(opt.value)}
            className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
              difficulty === opt.value
                ? "border-coral bg-coral-soft/50 shadow-sm"
                : "border-line bg-surface hover:border-ink/20"
            }`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <p className="font-bold text-ink">{opt.label}</p>
          </button>
        ))}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!difficulty} />
    </div>
  );
}

function StepStyle({
  style,
  setStyle,
  onNext,
  onBack,
}: {
  style: GiftStyle | null;
  setStyle: (v: GiftStyle) => void;
} & StepProps) {
  const options: { value: GiftStyle; label: string; desc: string; emoji: string }[] = [
    {
      value: "thoughtful",
      label: "Thoughtful",
      desc: "Handwritten notes, experiences, sentimental value",
      emoji: "💌",
    },
    {
      value: "materialistic",
      label: "Materialistic",
      desc: "Specific products, brands, wishlists",
      emoji: "🛍️",
    },
    {
      value: "mix",
      label: "A mix of both",
      desc: "Depends on the person and occasion",
      emoji: "✨",
    },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Gift style</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        Thoughtful or materialistic?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">What kind of gifts resonate with you?</p>

      <div className="mt-8 flex w-full flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStyle(opt.value)}
            className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
              style === opt.value
                ? "border-coral bg-coral-soft/50 shadow-sm"
                : "border-line bg-surface hover:border-ink/20"
            }`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <p className="font-bold text-ink">{opt.label}</p>
              <p className="text-sm text-ink-soft">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!style} />
    </div>
  );
}

function StepMaterialistic({
  selected,
  toggle,
  onNext,
  onBack,
}: {
  selected: Set<MaterialisticCategory>;
  toggle: (cat: MaterialisticCategory) => void;
} & StepProps) {
  const cats = Object.entries(MATERIALISTIC_META) as [MaterialisticCategory, { label: string; emoji: string }][];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Categories</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        What kind of gifts?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">Pick as many as you like</p>

      <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {cats.map(([key, meta]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 transition-all ${
              selected.has(key)
                ? "border-coral bg-coral-soft/50 shadow-sm"
                : "border-line bg-surface hover:border-ink/20"
            }`}
          >
            <span className="text-2xl">{meta.emoji}</span>
            <span className="text-xs font-bold text-ink">{meta.label}</span>
          </button>
        ))}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={selected.size === 0} />
    </div>
  );
}

function StepInterests({
  selected,
  toggle,
  onNext,
  onBack,
}: {
  selected: Set<InterestTag>;
  toggle: (tag: InterestTag) => void;
} & StepProps) {
  const tags = Object.entries(INTEREST_META) as [InterestTag, { label: string; emoji: string }][];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Interests</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        Pick your vibes
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Select at least 3 to help Maxi learn your taste
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {tags.map(([key, meta]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all ${
              selected.has(key)
                ? "border-coral bg-coral-soft/50 text-ink shadow-sm"
                : "border-line bg-surface text-ink-soft hover:border-ink/20 hover:text-ink"
            }`}
          >
            <span>{meta.emoji}</span>
            {meta.label}
          </button>
        ))}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={selected.size < 3} nextLabel="Next" />
    </div>
  );
}

function StepDeals({
  sensitivity,
  setSensitivity,
  budgetRange,
  setBudgetRange,
  selectedDealTypes,
  toggleDealType,
  priceAlerts,
  setPriceAlerts,
  onNext,
  onBack,
}: {
  sensitivity: DealSensitivity | null;
  setSensitivity: (v: DealSensitivity) => void;
  budgetRange: BudgetRange | null;
  setBudgetRange: (v: BudgetRange) => void;
  selectedDealTypes: Set<DealType>;
  toggleDealType: (dt: DealType) => void;
  priceAlerts: boolean;
  setPriceAlerts: (v: boolean) => void;
} & StepProps) {
  const sensitivities = Object.entries(DEAL_SENSITIVITY_META) as [DealSensitivity, { label: string; desc: string; emoji: string }][];
  const budgets = Object.entries(BUDGET_RANGE_META) as [BudgetRange, { label: string; emoji: string }][];
  const deals = Object.entries(DEAL_TYPE_META) as [DealType, { label: string; emoji: string }][];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Value & deals</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        How do you shop for gifts?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Help Maxi find the best value for your gifts
      </p>

      {/* Deal sensitivity */}
      <div className="mt-6 w-full">
        <p className="mb-3 text-left text-xs font-semibold uppercase tracking-widest text-ink-faint">
          Your shopping style
        </p>
        <div className="flex w-full flex-col gap-2">
          {sensitivities.map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setSensitivity(key)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                sensitivity === key
                  ? "border-coral bg-coral-soft/50 shadow-sm"
                  : "border-line bg-surface hover:border-ink/20"
              }`}
            >
              <span className="text-xl">{meta.emoji}</span>
              <div>
                <p className="text-sm font-bold text-ink">{meta.label}</p>
                <p className="text-xs text-ink-soft">{meta.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget range */}
      <div className="mt-6 w-full">
        <p className="mb-3 text-left text-xs font-semibold uppercase tracking-widest text-ink-faint">
          Typical gift budget
        </p>
        <div className="grid w-full grid-cols-2 gap-2">
          {budgets.map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setBudgetRange(key)}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 transition-all ${
                budgetRange === key
                  ? "border-coral bg-coral-soft/50 shadow-sm"
                  : "border-line bg-surface hover:border-ink/20"
              }`}
            >
              <span className="text-lg">{meta.emoji}</span>
              <span className="text-sm font-bold text-ink">{meta.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Deal types */}
      <div className="mt-6 w-full">
        <p className="mb-3 text-left text-xs font-semibold uppercase tracking-widest text-ink-faint">
          What deals interest you?
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {deals.map(([key, meta]) => (
            <button
              key={key}
              onClick={() => toggleDealType(key)}
              className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-all ${
                selectedDealTypes.has(key)
                  ? "border-coral bg-coral-soft/50 text-ink shadow-sm"
                  : "border-line bg-surface text-ink-soft hover:border-ink/20 hover:text-ink"
              }`}
            >
              <span>{meta.emoji}</span>
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price alerts toggle */}
      <div className="mt-6 w-full">
        <button
          onClick={() => setPriceAlerts(!priceAlerts)}
          className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
            priceAlerts
              ? "border-coral bg-coral-soft/50 shadow-sm"
              : "border-line bg-surface hover:border-ink/20"
          }`}
        >
          <span className="text-2xl">{priceAlerts ? "\ud83d\udd14" : "\ud83d\udd15"}</span>
          <div>
            <p className="font-bold text-ink">Price drop alerts</p>
            <p className="text-xs text-ink-soft">
              Get notified when items on your watchlist go on sale
            </p>
          </div>
          <div className={`ml-auto h-6 w-10 rounded-full transition-colors ${priceAlerts ? "bg-coral" : "bg-line"}`}>
            <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${priceAlerts ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </button>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!sensitivity} />
    </div>
  );
}

function StepPinterest({
  url,
  setUrl,
  links,
  onAdd,
  onRemove,
  onFinish,
  onBack,
}: {
  url: string;
  setUrl: (v: string) => void;
  links: PinterestLink[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
        Social profiles
      </p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        Link a Pinterest profile
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        Paste a Pinterest profile or board URL. Maxi will analyze their taste and suggest gifts
        they&apos;ll love.
      </p>

      {/* URL input */}
      <div className="mt-8 flex w-full gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://pinterest.com/username or board URL"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-shadow focus:border-coral focus:ring-2 focus:ring-coral/20"
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
          }}
        />
        <button
          onClick={onAdd}
          disabled={!url.trim()}
          className="rounded-xl bg-ink px-4 py-3 text-sm font-bold text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* Linked profiles */}
      {links.length > 0 && (
        <div className="mt-4 w-full space-y-2">
          {links.map((link, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <PinterestIcon />
                <span className="truncate text-sm font-medium text-ink">
                  {link.profileUrl}
                </span>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="ml-2 shrink-0 text-xs font-semibold text-ink-faint hover:text-coral"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info card about visual search */}
      <div className="mt-6 w-full rounded-2xl border border-line bg-surface p-5 text-left">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl">🔍</span>
          <div>
            <p className="text-sm font-bold text-ink">Visual Search (coming soon)</p>
            <p className="mt-1 text-xs text-ink-soft">
              Maxi will analyze pinned images using AI visual search to understand aesthetic
              preferences — colors, styles, and vibes — then recommend gifts that match.
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="mt-8 flex w-full items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink/5"
        >
          Back
        </button>
        <div className="flex gap-3">
          {links.length === 0 && (
            <button
              onClick={onFinish}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink/5"
            >
              Skip for now
            </button>
          )}
          <button
            onClick={onFinish}
            className="rounded-full bg-coral px-8 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {links.length > 0 ? "Finish" : "Get started"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared UI pieces ────────────────────────────────────────────────────────

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 flex w-full items-center justify-between">
      <button
        onClick={onBack}
        className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink/5"
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-full bg-ink px-8 py-2.5 text-sm font-bold text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function PinterestIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="#E60023">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}
