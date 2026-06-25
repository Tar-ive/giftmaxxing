"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section id="waitlist" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`relative border border-foreground/15 rounded-[2rem] overflow-hidden bg-card/50 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          onMouseMove={handleMouseMove}
        >
          {/* Spotlight effect */}
          <div 
            className="absolute inset-0 opacity-40 pointer-events-none transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(251,111,82,0.20), transparent 40%)`
            }}
          />
          
          <div className="relative z-10 px-8 lg:px-16 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              {/* Left content */}
              <div className="flex-1">
                <h2 className="text-6xl md:text-7xl lg:text-[72px] font-display tracking-tight mb-8 leading-[0.95]">
                  Ready to give a gift
                  <br />
                  they&apos;ll remember?
                </h2>

                <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
                  Join the waitlist for early access to Giftmaxxing — the social
                  gifting app with an AI companion who actually gets it.
                </p>

                {submitted ? (
                  <div className="inline-flex items-center gap-3 rounded-full border border-[#fb6f52]/40 bg-[#fb6f52]/10 px-6 h-14 text-base">
                    <span className="text-2xl">🎁</span>
                    <span>You&apos;re on the list — we&apos;ll be in touch soon.</span>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (email.trim()) setSubmitted(true);
                    }}
                    className="flex flex-col sm:flex-row items-stretch gap-3 max-w-md"
                  >
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="flex-1 h-14 rounded-full bg-foreground/5 border border-foreground/20 px-6 text-base outline-none focus:border-foreground/50 transition-colors"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-[#fb6f52] hover:bg-[#fb6f52]/90 text-white px-8 h-14 text-base rounded-full group shrink-0"
                    >
                      Get early access
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </form>
                )}

                <p className="text-sm text-muted-foreground mt-8 font-mono">
                  No spam — just an invite when your spot opens.
                </p>
              </div>

              {/* Right image */}
              <div className="hidden lg:flex items-center justify-center w-[480px] h-[420px] shrink-0 overflow-hidden rounded-2xl border border-foreground/10">
                <img
                  src="/shots/feed-desktop.jpg"
                  alt="The Giftmaxxing feed of real, shoppable finds"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
