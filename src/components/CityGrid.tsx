import Link from "next/link";
import { FEATURED_CITIES } from "@/lib/constants";
import { getCityData } from "@/lib/venues";

export default async function CityGrid() {
  const cities = await Promise.all(
    FEATURED_CITIES.map(async (name) => {
      const data = await getCityData(name);
      return {
        name,
        venueCount: data?.venue_count ?? 0,
      };
    })
  );

  return (
    <section className="max-w-6xl mx-auto px-6 py-28">
      <h2 className="font-mono text-4xl text-brown text-center mb-14">
        Explore by City
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cities.map((city) => (
          <Link
            key={city.name}
            href={`/concierge?city=${encodeURIComponent(city.name)}`}
            className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-light border border-border"
          >
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition-colors" />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-end p-5">
              <h3 className="font-mono text-2xl text-brown mb-1">
                {city.name}
              </h3>
              <span className="text-muted text-xs font-mono">
                {city.venueCount} curated spots
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
