"use client";
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { PositionPoint } from "../hooks/usePositionsWindow";
import { stringToColorPair } from "../utils/colors";

interface PitchMapProps {
  points: PositionPoint[];
  styleUrl?: string;
  pinned?: Record<string, boolean>;
  onToggle?: (name: string) => void;
  heightClass?: string; // Tailwind class to control container height
  heightStyle?: React.CSSProperties; // Inline style for precise calc heights
  bearing?: number; // map rotation in degrees
}

export default function PitchMap({ points, styleUrl, pinned, onToggle, heightClass, heightStyle, bearing }: PitchMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; popup: maplibregl.Popup }>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl || `https://api.maptiler.com/maps/streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY || ''}`,
        center: [-56.147974, -34.795334],
        zoom: 17,
        interactive: true,
      });
    }
    return () => {
      markersRef.current.forEach(({ marker, popup }) => { try { popup.remove(); } catch {} marker.remove(); });
      markersRef.current = new Map();
    };
  }, [styleUrl]);

  // Ensure map resizes when container size/layout changes
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    // immediate resize after layout change and reattach to ensure correct size
    try {
      map.resize();
      // Workaround: briefly set a timeout to resize again after DOM paints
      setTimeout(() => { try { map.resize(); } catch {} }, 0);
    } catch {}
    // observe future resizes
    const ro = new ResizeObserver(() => {
      try { map.resize(); } catch {}
    });
    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, [heightClass, heightStyle]);

  // Apply bearing changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (typeof bearing === 'number' && isFinite(bearing)) {
      try { map.setBearing(bearing); } catch {}
    }
  }, [bearing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const present = new Set<string>();

    for (const p of points) {
      const name = p.player_display_name || '';
      present.add(name);
      let rec = markersRef.current.get(name);
      const { base, border } = stringToColorPair(name);

      if (!rec) {
        const el = document.createElement('div');
        el.className = 'rounded-full';
        el.style.width = '10px';
        el.style.height = '10px';
        el.style.background = base;
        el.style.border = `2px solid ${border}`;
        el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.15)';
        el.style.cursor = 'pointer';

        const marker = new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(map);
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: [0, 14], anchor: 'top', className: 'no-chrome' })
          .setHTML(`<div style="background:#fff;border:1px solid ${border};padding:2px 6px;border-radius:6px;white-space:nowrap;font-size:12px;">${name}</div>`);

        rec = { marker, popup };
        markersRef.current.set(name, rec);

        const show = () => {
          const ll = rec!.marker.getLngLat();
          rec!.popup.setLngLat([ll.lng, ll.lat]).addTo(map);
        };
        const hide = () => { if (!pinned || !pinned[name]) { try { rec!.popup.remove(); } catch {} } };

        const ring = border.startsWith('hsl(') ? border.replace('hsl(', 'hsla(').replace(')', ', 0.35)') : border;
        const baseShadow = '0 0 0 2px rgba(0,0,0,0.15)';
        el.addEventListener('mouseenter', () => { el.style.boxShadow = `${baseShadow}, 0 0 0 6px ${ring}`; show(); });
        el.addEventListener('mouseleave', () => { el.style.boxShadow = baseShadow; hide(); });
        el.addEventListener('click', () => { onToggle && onToggle(name); });

        if (pinned && pinned[name]) show();
      }

      // update position for current snapshot
      rec.marker.setLngLat([p.lon, p.lat]);
      if (pinned && pinned[name]) rec.popup.setLngLat([p.lon, p.lat]);
    }

    // Remove markers not present
    for (const [name, rec] of Array.from(markersRef.current.entries())) {
      if (!present.has(name)) {
        try { rec.popup.remove(); } catch {}
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
        try { rec.popup.remove(); } catch {}
      }
    });
  }, [pinned]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass || 'h-full'}`}
      style={{ minHeight: '420px', ...(heightStyle || {}) }}
    />
  );
}


