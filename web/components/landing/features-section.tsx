"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    number: "01",
    title: "Meet Maxi",
    description:
      "Your AI gift companion reads a person's taste from their Pinterest, Spotify and saved finds — then suggests gifts they'll actually love, inside your budget.",
    stats: { value: "94%", label: "match to their taste" },
  },
  {
    number: "02",
    title: "A feed of finds",
    description:
      "See what friends are saving, gifting and unwrapping. Discovery that feels like your favorite feed — not a search box.",
    stats: { value: "12k+", label: "finds shared" },
  },
  {
    number: "03",
    title: "Shared wishlists",
    description:
      "Wishlists the whole group can see, so nobody double-buys and everyone gets something they actually wanted.",
    stats: { value: "0", label: "awkward re-gifts" },
  },
  {
    number: "04",
    title: "Group gifting",
    description:
      "Pool money for the big one. Split it, track it, and ship it together in a few taps.",
    stats: { value: "3 taps", label: "to chip in" },
  },
];

// Floating dot particles visualization
function ParticleVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    // Generate stable particle positions
    const COUNT = 70;
    const particles = Array.from({ length: COUNT }, (_, i) => {
      const seed = i * 1.618;
      return {
        bx: ((seed * 127.1) % 1),
        by: ((seed * 311.7) % 1),
        phase: seed * Math.PI * 2,
        speed: 0.4 + (seed % 0.4),
        radius: 1.2 + (seed % 2.2),
      };
    });

    let time = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach((p) => {
        const flowX = Math.sin(time * p.speed * 0.4 + p.phase) * 38;
        const flowY = Math.cos(time * p.speed * 0.3 + p.phase * 0.7) * 24;

        const bx = p.bx * w;
        const by = p.by * h;
        const dx = p.bx - mx;
        const dy = p.by - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist * 2.8);

        const x = bx + flowX + influence * Math.cos(time + p.phase) * 36;
        const y = by + flowY + influence * Math.sin(time + p.phase) * 36;

        const pulse = Math.sin(time * p.speed + p.phase) * 0.5 + 0.5;
        const alpha = 0.08 + pulse * 0.18 + influence * 0.3;

        ctx.beginPath();
        ctx.arc(x, y, p.radius + pulse * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 111, 82, ${alpha})`;
        ctx.fill();
      });

      time += 0.016;
      frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header - Full width with diagonal layout */}
        <div className="relative mb-24 lg:mb-32">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
                <span className="w-12 h-px bg-foreground/30" />
                What you get
              </span>
              <h2
                className={`text-6xl md:text-7xl lg:text-[120px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Thoughtful,
                <br />
                <span className="text-muted-foreground">on autopilot.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className={`text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}>
                Everything you need to give a gift they&apos;ll remember — discovery, taste, and a companion that does the thinking.
              </p>
            </div>
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Large Maxi card */}
          <div
            id="maxi"
            className={`lg:col-span-12 relative bg-[#fbf7f1] border border-foreground/10 rounded-3xl min-h-[460px] overflow-hidden group transition-all duration-700 flex ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <div className="relative flex-1 p-8 lg:p-12 bg-transparent">
              <ParticleVisualization />
              <div className="relative z-10 pointer-events-none">
                <span className="font-mono text-sm text-muted-foreground">{features[0].number}</span>
                <h3 className="text-3xl lg:text-4xl font-display mt-4 mb-6 text-foreground">{features[0].title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md mb-8">{features[0].description}</p>
                <div>
                  <span className="text-5xl lg:text-6xl font-display word-gradient">{features[0].stats.value}</span>
                  <span className="block text-sm text-muted-foreground font-mono mt-2">{features[0].stats.label}</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative w-[42%] shrink-0 overflow-hidden">
              <img
                src="/shots/pools-desktop.jpg"
                alt=""
                aria-hidden="true"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#fbf7f1] via-[#fbf7f1]/40 to-transparent" />
            </div>
          </div>

          {/* Three smaller cards */}
          {features.slice(1).map((f, i) => (
            <div
              key={f.number}
              className={`lg:col-span-4 relative bg-card border border-foreground/10 rounded-2xl p-8 min-h-[280px] flex flex-col justify-between hover-lift transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${(i + 1) * 120}ms` }}
            >
              <div>
                <span className="font-mono text-sm text-muted-foreground">{f.number}</span>
                <h3 className="text-2xl font-display mt-4 mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
              <div className="mt-6">
                <span className="text-4xl font-display">{f.stats.value}</span>
                <span className="block text-xs text-muted-foreground font-mono mt-1">{f.stats.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
