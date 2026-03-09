"use client";

import { useRef, useEffect, useState } from "react";
import type { ItineraryData, HotelSelection } from "@/lib/types";
import { CATEGORY_COLORS, MAP_STYLE, MAP_DEFAULTS, getDayColor } from "@/lib/mapStyle";

interface FullTripMapProps {
  data: ItineraryData;
  hotel?: HotelSelection | null;
}

interface AllPoint {
  lng: number;
  lat: number;
  name: string;
  category: string;
  time: string;
  dayNum: number;
  index: number;
}

export default function FullTripMap({ data, hotel }: FullTripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [visibleDays, setVisibleDays] = useState<Set<number>>(() => {
    return new Set(data.days.map((d) => d.day));
  });

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Collect all geocoded points
  const allPoints: AllPoint[] = [];
  for (const day of data.days) {
    for (let i = 0; i < day.items.length; i++) {
      const item = day.items[i];
      if (item.lat != null && item.lng != null && isFinite(item.lat) && isFinite(item.lng)) {
        allPoints.push({
          lng: item.lng,
          lat: item.lat,
          name: item.name,
          category: item.type.toLowerCase(),
          time: item.time,
          dayNum: day.day,
          index: i,
        });
      }
    }
  }

  const toggleDay = (dayNum: number) => {
    setVisibleDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum);
      else next.add(dayNum);
      return next;
    });
  };

  // Update visibility when toggling days
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    for (const day of data.days) {
      const visible = visibleDays.has(day.day);
      const routeId = `route-day-${day.day}`;
      if (map.getLayer(routeId)) {
        map.setLayoutProperty(routeId, "visibility", visible ? "visible" : "none");
      }
      const markers = document.querySelectorAll(`[data-day="${day.day}"]`);
      markers.forEach((el) => {
        (el as HTMLElement).style.display = visible ? "flex" : "none";
      });
    }
  }, [visibleDays, mapLoaded, data.days]);

  // Init map once
  useEffect(() => {
    if (!mapContainer.current || !token || allPoints.length === 0) return;
    if (mapRef.current) return;

    let map: mapboxgl.Map | null = null;

    import("mapbox-gl").then((mapboxglModule) => {
      if (!mapContainer.current) return;

      const mb = mapboxglModule.default ?? mapboxglModule;
      mb.accessToken = token;

      map = new mb.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [allPoints[0].lng, allPoints[0].lat],
        zoom: MAP_DEFAULTS.singlePointZoom,
        attributionControl: false,
      });

      map.addControl(new mb.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (!map) return;

        // Hotel marker
        if (hotel?.lat != null && hotel?.lng != null) {
          const hotelEl = createMarkerEl("H", "#5A70C4", true);
          new mb.Marker({ element: hotelEl })
            .setLngLat([hotel.lng, hotel.lat])
            .setPopup(
              new mb.Popup({ offset: 25, closeButton: false }).setHTML(
                `<div style="font-family:monospace;font-size:12px;padding:4px 8px"><strong>${hotel.name}</strong><br/><span style="color:#7A6E66">Your home base</span></div>`
              )
            )
            .addTo(map);
        }

        // Per-day routes and markers
        for (const day of data.days) {
          const dayColor = getDayColor(day.day - 1);
          const dayPoints = allPoints.filter((p) => p.dayNum === day.day);

          for (const pt of dayPoints) {
            const color = CATEGORY_COLORS[pt.category] ?? dayColor;
            const el = createMarkerEl(String(pt.index + 1), color, false);
            el.setAttribute("data-day", String(day.day));
            new mb.Marker({ element: el })
              .setLngLat([pt.lng, pt.lat])
              .setPopup(
                new mb.Popup({ offset: 25, closeButton: false }).setHTML(
                  `<div style="font-family:monospace;font-size:12px;padding:4px 8px"><strong>Day ${pt.dayNum}: ${pt.name}</strong><br/><span style="color:#7A6E66">${pt.time}</span></div>`
                )
              )
              .addTo(map);
          }

          if (dayPoints.length >= 2) {
            const coords: [number, number][] = dayPoints.map((p) => [p.lng, p.lat]);
            map.addSource(`route-day-${day.day}`, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: coords },
              },
            });
            map.addLayer({
              id: `route-day-${day.day}`,
              type: "line",
              source: `route-day-${day.day}`,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": dayColor,
                "line-width": 2.5,
                "line-dasharray": [2, 2],
                "line-opacity": 0.7,
              },
            });
          }
        }

        // Fit all points
        const allCoords: [number, number][] = allPoints.map((p) => [p.lng, p.lat]);
        if (hotel?.lat != null && hotel?.lng != null) {
          allCoords.push([hotel.lng, hotel.lat]);
        }
        if (allCoords.length >= 2) {
          const bounds = allCoords.reduce(
            (b, c) =>
              [
                [Math.min(b[0][0], c[0]), Math.min(b[0][1], c[1])],
                [Math.max(b[1][0], c[0]), Math.max(b[1][1], c[1])],
              ] as [[number, number], [number, number]],
            [
              [allCoords[0][0], allCoords[0][1]],
              [allCoords[0][0], allCoords[0][1]],
            ] as [[number, number], [number, number]]
          );
          map.fitBounds(bounds, { padding: MAP_DEFAULTS.fitBoundsPadding, maxZoom: 14 });
        }

        setMapLoaded(true);
      });

      mapRef.current = map;
    });

    return () => {
      if (map) {
        map.remove();
        map = null;
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token || allPoints.length === 0) return null;

  return (
    <div className="border border-border rounded-2xl overflow-hidden mb-8">
      <div className="relative">
        <div ref={mapContainer} className="w-full h-72 md:h-96" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-light/80">
            <span className="text-xs font-mono text-muted">Loading map...</span>
          </div>
        )}
      </div>

      {data.days.length > 1 && (
        <div className="flex flex-wrap gap-2 px-4 py-3 bg-light/50 border-t border-border">
          {data.days.map((day) => {
            const active = visibleDays.has(day.day);
            const color = getDayColor(day.day - 1);
            return (
              <button
                key={day.day}
                onClick={() => toggleDay(day.day)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                  active
                    ? "text-white shadow-sm"
                    : "text-muted bg-white border border-border hover:border-muted"
                }`}
                style={active ? { backgroundColor: color } : undefined}
              >
                Day {day.day}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function createMarkerEl(label: string, color: string, isHotel: boolean): HTMLDivElement {
  const el = document.createElement("div");
  const size = isHotel ? 32 : 26;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.backgroundColor = color;
  el.style.border = "2.5px solid white";
  el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.color = "white";
  el.style.fontSize = isHotel ? "13px" : "11px";
  el.style.fontWeight = "700";
  el.style.fontFamily = "monospace";
  el.style.cursor = "pointer";
  el.textContent = label;
  return el;
}
