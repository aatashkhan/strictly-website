import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [about, footer] = await Promise.all([
    getSiteContent("about"),
    getSiteContent("footer"),
  ]);

  const philosophyCards = [1, 2, 3].map((n) => ({
    title: about[`philosophy_${n}_title`] ?? "",
    text: about[`philosophy_${n}_text`] ?? "",
  }));

  // Fallback defaults for bio paragraphs
  const bioParagraphs = [
    about.bio_paragraph_1 ||
      "I started Strictly the Good Stuff because I was tired of generic recommendations. Every time I traveled, I\u2019d spend hours digging through reviews, DMs, and blog posts trying to find the places that were actually worth it \u2014 not just the popular ones, but the ones that made you feel something.",
    about.bio_paragraph_2 ||
      "So I started keeping lists. Obsessively detailed, highly opinionated lists of every restaurant, hotel, coffee shop, and hidden gem I discovered. Then I started sharing them on Substack, and something clicked \u2014 25,000+ subscribers later, Strictly the Good Stuff has become a trusted source for people who want curated, personal recommendations over algorithm-driven noise.",
    about.bio_paragraph_3 ||
      "My philosophy is simple: I only recommend places I\u2019ve personally been to, tested, and loved. No sponsored placements. No paid reviews. Just the good stuff \u2014 strictly.",
    about.bio_paragraph_4 ||
      "With Strictly Concierge, I\u2019m taking it a step further. Now you can tell me where you\u2019re going, what you love, and who you\u2019re traveling with \u2014 and I\u2019ll build you a personalized day-by-day itinerary from my tested picks. It\u2019s like having me in your pocket, planning your trip.",
  ];

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
              {bioParagraphs.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
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
            {philosophyCards.map((card, i) => (
              <div key={i}>
                <h3 className="font-mono text-xl text-brown mb-3">
                  {card.title}
                </h3>
                <p className="font-mono text-sm text-secondary leading-relaxed">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="font-mono text-4xl text-brown mb-2">
                {about.stat_cities || "28"}
              </p>
              <p className="font-mono text-sm text-muted uppercase tracking-wider">
                Cities covered
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl text-brown mb-2">
                {about.stat_venues || "1,500+"}
              </p>
              <p className="font-mono text-sm text-muted uppercase tracking-wider">
                Venues curated
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl text-brown mb-2">
                {about.stat_subscribers || "25K+"}
              </p>
              <p className="font-mono text-sm text-muted uppercase tracking-wider">
                Subscribers
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl text-brown mb-2">
                {about.stat_guides || "117"}
              </p>
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

      <Footer
        signupHeading={footer.signup_heading}
        contactEmail={footer.contact_email}
        instagramUrl={footer.instagram_url}
        tiktokUrl={footer.tiktok_url}
        pinterestUrl={footer.pinterest_url}
      />
    </main>
  );
}
