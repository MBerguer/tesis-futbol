"use client";

import React, { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";

interface StadiumMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  styleUrl?: string; // Optional custom style URL (MapTiler, etc.)
}

export default function StadiumMap({ latitude, longitude, zoom = 15, styleUrl }: StadiumMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const defaultStyle = styleUrl || (key
      ? `https://api.maptiler.com/maps/streets/style.json?key=${key}`
      : "https://demotiles.maplibre.org/style.json");
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: defaultStyle,
      center: [longitude, latitude],
      zoom,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    new maplibregl.Marker().setLngLat([longitude, latitude]).addTo(map);
    mapRef.current = map;

    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
  }, [latitude, longitude, zoom, styleUrl]);

  return <div ref={mapContainerRef} className="w-full h-[360px] rounded" />;
}



