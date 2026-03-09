"use client";

import { useRef, useEffect, useState } from "react";
import type { ItineraryDay, HotelSelection } from "@/lib/types";
import { CATEGORY_COLORS, MAP_STYLE, MAP_DEFAULTS } from "@/lib/mapStyle";

interface DayMapProps {
  day: ItineraryDay;
  hotel?: HotelSelection | null;
}

export default function DayMap({ day, hotel }: DayMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Collect geocoded points from items
  const points = day.items
    .map((item, i) => ({
      lng: item.lng,
      lat: item.lat,
      name: item.name,
      category: item.type.toLowerCase(),
      time: item.time,
      index: i,
    }))
    .filter(
      (p): p is typeof p & { lat: number; lng: number } =>
        p.lat != null && p.lng != null && isFinite(p.lat) && isFinite(p.lng)
    );

  useEffect(() => {
    if (!mapContainer.current || !token || points.length === 0) return;
    if (mapRef.current) return;

    let map: mapboxgl.Map | null = null;

    import("mapbox-gl").then((mapboxglModule) => {
      if (!mapContainer.current) return;

      const mb = mapboxglModule.default ?? mapboxglModule;
      mb.accessToken = token;

      map = new mb.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [points[0].lng, points[0].lat],
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

        // Venue markers
        for (const pt of points) {
          const color = CATEGORY_COLORS[pt.category] ?? "#B8937A";
          const el = createMarkerEl(String(pt.index + 1), color, false);
          new mb.Marker({ element: el })
            .setLngLat([pt.lng, pt.lat])
            .setPopup(
              new mb.Popup({ offset: 25, closeButton: false }).setHTML(
                `<div style="font-family:monospace;font-size:12px;padding:4px 8px"><strong>${pt.name}</strong><br/><span style="color:#7A6E66">${pt.time}</span></div>`
              )
            )
            .addTo(map);
        }

        // Route line
        if (points.length >= 2) {
          const coords: [number, number][] = [];
          if (hotel?.lat != null && hotel?.lng != null) {
            coords.push([hotel.lng, hotel.lat]);
          }
          for (const pt of points) {
            coords.push([pt.lng, pt.lat]);
          }

          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: coords },
            },
          });

          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#B8937A",
              "line-width": 2.5,
              "line-dasharray": [2, 2],
              "line-opacity": 0.7,
            },
          });
        }

        // Fit bounds
        const allCoords: [number, number][] = points.map((p) => [p.lng, p.lat]);
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
          map.fitBounds(bounds, { padding: MAP_DEFAULTS.fitBoundsPadding, maxZoom: 15 });
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
  }, [token, day.day]);

  if (!token || points.length === 0) {
    return null;
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border mb-2">
      <div ref={mapContainer} className="w-full h-64 md:h-80" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-light/80">
          <span className="text-xs font-mono text-muted">Loading map...</span>
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
