"use client";

import { ArrowUpRight } from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "The feed", href: "#showcase" },
    { name: "Meet Maxi", href: "#maxi" },
  ],
  Explore: [
    { name: "Early access", href: "#waitlist" },
    { name: "Shared wishlists", href: "#features" },
    { name: "Group gifting", href: "#how-it-works" },
    { name: "Discovery", href: "#showcase" },
  ],
  Company: [
    { name: "About", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#", badge: "Hiring" },
    { name: "Contact", href: "#" },
  ],
  Legal: [
    { name: "Privacy", href: "#" },
    { name: "Terms", href: "#" },
    { name: "Cookies", href: "#" },
  ],
};

const socialLinks = [
  { name: "Instagram", href: "#" },
  { name: "TikTok", href: "#" },
  { name: "Pinterest", href: "#" },
];

export function FooterSection() {
  return (
    <footer className="relative bg-[#fbf7f1]">
      {/* Panoramic banner image */}
      <div
        className="relative w-full h-[340px] md:h-[420px] overflow-hidden"
        style={{ background: "radial-gradient(120% 120% at 50% 0%, rgba(251,111,82,0.18), #fbf7f1 60%)" }}
      >
        <img
          src="https://cdn.midjourney.com/4262b272-bbea-46a1-b9fc-b436daa101fe/0_0.jpeg"
          alt="Wrapped gifts"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient fade to cream at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fbf7f1]" />
        {/* Subtle cream vignette on sides */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#fbf7f1]/30 via-transparent to-[#fbf7f1]/30" />
      </div>

      {/* Footer content — black background, white text */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Main Footer */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <a href="#" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display text-foreground">giftmaxxing</span>
                <span className="text-xs text-muted-foreground font-mono">beta</span>
              </a>

              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs text-sm">
                The social gifting app with an AI companion. Discover finds, build shared wishlists, and never miss the mark again.
              </p>

              {/* Social Links */}
              <div className="flex gap-6">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium text-foreground mb-6">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                      >
                        {link.name}
                        {"badge" in link && link.badge && (
                          <span className="text-xs px-2 py-0.5 bg-[#fb6f52] text-white rounded-full">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; 2025 Giftmaxxing. Made with care.
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#fb6f52]" />
              Maxi is online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
