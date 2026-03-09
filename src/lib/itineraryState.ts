import { useReducer, useCallback } from "react";
import type { ItineraryData, ItineraryItem, Venue } from "./types";
import { enrichItinerary, haversineKm } from "./routing";

// --- Types ---

export interface ItineraryState {
  current: ItineraryData;
  original: ItineraryData;
  history: ItineraryData[];      // past states for undo
  future: ItineraryData[];       // undone states for redo
  venues: Venue[];               // city venue DB for re-enrichment
  tripStartDate?: string;
}

type ItineraryAction =
  | { type: "SWAP_VENUE"; dayIndex: number; itemIndex: number; newVenue: Venue; newNote?: string }
  | { type: "UPDATE_FROM_CHAT"; itinerary: ItineraryData }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET" };

// --- Reducer ---

function reEnrich(
  data: ItineraryData,
  venues: Venue[],
  tripStartDate?: string
): ItineraryData {
  return {
    ...data,
    days: enrichItinerary(data.days, venues, tripStartDate),
  };
}

function itineraryReducer(
  state: ItineraryState,
  action: ItineraryAction
): ItineraryState {
  switch (action.type) {
    case "SWAP_VENUE": {
      const { dayIndex, itemIndex, newVenue, newNote } = action;
      const newDays = state.current.days.map((day, di) => {
        if (di !== dayIndex) return day;
        const newItems = day.items.map((item, ii) => {
          if (ii !== itemIndex) return item;
          return {
            ...item,
            name: newVenue.name,
            type: newVenue.category,
            note: newNote ?? newVenue.denna_note ?? item.note,
            venueId: newVenue.id,
            address: newVenue.address ?? undefined,
            lat: newVenue.lat ?? undefined,
            lng: newVenue.lng ?? undefined,
            warnings: [],
          };
        });
        return { ...day, items: newItems };
      });

      const updated = reEnrich(
        { ...state.current, days: newDays },
        state.venues,
        state.tripStartDate
      );

      return {
        ...state,
        current: updated,
        history: [...state.history, state.current],
        future: [],
      };
    }

    case "UPDATE_FROM_CHAT": {
      const updated = reEnrich(action.itinerary, state.venues, state.tripStartDate);
      return {
        ...state,
        current: updated,
        history: [...state.history, state.current],
        future: [],
      };
    }

    case "UNDO": {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return {
        ...state,
        current: previous,
        history: state.history.slice(0, -1),
        future: [state.current, ...state.future],
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        current: next,
        history: [...state.history, state.current],
        future: state.future.slice(1),
      };
    }

    case "RESET": {
      return {
        ...state,
        current: state.original,
        history: [],
        future: [],
      };
    }

    default:
      return state;
  }
}

// --- Hook ---

export function useItineraryState(
  initialData: ItineraryData,
  venues: Venue[],
  tripStartDate?: string
) {
  const [state, dispatch] = useReducer(itineraryReducer, {
    current: initialData,
    original: initialData,
    history: [],
    future: [],
    venues,
    tripStartDate,
  });

  const swapVenue = useCallback(
    (dayIndex: number, itemIndex: number, newVenue: Venue, newNote?: string) => {
      dispatch({ type: "SWAP_VENUE", dayIndex, itemIndex, newVenue, newNote });
    },
    []
  );

  const updateFromChat = useCallback((itinerary: ItineraryData) => {
    dispatch({ type: "UPDATE_FROM_CHAT", itinerary });
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    itinerary: state.current,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
    swapVenue,
    updateFromChat,
    undo,
    redo,
    reset,
  };
}

// --- Swap Alternatives Helper ---

export function findAlternatives(
  item: ItineraryItem,
  allVenues: Venue[],
  usedVenueIds: Set<string>,
  maxResults = 8
): Venue[] {
  const candidates = allVenues.filter((v) => {
    if (v.id === item.venueId) return false;
    if (usedVenueIds.has(v.id)) return false;
    if (v.category !== item.type) return false;
    if (!v.lat || !v.lng) return false;
    return true;
  });

  if (!item.lat || !item.lng) {
    return candidates.slice(0, maxResults);
  }

  // Sort by proximity — same neighborhood gets a boost
  const itemLat = item.lat;
  const itemLng = item.lng;
  const matchedVenue = allVenues.find((v) => v.id === item.venueId);
  const itemNeighborhood = matchedVenue?.neighborhood;

  candidates.sort((a, b) => {
    const aBoost = a.neighborhood === itemNeighborhood ? 0 : 5;
    const bBoost = b.neighborhood === itemNeighborhood ? 0 : 5;
    const aDist = haversineKm(itemLat, itemLng, a.lat!, a.lng!) + aBoost;
    const bDist = haversineKm(itemLat, itemLng, b.lat!, b.lng!) + bBoost;
    return aDist - bDist;
  });

  return candidates.slice(0, maxResults);
}

/** Collect all used venue IDs across an itinerary */
export function getUsedVenueIds(data: ItineraryData): Set<string> {
  const ids = new Set<string>();
  for (const day of data.days) {
    for (const item of day.items) {
      if (item.venueId) ids.add(item.venueId);
    }
  }
  return ids;
}
