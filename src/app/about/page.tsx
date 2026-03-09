import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <main>
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[4px] text-gold mb-6 font-mono">
            About
          </p>
          <h1 className="font-mono text-4xl md:text-6xl font-bold text-brown mb-8 leading-tight">
            The story behind strictly the good stuff
          </h1>
        </div>
      </section>

      {/* Photo + Bio */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-16 items-start">
          {/* Placeholder photo */}
          <div className="w-full md:w-80 h-96 bg-light border border-border rounded-sm flex-shrink-0" />

          <div className="flex-1">
            <h2 className="font-mono text-3xl font-bold text-brown mb-6">
              Hi, I&apos;m Denna.
            </h2>
            <div className="font-mono text-secondary leading-relaxed space-y-4">
              <p>
                I started Strictly the Good Stuff because I was tired of generic
                recommendations. Every time I traveled, I&apos;d spend hours digging
                through reviews, DMs, and blog posts trying to find the places that
                were actually worth it — not just the popular ones, but the ones that
                made you feel something.
              </p>
              <p>
                So I started keeping lists. Obsessively detailed, highly opinionated
                lists of every restaurant, hotel, coffee shop, and hidden gem I
                discovered. Then I started sharing them on Substack, and something
                clicked — 25,000+ subscribers later, Strictly the Good Stuff has
                become a trusted source for people who want curated, personal
                recommendations over algorithm-driven noise.
              </p>
              <p>
                My philosophy is simple: I only recommend places I&apos;ve personally
                been to, tested, and loved. No sponsored placements. No paid reviews.
                Just the good stuff — strictly.
              </p>
              <p>
                With Strictly Concierge, I&apos;m taking it a step further. Now you can
                tell me where you&apos;re going, what you love, and who you&apos;re
                traveling with — and I&apos;ll build you a personalized day-by-day
                itinerary from my tested picks. It&apos;s like having me in your pocket,
                planning your trip.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-mono text-3xl font-bold text-brown mb-12 text-center">
            The Strictly philosophy
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-mono text-xl text-brown mb-3">
                Curation over aggregation
              </h3>
              <p className="font-mono text-sm text-secondary leading-relaxed">
                I don&apos;t scrape the internet for reviews. Every single
                recommendation comes from personal experience. If I haven&apos;t been
                there, it&apos;s not on the list.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-xl text-brown mb-3">
                Taste over trends
              </h3>
              <p className="font-mono text-sm text-secondary leading-relaxed">
                I&apos;m not chasing what&apos;s viral. I&apos;m sharing what&apos;s
                genuinely good — the places I&apos;d send my best friend to without
                hesitation.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-xl text-brown mb-3">
                Honesty, always
              </h3>
              <p className="font-mono text-sm text-secondary leading-relaxed">
                If something isn&apos;t worth it, I&apos;ll tell you. If the line is
                long but the food is life-changing, I&apos;ll tell you that too. No
                fluff, no filler.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="font-mono text-4xl text-brown mb-2">28</p>
              <p className="font-mono text-sm text-muted uppercase tracking-wider">
                Cities covered
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl text-brown mb-2">1,500+</p>
              <p className="font-mono text-sm text-muted uppercase tracking-wider">
                Venues curated
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl text-brown mb-2">25K+</p>
              <p className="font-mono text-sm text-muted uppercase tracking-wider">
                Subscribers
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl text-brown mb-2">117</p>
              <p className="font-mono text-sm text-muted uppercase tracking-wider">
                Guides published
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-mono text-3xl font-bold text-brown mb-4">
            Ready to explore?
          </h2>
          <p className="font-mono text-secondary mb-8">
            Let me plan your next trip. Tell me where you&apos;re going and
            I&apos;ll build you the perfect itinerary.
          </p>
          <a
            href="/concierge"
            className="inline-block px-10 py-4 bg-gold text-white font-mono text-sm tracking-[3px] uppercase hover:bg-gold/90 transition-all rounded-full"
          >
            Try Concierge
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
