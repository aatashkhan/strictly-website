import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ThreeCards from "@/components/ThreeCards";
import CityGrid from "@/components/CityGrid";
import Footer from "@/components/Footer";
import { getSiteContent, parseList } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [hero, homepage, footer] = await Promise.all([
    getSiteContent("hero"),
    getSiteContent("homepage"),
    getSiteContent("footer"),
  ]);

  // Build cards array from homepage content
  const cards = [1, 2, 3].map((n) => {
    const isExternal = (homepage[`card_${n}_url`] ?? "").startsWith("http");
    return {
      heading: homepage[`card_${n}_heading`] ?? "",
      description: homepage[`card_${n}_description`] ?? "",
      cta: homepage[`card_${n}_cta`] ?? "",
      href: homepage[`card_${n}_url`] ?? "/",
      external: isExternal,
    };
  });

  const scrollingCities = hero.scrolling_cities
    ? parseList(hero.scrolling_cities)
    : undefined;

  return (
    <main>
      <Nav />
      <Hero
        headline={hero.headline}
        subtitle={hero.subtitle}
        ctaText={hero.cta_text}
        scrollingCities={scrollingCities}
      />
      <ThreeCards cards={cards} />
      <CityGrid />

      {/* Denna Intro Section */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-14">
          <div className="w-48 h-48 rounded-full bg-light border border-border flex-shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-[5px] text-gold mb-6 font-mono">
              {homepage.bio_label || "Who is Strictly?"}
            </p>
            <h2 className="font-mono text-3xl md:text-4xl font-bold text-brown mb-8">
              {homepage.bio_heading || "Hi, I\u2019m Denna."}
            </h2>
            <p className="font-mono text-secondary leading-[1.8] mb-6">
              {homepage.bio_text ||
                "I\u2019m a travel and lifestyle curator on a permanent mission to find the good stuff \u2014 the restaurants worth the wait, the hotels that get every detail right, the hidden shops that make a city feel like yours. I share it all on my Substack (25K+ subscribers and counting!) and now, through Strictly Concierge, I can plan your trip for you."}
            </p>
            <a
              href="/about"
              className="inline-block font-mono text-sm tracking-wider text-gold hover:text-brown transition-colors"
            >
              {homepage.bio_link_text || "Read more about Strictly \u2192"}
            </a>
          </div>
        </div>
      </section>

      {/* Shop Highlight */}
      <section className="py-28 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[5px] text-gold mb-6 font-mono">
            {homepage.shop_label || "The Shop"}
          </p>
          <h2 className="font-mono text-3xl md:text-4xl font-bold text-brown mb-8 leading-snug">
            {homepage.shop_heading ||
              "Curated picks, collabs & the things I\u2019m obsessed with"}
          </h2>
          <p className="font-mono text-secondary max-w-lg mx-auto mb-12 leading-[1.7]">
            {homepage.shop_description ||
              "From outfit inspiration to sold-out hat drops to Daily Show collabs \u2014 shop the things I actually use and love."}
          </p>
          <a
            href="/shop"
            className="inline-block px-10 py-4 bg-gold text-white font-mono text-sm tracking-[3px] uppercase hover:bg-gold/90 transition-all rounded-full"
          >
            {homepage.shop_cta || "Shop Now"}
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
