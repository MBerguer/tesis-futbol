"use client";
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { PositionPoint } from "../hooks/usePositionsWindow";
import { stringToColorPair } from "../utils/colors";

interface PitchMapProps {
  points: PositionPoint[];
  styleUrl?: string;
  styleObj?: any;
  pinned?: Record<string, boolean>;
  onToggle?: (name: string) => void;
  heightClass?: string; // Tailwind class to control container height
  heightStyle?: React.CSSProperties; // Inline style for precise calc heights
  bearing?: number; // map rotation in degrees
  centerLatitude?: number; // initial/controlled center latitude
  centerLongitude?: number; // initial/controlled center longitude
  traceLines?: Array<Array<{ lat: number; lon: number }>>;
  traceColor?: string;
  traceLines2?: Array<Array<{ lat: number; lon: number }>>;
  traceColor2?: string;
  traceLines3?: Array<Array<{ lat: number; lon: number }>>;
  traceColor3?: string;
  // Zoom controls
  limitZoom?: boolean; // when true, restrict zoom around initialZoom
  initialZoom?: number; // default zoom level used when limiting is enabled
  fullZoomMin?: number; // min zoom when limiting is disabled
  fullZoomMax?: number; // max zoom when limiting is disabled
}

export default function PitchMap({
  points,
  styleUrl,
  styleObj,
  pinned,
  onToggle,
  heightClass,
  heightStyle,
  bearing,
  centerLatitude,
  centerLongitude,
  traceLines,
  traceColor,
  traceLines2,
  traceColor2,
  traceLines3,
  traceColor3,
  limitZoom = true,
  initialZoom = 18.5,
  fullZoomMin = 0,
  fullZoomMax = 22,
}: PitchMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<
    Map<string, { marker: maplibregl.Marker; popup: maplibregl.Popup }>
  >(new Map());

  const buildPopupHTML = (name: string, speed?: number) =>
    `<div style="background:rgba(24,24,27,0.96);color:#e4e4e7;border:1px solid #27272a;padding:4px 8px;border-radius:8px;white-space:nowrap;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.35)">` +
    `${name}${
      typeof speed === "number" && isFinite(speed)
        ? ` — ${speed.toFixed(1)} km/h`
        : ""
    }` +
    `</div>`;

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style:
          styleObj ||
          styleUrl ||
          `https://api.maptiler.com/maps/streets/style.json?key=${
            process.env.NEXT_PUBLIC_MAPTILER_KEY || ""
          }`,
        center: [
          typeof centerLongitude === "number" && isFinite(centerLongitude)
            ? centerLongitude
            : -56.14786,
          typeof centerLatitude === "number" && isFinite(centerLatitude)
            ? centerLatitude
            : -34.795334,
        ],
        zoom: initialZoom,
        minZoom: limitZoom ? Math.max(0, initialZoom - 0.5) : fullZoomMin,
        maxZoom: limitZoom ? initialZoom + 0.5 : fullZoomMax,
        interactive: true,
      });
    }
    return () => {
      markersRef.current.forEach(({ marker, popup }) => {
        try {
          popup.remove();
        } catch {}
        marker.remove();
      });
      markersRef.current = new Map();
    };
  }, [styleUrl, styleObj, initialZoom, limitZoom, fullZoomMin, fullZoomMax]);

  // Ensure map resizes when container size/layout changes
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    // immediate resize after layout change and reattach to ensure correct size
    try {
      map.resize();
      // Workaround: briefly set a timeout to resize again after DOM paints
      setTimeout(() => {
        try {
          map.resize();
        } catch {}
      }, 0);
    } catch {}
    // observe future resizes
    const ro = new ResizeObserver(() => {
      try {
        map.resize();
      } catch {}
    });
    ro.observe(el);
    return () => {
      try {
        ro.disconnect();
      } catch {}
    };
  }, [heightClass, heightStyle]);

  // Apply bearing changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (typeof bearing === "number" && isFinite(bearing)) {
      try {
        map.setBearing(bearing);
      } catch {}
    }
  }, [bearing]);

  // Apply zoom limit/full-zoom toggles and reset zoom when limiting is re-enabled
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (limitZoom) {
        map.setMinZoom(Math.max(0, initialZoom - 0.5));
        map.setMaxZoom(initialZoom + 0.5);
        // reset to default zoom when limiting is enabled again
        map.setZoom(initialZoom);
      } else {
        map.setMinZoom(fullZoomMin);
        map.setMaxZoom(fullZoomMax);
      }
    } catch {}
  }, [limitZoom, initialZoom, fullZoomMin, fullZoomMax]);

  // Apply center changes when venue coordinates update
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (
      typeof centerLatitude === "number" &&
      isFinite(centerLatitude) &&
      typeof centerLongitude === "number" &&
      isFinite(centerLongitude)
    ) {
      try {
        map.setCenter([centerLongitude, centerLatitude]);
      } catch {}
    }
  }, [centerLatitude, centerLongitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const present = new Set<string>();

    for (const p of points) {
      const name = p.player_display_name || "";
      present.add(name);
      let rec = markersRef.current.get(name);
      const { base, border } = stringToColorPair(name);

      if (!rec) {
        const el = document.createElement("div");
        el.className = "rounded-full";
        el.style.width = "10px";
        el.style.height = "10px";
        el.style.background = base;
        el.style.border = `2px solid ${border}`;
        el.style.boxShadow =
          "0 0 0 2px rgba(0,0,0,0.35), 0 0 6px rgba(255,255,255,0.5)";
        el.style.cursor = "pointer";

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lon, p.lat])
          .addTo(map);
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, 14],
          anchor: "top",
          className: "no-chrome",
        }).setHTML(
          buildPopupHTML(name, (p as any).speed as number | undefined)
        );

        rec = { marker, popup };
        markersRef.current.set(name, rec);

        const show = () => {
          const ll = rec!.marker.getLngLat();
          rec!.popup.setLngLat([ll.lng, ll.lat]).addTo(map);
        };
        const hide = () => {
          if (!pinned || !pinned[name]) {
            try {
              rec!.popup.remove();
            } catch {}
          }
        };

        const ring = border.startsWith("hsl(")
          ? border.replace("hsl(", "hsla(").replace(")", ", 0.35)")
          : border;
        const baseShadow = "0 0 0 2px rgba(0,0,0,0.15)";
        el.addEventListener("mouseenter", () => {
          el.style.boxShadow = `${baseShadow}, 0 0 0 6px ${ring}`;
          show();
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = baseShadow;
          hide();
        });
        el.addEventListener("click", () => {
          onToggle && onToggle(name);
        });

        if (pinned && pinned[name]) show();
      }

      // update position for current snapshot
      rec.marker.setLngLat([p.lon, p.lat]);
      // update popup content with latest speed
      try {
        rec.popup.setHTML(
          buildPopupHTML(name, (p as any).speed as number | undefined)
        );
      } catch {}
      if (pinned && pinned[name]) rec.popup.setLngLat([p.lon, p.lat]);
    }

    // Remove markers not present
    for (const [name, rec] of Array.from(markersRef.current.entries())) {
      if (!present.has(name)) {
        try {
          rec.popup.remove();
        } catch {}
        rec.marker.remove();
        markersRef.current.delete(name);
      }
    }
  }, [points]);

  // Reflect external pinned changes on already-created markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pinned) return;
    Array.from(markersRef.current.entries()).forEach(([name, rec]) => {
      if (pinned[name]) {
        const ll = rec.marker.getLngLat();
        rec.popup.setLngLat([ll.lng, ll.lat]).addTo(map);
      } else {
        try {
          rec.popup.remove();
        } catch {}
      }
    });
  }, [pinned]);

  // Draw or clear polyline trace(s)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const srcId = "trace-line-src";
    const layerId = "trace-line-lyr";
    try {
      // Ensure prior layer/source removed if no data
      if (!traceLines || traceLines.length === 0) {
        if (map.getLayer(layerId)) {
          try {
            map.removeLayer(layerId);
          } catch {}
        }
        if (map.getSource(srcId)) {
          try {
            (map.getSource(srcId) as any).setData({
              type: "FeatureCollection",
              features: [],
            });
            map.removeSource(srcId);
          } catch {}
        }
        return;
      }
      const features = traceLines.map((line) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: line.map((p) => [p.lon, p.lat]),
        },
        properties: {},
      }));
      const collection = { type: "FeatureCollection", features } as any;
      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: "geojson", data: collection });
      } else {
        (map.getSource(srcId) as any).setData(collection);
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: srcId,
          paint: {
            "line-color": traceColor || "#22c55e",
            "line-width": 3,
            "line-opacity": 0.9,
          },
        });
      }
    } catch {}
  }, [traceLines, traceColor]);

  // Draw or clear second polyline trace(s)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const srcId = "trace-line-src-2";
    const layerId = "trace-line-lyr-2";
    try {
      // Ensure prior layer/source removed if no data
      if (!traceLines2 || traceLines2.length === 0) {
        if (map.getLayer(layerId)) {
          try {
            map.removeLayer(layerId);
          } catch {}
        }
        if (map.getSource(srcId)) {
          try {
            (map.getSource(srcId) as any).setData({
              type: "FeatureCollection",
              features: [],
            });
            map.removeSource(srcId);
          } catch {}
        }
        return;
      }
      const features = traceLines2.map((line) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: line.map((p) => [p.lon, p.lat]),
        },
        properties: {},
      }));
      const collection = { type: "FeatureCollection", features } as any;
      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: "geojson", data: collection });
      } else {
        (map.getSource(srcId) as any).setData(collection);
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: srcId,
          paint: {
            "line-color": traceColor2 || "#3b82f6",
            "line-width": 3,
            "line-opacity": 0.9,
          },
        });
      }
    } catch {}
  }, [traceLines2, traceColor2]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const srcId = "trace-line-src-3";
    const layerId = "trace-line-lyr-3";
    try {
      if (!traceLines3 || traceLines3.length === 0) {
        if (map.getLayer(layerId)) {
          try {
            map.removeLayer(layerId);
          } catch {}
        }
        if (map.getSource(srcId)) {
          try {
            (map.getSource(srcId) as any).setData({
              type: "FeatureCollection",
              features: [],
            });
            map.removeSource(srcId);
          } catch {}
        }
        return;
      }
      const features = traceLines3.map((line) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: line.map((p) => [p.lon, p.lat]),
        },
        properties: {},
      }));
      const collection = { type: "FeatureCollection", features } as any;
      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: "geojson", data: collection });
      } else {
        (map.getSource(srcId) as any).setData(collection);
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: srcId,
          paint: {
            "line-color": traceColor3 || "#ffffff",
            "line-width": 3,
            "line-opacity": 0.9,
          },
        });
      }
    } catch {}
  }, [traceLines3, traceColor3]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass || "h-full"}`}
      style={{ minHeight: "420px", ...(heightStyle || {}) }}
    />
  );
}
