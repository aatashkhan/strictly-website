/**
 * Category colors for map pins — matches the design system.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  eat: '#C4705A',
  drink: '#C4985A',
  stay: '#5A70C4',
  shop: '#C45AB4',
  explore: '#5AC470',
  spa: '#C4B45A',
};

/**
 * Day colors for the full-trip overview map.
 */
export const DAY_COLORS = [
  '#C4705A', // warm terracotta
  '#5A70C4', // slate blue
  '#5AC470', // sage green
  '#C45AB4', // plum
  '#C4985A', // amber
  '#C4B45A', // olive gold
  '#7A6E66', // warm grey
];

export function getDayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

/**
 * Mapbox style URL — light/minimal base that works with the cream brand.
 * "light-v11" is clean and neutral; we overlay our own markers/lines.
 */
export const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

/**
 * Default map settings
 */
export const MAP_DEFAULTS = {
  /** Padding around bounds fit in pixels */
  fitBoundsPadding: 50,
  /** Default zoom when only one point */
  singlePointZoom: 14,
};
