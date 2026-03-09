import Link from "next/link";

const cards = [
  {
    heading: "Your Trip, Curated",
    description:
      "Get a personalized day-by-day itinerary from Denna's tested picks.",
    cta: "Plan My Trip \u2192",
    href: "/concierge",
    external: false,
  },
  {
    heading: "Read the Guides",
    description:
      "Deep-dive city guides, hotel reviews, and the weekly Strict List.",
    cta: "Visit Substack \u2192",
    href: "https://strictlythegoodstuff.substack.com",
    external: true,
  },
  {
    heading: "Shop My Picks",
    description:
      "Outfit inspiration, collabs, and the things I'm obsessed with right now.",
    cta: "Shop Now \u2192",
    href: "/shop",
    external: false,
  },
];

export default function ThreeCards() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((card) => {
          const inner = (
            <div className="bg-light rounded-2xl p-8 border border-border hover:-translate-y-1 transition-transform duration-300 h-full flex flex-col">
              <h3 className="font-mono text-2xl text-brown mb-3">
                {card.heading}
              </h3>
              <p className="font-mono text-secondary text-sm leading-relaxed mb-6 flex-1">
                {card.description}
              </p>
              <span className="font-mono text-sm text-gold font-medium">
                {card.cta}
              </span>
            </div>
          );

          return card.external ? (
            <a
              key={card.heading}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {inner}
            </a>
          ) : (
            <Link key={card.heading} href={card.href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
