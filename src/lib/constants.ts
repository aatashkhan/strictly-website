export const CATEGORY_CONFIG: Record<
  string,
  { bg: string; border: string; label: string; text: string }
> = {
  eat: {
    bg: "bg-eat/10",
    border: "border-eat/30",
    label: "EAT",
    text: "text-eat",
  },
  drink: {
    bg: "bg-drink/10",
    border: "border-drink/30",
    label: "DRINK",
    text: "text-drink",
  },
  stay: {
    bg: "bg-stay/10",
    border: "border-stay/30",
    label: "STAY",
    text: "text-stay",
  },
  shop: {
    bg: "bg-shop/10",
    border: "border-shop/30",
    label: "SHOP",
    text: "text-shop",
  },
  explore: {
    bg: "bg-explore/10",
    border: "border-explore/30",
    label: "SEE",
    text: "text-explore",
  },
  spa: {
    bg: "bg-spa/10",
    border: "border-spa/30",
    label: "SPA",
    text: "text-spa",
  },
};

export const VIBES = [
  { label: "Foodie", emoji: "\u{1F35D}" },
  { label: "Culture", emoji: "\u{1F3A8}" },
  { label: "Shopping", emoji: "\u{1F6CD}" },
  { label: "Romance", emoji: "\u{1F48B}" },
  { label: "Relaxation", emoji: "\u{1F9D6}\u200D\u2640\uFE0F" },
  { label: "Adventure", emoji: "\u{1F3D4}" },
];

export const COMPANIONS = [
  "Solo",
  "Partner",
  "Best friend(s)",
  "Family",
  "Girls trip",
  "Group",
];

export const BUDGETS = ["Smart splurge", "Treat yourself", "All out"];

export const PACES = [
  { value: "leisurely", label: "Leisurely", desc: "Fewer stops, more breathing room" },
  { value: "balanced", label: "Balanced", desc: "A good mix of plans and downtime" },
  { value: "packed", label: "Go Go Go", desc: "Jam-packed, hit everything" },
];

export const TRANSIT_MODES = [
  { value: "rideshare", label: "Rideshare", icon: "\u{1F697}", desc: "Uber/Lyft everywhere" },
  { value: "public_transit", label: "Transit", icon: "\u{1F687}", desc: "Subway, bus, tram" },
  { value: "walking_preferred", label: "Walking", icon: "\u{1F6B6}", desc: "Walk when possible, rideshare when far" },
  { value: "rental_car", label: "Rental Car", icon: "\u{1F17F}\uFE0F", desc: "You have your own wheels" },
] as const;

export const FEATURED_CITIES = [
  "Paris",
  "Rome",
  "Tokyo",
  "London",
  "Seoul",
  "Copenhagen",
  "Los Angeles",
  "New York City",
];
