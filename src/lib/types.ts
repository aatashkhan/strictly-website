export interface VenueOpeningHours {
  periods: Array<{
    open: { day: number; time: string };
    close: { day: number; time: string };
  }>;
  weekday_text: string[];
}

export interface Venue {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  neighborhood: string | null;
  denna_note: string | null;
  price_indicator: string | null;
  best_for: string[];
  instagram: string | null;
  google_maps: string | null;
  website: string | null;
  sources: string[];
  source_posts: string[];
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  opening_hours: VenueOpeningHours | null;
  google_maps_url: string | null;
  geocode_status: 'verified' | 'unverified' | 'not_found';
  status?: 'open' | 'closed' | 'temporarily_closed';
  status_note?: string;
}

export interface CityData {
  city_name: string;
  country: string;
  region: string;
  venue_count: number;
  denna_intro: string;
  neighborhoods: string[];
  categories: Record<string, number>;
  venues: Venue[];
}

export interface VenueDB {
  metadata: {
    version: string;
    last_updated: string;
    total_venues: number;
    total_cities: number;
    sources: string[];
  };
  cities: Record<string, CityData>;
}

export interface FlightInfo {
  type: "flight" | "general" | "skip";
  flightNumber?: string;
  date: string;
  time?: string;
  airport?: string;
}

export interface HotelSelection {
  venueId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export type TransitMode = 'auto' | 'rideshare' | 'public_transit' | 'walking_preferred' | 'rental_car';

export interface TripFormData {
  city: string;
  duration: string;
  companions: string;
  vibes: string[];
  budget: string;
  pace: string;
  notes: string;
  email: string;
  arrival: FlightInfo | null;
  departure: FlightInfo | null;
  hotel: HotelSelection | null;
  transitPreference?: TransitMode;
}

export interface TravelSegment {
  distance: string;      // "1.2 km"
  duration: number;      // minutes
  mode: string;          // "walking" | "transit" | "driving"
  summary: string;       // "12 min walk" or "8 min drive"
}

export interface ItineraryWarning {
  type: 'closed' | 'hours_unknown' | 'venue_not_found';
  message: string;
}

export interface ItineraryItem {
  time: string;            // "9:00 AM" (specific times)
  endTime?: string;        // "10:30 AM"
  type: string;
  name: string;
  note: string;
  venueId?: string;        // matched venue from DB
  address?: string;
  lat?: number;
  lng?: number;
  duration?: number;       // minutes at this venue
  travelToNext?: TravelSegment | null;
  warnings?: ItineraryWarning[];
}

export interface ItineraryDay {
  day: number;
  title: string;
  items: ItineraryItem[];
}

export interface ItineraryData {
  intro: string;
  days: ItineraryDay[];
  signoff: string;
}
