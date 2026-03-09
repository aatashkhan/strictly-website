import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ThreeCards from "@/components/ThreeCards";
import CityGrid from "@/components/CityGrid";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <ThreeCards />
      <CityGrid />

      {/* Denna Intro Section */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-14">
          <div className="w-48 h-48 rounded-full bg-light border border-border flex-shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-[5px] text-gold mb-6 font-mono">
              Who is Strictly?
            </p>
            <h2 className="font-mono text-3xl md:text-4xl font-bold text-brown mb-8">
              Hi, I&apos;m Denna.
            </h2>
            <p className="font-mono text-secondary leading-[1.8] mb-6">
              I&apos;m a travel and lifestyle curator on a permanent mission to find the
              good stuff — the restaurants worth the wait, the hotels that get every
              detail right, the hidden shops that make a city feel like yours. I share
              it all on my Substack (25K+ subscribers and counting!) and now, through
              Strictly Concierge, I can plan your trip for you.
            </p>
            <a
              href="/about"
              className="inline-block font-mono text-sm tracking-wider text-gold hover:text-brown transition-colors"
            >
              Read more about Strictly →
            </a>
          </div>
        </div>
      </section>

      {/* Shop Highlight */}
      <section className="py-28 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[5px] text-gold mb-6 font-mono">
            The Shop
          </p>
          <h2 className="font-mono text-3xl md:text-4xl font-bold text-brown mb-8 leading-snug">
            Curated picks, collabs &amp; the things I&apos;m obsessed with
          </h2>
          <p className="font-mono text-secondary max-w-lg mx-auto mb-12 leading-[1.7]">
            From outfit inspiration to sold-out hat drops to Daily Show collabs —
            shop the things I actually use and love.
          </p>
          <a
            href="/shop"
            className="inline-block px-10 py-4 bg-gold text-white font-mono text-sm tracking-[3px] uppercase hover:bg-gold/90 transition-all rounded-full"
          >
            Shop Now
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
