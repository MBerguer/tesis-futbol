"use client";
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { PositionPoint } from "../hooks/usePositionsWindow";

interface PitchMapProps {
  points: PositionPoint[];
  styleUrl?: string;
}

export default function PitchMap({ points, styleUrl }: PitchMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

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
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    // Add current markers
    for (const p of points) {
      const el = document.createElement('div');
      el.className = 'rounded-full bg-emerald-500 border border-white';
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.2)';
      const mk = new maplibregl.Marker({ element: el })
        .setLngLat([p.lon, p.lat])
        .addTo(map);
      markersRef.current.push(mk);
    }
  }, [points]);

  return <div ref={containerRef} className="w-full h-[300px]" />;
}


