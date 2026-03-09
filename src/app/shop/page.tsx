import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const SHOP_CATEGORIES = [
  {
    title: "Outfit Picks",
    description:
      "My go-to outfits, travel fits, and the pieces I reach for again and again.",
    items: [
      { name: "Travel Essentials Edit", tag: "Coming Soon" },
      { name: "Date Night Looks", tag: "Coming Soon" },
      { name: "Euro Summer Capsule", tag: "Coming Soon" },
    ],
  },
  {
    title: "Strictly Collabs",
    description:
      "Limited-edition pieces and collaborations with brands I love.",
    items: [
      { name: "The Strictly Hat", tag: "Sold Out" },
      { name: "Daily Show x Strictly", tag: "In Stock" },
    ],
  },
  {
    title: "Denna's Favorites",
    description:
      "The products I'm genuinely obsessed with — beauty, home, travel gear, and more.",
    items: [
      { name: "Beauty Strict List", tag: "Coming Soon" },
      { name: "Travel Gear Picks", tag: "Coming Soon" },
      { name: "Home & Hosting", tag: "Coming Soon" },
    ],
  },
];

export default function ShopPage() {
  return (
    <main>
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[4px] text-gold mb-6 font-mono">
            The Shop
          </p>
          <h1 className="font-mono text-4xl md:text-6xl font-bold text-brown mb-6 leading-tight">
            Strictly the good stuff
          </h1>
          <p className="font-mono text-secondary max-w-lg mx-auto">
            Curated picks, outfit inspiration, limited collabs, and the things
            I actually use and love. Affiliate links throughout — thank you for
            supporting Strictly!
          </p>
        </div>
      </section>

      {/* Categories */}
      {SHOP_CATEGORIES.map((category, ci) => (
        <section
          key={ci}
          className="py-16 px-6 border-t border-border"
        >
          <div className="max-w-5xl mx-auto">
            <h2 className="font-mono text-2xl md:text-3xl font-bold text-brown mb-2">
              {category.title}
            </h2>
            <p className="font-mono text-sm text-secondary mb-10">
              {category.description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.items.map((item, ii) => (
                <div
                  key={ii}
                  className="group border border-border rounded-sm overflow-hidden hover:-translate-y-1 transition-transform duration-300"
                >
                  {/* Placeholder image */}
                  <div className="h-64 bg-light" />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-mono text-lg text-brown">
                        {item.name}
                      </h3>
                      <span
                        className={`text-xs font-mono tracking-wider uppercase px-2 py-1 rounded-sm ${
                          item.tag === "Sold Out"
                            ? "bg-gold/10 text-gold"
                            : item.tag === "In Stock"
                            ? "bg-explore/10 text-explore"
                            : "bg-light text-muted"
                        }`}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <a
                      href="#"
                      className="font-mono text-sm text-gold hover:text-brown transition-colors"
                    >
                      {item.tag === "Sold Out"
                        ? "Join Waitlist →"
                        : item.tag === "In Stock"
                        ? "Shop Now →"
                        : "Notify Me →"}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-mono text-2xl font-bold text-brown mb-4">
            More good stuff coming soon
          </h2>
          <p className="font-mono text-sm text-secondary mb-8">
            The shop is growing! Sign up to be the first to know about new
            drops, collabs, and curated collections.
          </p>
          <a
            href="https://strictlythegoodstuff.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-4 bg-gold text-white font-mono text-sm tracking-[3px] uppercase hover:bg-gold/90 transition-all rounded-full"
          >
            Subscribe for Updates
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
