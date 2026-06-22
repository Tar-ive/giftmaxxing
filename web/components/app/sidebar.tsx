"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, Icons, Maxi } from "@/components/ui";

type Item = {
  label: string;
  href: string;
  icon: keyof typeof Icons;
  activeIcon?: keyof typeof Icons;
};

const ITEMS: Item[] = [
  { label: "Home", href: "/feed", icon: "home", activeIcon: "homeFill" },
  { label: "Search", href: "/feed/search", icon: "search" },
  { label: "Explore", href: "/feed/explore", icon: "compass" },
  { label: "Drops", href: "/feed/drops", icon: "film" },
  { label: "Messages", href: "/feed/messages", icon: "message" },
  { label: "Notifications", href: "/feed/activity", icon: "heart" },
  { label: "Create", href: "/feed/create", icon: "plusSquare" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-cream/80 px-3 py-6 backdrop-blur-xl md:flex md:w-[76px] xl:w-64 xl:px-4">
      <Link href="/feed" className="mb-8 flex items-center gap-2 px-2">
        <Maxi size={34} />
        <span className="hidden font-display text-xl font-extrabold tracking-tight text-ink xl:block">
          Giftmaxxing
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {ITEMS.map((it) => {
          const active = pathname === it.href;
          const Ico = Icons[active && it.activeIcon ? it.activeIcon : it.icon];
          return (
            <Link
              key={it.label}
              href={it.href}
              className={`flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-ink/5 ${
                active ? "font-bold text-ink" : "font-medium text-ink"
              }`}
            >
              <Ico size={26} />
              <span className="hidden xl:block">{it.label}</span>
            </Link>
          );
        })}

        <Link
          href="/feed/maxi"
          className={`flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-coral-soft ${
            pathname === "/feed/maxi" ? "font-bold" : "font-medium"
          } text-ink`}
        >
          <span className="grid h-[26px] w-[26px] place-items-center">
            <Maxi size={26} />
          </span>
          <span className="hidden items-center gap-2 xl:flex">
            Ask Maxi
            <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
              AI
            </span>
          </span>
        </Link>
      </nav>

      <Link
        href="/feed/you"
        className={`mt-2 flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-ink/5 ${
          pathname === "/feed/you" ? "font-bold" : "font-medium"
        } text-ink`}
      >
        <Avatar grad="coral" label="You" size={26} />
        <span className="hidden xl:block">Profile</span>
      </Link>

      <Link
        href="/"
        className="flex items-center gap-4 rounded-xl px-3 py-3 font-medium text-ink-soft transition-colors hover:bg-ink/5"
      >
        <Icons.menu size={26} />
        <span className="hidden xl:block">More</span>
      </Link>
    </aside>
  );
}

/* Mobile top + bottom bars (Instagram mobile web) */
export function MobileBars() {
  const pathname = usePathname();
  const tabs: Item[] = [
    { label: "Home", href: "/feed", icon: "home", activeIcon: "homeFill" },
    { label: "Explore", href: "/feed/explore", icon: "compass" },
    { label: "Create", href: "/feed/create", icon: "plusSquare" },
    { label: "Activity", href: "/feed/activity", icon: "heart" },
    { label: "Profile", href: "/feed/you", icon: "home" },
  ];
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-cream/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/feed" className="flex items-center gap-2">
          <Maxi size={28} />
          <span className="font-display text-lg font-extrabold text-ink">Giftmaxxing</span>
        </Link>
        <div className="flex items-center gap-4 text-ink">
          <Link href="/feed/activity"><Icons.heart size={24} /></Link>
          <Link href="/feed/messages"><Icons.message size={24} /></Link>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-line bg-cream/90 px-2 py-2.5 backdrop-blur-xl md:hidden">
        {tabs.map((t) => {
          const active = pathname === t.href;
          const isProfile = t.label === "Profile";
          if (isProfile)
            return (
              <Link key={t.label} href={t.href}>
                <Avatar grad="coral" label="You" size={26} />
              </Link>
            );
          const Ico = Icons[active && t.activeIcon ? t.activeIcon : t.icon];
          return (
            <Link key={t.label} href={t.href} className="text-ink">
              <Ico size={26} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
