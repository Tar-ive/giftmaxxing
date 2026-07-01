"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/identity";
import { Avatar, Maxi } from "@/components/ui";
import {
  Search,
  Heart,
  Gift,
  Users,
  Sparkles,
  ShoppingBag,
  Calendar,
  MessageCircle,
  Bell,
  Settings,
  ArrowRight,
  Zap,
  TrendingUp,
  Star,
} from "lucide-react";

type IconComponent = typeof Search;

interface FeatureCard {
  title: string;
  description: string;
  href: string;
  icon: IconComponent;
  color: string;
  badge?: string;
}

const PRIMARY_FEATURES: FeatureCard[] = [
  {
    title: "Discover Feed",
    description: "Browse gift finds from friends and taste-matched recommendations.",
    href: "/feed",
    icon: Search,
    color: "#ffc2d1",
  },
  {
    title: "Swipe Challenge",
    description: "Learn anyone's taste in 60 seconds. Share the link, see what they love.",
    href: "/feed/swipe",
    icon: Heart,
    color: "#d9c2ff",
  },
  {
    title: "Ask Maxi",
    description: "Your AI gift companion. Tell Maxi who you're shopping for and get instant ideas.",
    href: "/feed/maxi",
    icon: Sparkles,
    color: "#ffe7a0",
    badge: "AI",
  },
  {
    title: "Gift Pools",
    description: "Pool money with friends for the big gift nobody could afford solo.",
    href: "/feed/pools",
    icon: Users,
    color: "#bfe3ff",
  },
  {
    title: "Shop",
    description: "Browse curated collections and trending finds across every budget.",
    href: "/feed/shop",
    icon: ShoppingBag,
    color: "#cde6c5",
  },
  {
    title: "Gift Ideas",
    description: "AI-powered gift recommendations personalized for every person and occasion.",
    href: "/feed/ideas",
    icon: Gift,
    color: "#ffd3a5",
  },
];

const SECONDARY_FEATURES: FeatureCard[] = [
  {
    title: "Events",
    description: "Never miss a birthday or celebration again.",
    href: "/feed/events",
    icon: Calendar,
    color: "#d9c2ff",
  },
  {
    title: "Messages",
    description: "Chat with friends about gift ideas and coordinate purchases.",
    href: "/feed/messages",
    icon: MessageCircle,
    color: "#bfe3ff",
  },
  {
    title: "Notifications",
    description: "Friend requests, pool updates, and gift reminders.",
    href: "/feed/activity",
    icon: Bell,
    color: "#ffc2d1",
  },
  {
    title: "Drops",
    description: "Limited-edition finds and flash deals from curated brands.",
    href: "/feed/drops",
    icon: Zap,
    color: "#ffe7a0",
  },
  {
    title: "Milestones",
    description: "Track your gifting streaks, saves, and impact.",
    href: "/feed/milestones",
    icon: TrendingUp,
    color: "#cde6c5",
  },
  {
    title: "Recommendations",
    description: "Personalized picks based on your taste and history.",
    href: "/feed/recommendations",
    icon: Star,
    color: "#ffd3a5",
  },
];

function CardGrid({ cards, large }: { cards: FeatureCard[]; large?: boolean }) {
  return (
    <div className={`grid gap-3 ${large ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"}`}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:border-coral/30 hover:shadow-lg hover:shadow-coral/5 hover:-translate-y-1 card-glow ${
              large ? "min-h-[160px]" : "min-h-[120px]"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${card.color}40` }}
              >
                <Icon size={18} style={{ color: "#fb6f52" }} />
              </div>
              {card.badge && (
                <span className="text-[10px] font-bold rounded-full bg-coral/10 text-coral px-2 py-0.5">
                  {card.badge}
                </span>
              )}
            </div>

            <h3 className={`font-bold text-ink mb-1 ${large ? "text-base" : "text-sm"}`}>
              {card.title}
            </h3>
            <p className={`text-ink-soft leading-relaxed ${large ? "text-sm" : "text-xs"}`}>
              {card.description}
            </p>

            <ArrowRight
              size={14}
              className="absolute bottom-4 right-4 text-ink-faint opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
            />
          </Link>
        );
      })}
    </div>
  );
}

export default function MorePage() {
  const me = useCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Avatar grad={me.grad} label={me.name} size={44} />
          <div>
            <p className="font-bold text-ink text-lg">{me.name}</p>
            <p className="text-xs text-ink-faint">@{me.handle}</p>
          </div>
        </div>
        <Link
          href="/feed/settings"
          className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-soft hover:bg-ink/5 transition-colors"
        >
          <Settings size={14} />
          <span>Settings</span>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { value: "12k+", label: "Finds saved" },
          { value: "0", label: "Double-buys" },
          { value: "4.9", label: "Avg rating" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-line bg-surface p-4 text-center"
          >
            <p className="text-2xl font-display text-ink">{stat.value}</p>
            <p className="text-[10px] text-ink-faint mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Primary features */}
      <div className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-4">
          Core Features
        </h2>
        <CardGrid cards={PRIMARY_FEATURES} large />
      </div>

      {/* Secondary features */}
      <div className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-4">
          More to Explore
        </h2>
        <CardGrid cards={SECONDARY_FEATURES} />
      </div>

      {/* Ask Maxi banner */}
      <Link
        href="/feed/maxi"
        className="group flex items-center gap-4 rounded-2xl border border-coral/20 bg-coral/5 p-5 transition-all duration-300 hover:border-coral/40 hover:bg-coral/10"
      >
        <Maxi size={48} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink">Need help finding the perfect gift?</p>
          <p className="text-sm text-ink-soft">
            Ask Maxi — your AI companion that reads their taste and finds the match.
          </p>
        </div>
        <ArrowRight
          size={18}
          className="text-coral shrink-0 transition-transform group-hover:translate-x-1"
        />
      </Link>

      {/* Footer links */}
      <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t border-line">
        <Link href="/privacy" className="text-xs text-ink-faint hover:text-ink transition-colors">
          Privacy
        </Link>
        <Link href="/" className="text-xs text-ink-faint hover:text-ink transition-colors">
          Home
        </Link>
        <Link href="/feed/settings" className="text-xs text-ink-faint hover:text-ink transition-colors">
          Settings
        </Link>
      </div>
    </div>
  );
}
