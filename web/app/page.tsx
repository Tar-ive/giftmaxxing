import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { StatStrip, MaxiSpotlight, FeatureGrid } from "@/components/features";
import { HowItWorks } from "@/components/how";
import { WaitlistCTA, Footer } from "@/components/cta-footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <StatStrip />
        <MaxiSpotlight />
        <FeatureGrid />
        <HowItWorks />
        <WaitlistCTA />
      </main>
      <Footer />
    </>
  );
}
