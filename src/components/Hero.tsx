import Link from "next/link";

interface HeroProps {
  headline?: string;
  subtitle?: string;
  ctaText?: string;
  scrollingCities?: string[];
}

const defaultCities = [
  "Paris",
  "Rome",
  "Tokyo",
  "London",
  "Seoul",
  "Copenhagen",
  "Los Angeles",
  "New York City",
  "Barcelona",
  "Lisbon",
  "Tulum",
  "Amalfi",
];

export default function Hero({
  headline = "Your next favorite place is waiting.",
  subtitle = "Curated city guides, restaurant picks, and travel itineraries — all personally tested and approved.",
  ctaText = "Plan My Trip →",
  scrollingCities,
}: HeroProps) {
  const cities = scrollingCities ?? defaultCities;

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 relative overflow-hidden">
      <div className="max-w-3xl text-center">
        {/* Small caps label */}
        <p className="uppercase text-gold text-xs tracking-[0.4em] font-mono mb-8">
          Strictly the Good Stuff
        </p>

        {/* Main heading */}
        <h1 className="font-mono font-bold text-5xl md:text-7xl text-brown leading-[1.1] mb-8">
          {headline}
        </h1>

        {/* Subtitle */}
        <p className="text-secondary font-mono text-lg max-w-lg mx-auto mb-12 leading-[1.7]">
          {subtitle}
        </p>

        {/* CTA */}
        <Link
          href="/concierge"
          className="inline-block px-10 py-4 bg-gold text-white font-mono text-sm tracking-wide rounded-full hover:bg-gold/90 transition-colors"
        >
          {ctaText}
        </Link>
      </div>

      {/* Scrolling city names */}
      <div className="absolute bottom-12 left-0 right-0 overflow-hidden">
        <div className="flex animate-scroll whitespace-nowrap">
          {[...cities, ...cities].map((city, i) => (
            <span
              key={i}
              className="font-mono text-gold/30 text-2xl mx-8"
            >
              {city}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
