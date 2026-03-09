import venueData from "@/data/venues.json";
import { FEATURED_CITIES } from "./constants";
import type { VenueDB, CityData } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = venueData as any as VenueDB;

export function getVenueDB(): VenueDB {
  return db;
}

export function getCities(): string[] {
  return Object.keys(db.cities).sort();
}

export function getCityData(city: string): CityData | null {
  return db.cities[city] ?? null;
}

export function getFeaturedCities(): { name: string; data: CityData }[] {
  return FEATURED_CITIES.map((name) => ({
    name,
    data: getCityData(name)!,
  })).filter((entry) => entry.data !== null);
}
