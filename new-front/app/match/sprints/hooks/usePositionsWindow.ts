"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export interface PositionPoint {
  player_display_name: string;
  sec: number;
  lat: number;
  lon: number;
}

export function usePositionsWindow(
  apiBase: string,
  table: string | null,
  centerSecond: number | null | undefined,
  radiusSec: number = 15
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache: map second -> points in that second; and covered ranges we have fetched
  const cacheRef = useRef<Map<number, PositionPoint[]>>(new Map());
  const rangesRef = useRef<Array<{ from: number; to: number }>>([]);
  const inflightRef = useRef<Set<string>>(new Set());
  const [version, setVersion] = useState(0); // bump to re-render when cache updates

  const currentWindow = useMemo(() => {
    if (centerSecond == null) return null;
    const from = Math.max(0, Math.floor(centerSecond - radiusSec));
    const to = Math.max(from + 1, Math.floor(centerSecond + radiusSec));
    return { from, to };
  }, [centerSecond, radiusSec]);

  const isCovered = (from: number, to: number) => {
    const ranges = rangesRef.current;
    // Merge and check coverage
    for (const r of ranges) {
      if (from >= r.from && to <= r.to) return true;
    }
    return false;
  };

  const addRange = (from: number, to: number) => {
    const ranges = rangesRef.current;
    ranges.push({ from, to });
    // Normalize merge
    ranges.sort((a, b) => a.from - b.from);
    const merged: Array<{ from: number; to: number }> = [];
    for (const r of ranges) {
      if (!merged.length || r.from > merged[merged.length - 1].to + 1) merged.push({ ...r });
      else merged[merged.length - 1].to = Math.max(merged[merged.length - 1].to, r.to);
    }
    rangesRef.current = merged;
  };

  const fetchWindow = async (center: number, radius: number) => {
    if (!table) return;
    const from = Math.max(0, Math.floor(center - radius));
    const to = Math.floor(center + radius);
    const key = `${from}-${to}`;
    if (inflightRef.current.has(key)) return;
    inflightRef.current.add(key);
    setLoading(true);
    setError(null);
    try {
      const url = `${apiBase}/match/table/${table}/positions/window?center_sec=${Math.floor(center)}&radius_sec=${radius}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const points: PositionPoint[] = Array.isArray(json.positions) ? json.positions : [];
      // Merge into cache grouped by integer second
      const bySec = cacheRef.current;
      for (const p of points) {
        const sec = Math.floor(p.sec);
        const arr = bySec.get(sec) || [];
        arr.push(p);
        bySec.set(sec, arr);
      }
      addRange(from, to);
      setVersion(v => v + 1);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch positions');
    } finally {
      inflightRef.current.delete(key);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!table || !currentWindow || centerSecond == null) return;
    const { from, to } = currentWindow;
    if (!isCovered(from, to)) {
      void fetchWindow(centerSecond, radiusSec);
      return;
    }
    // Prefetch forward when we are within 1/3 of the right edge
    const rightMost = rangesRef.current.reduce((mx, r) => (r.to > mx ? r.to : mx), 0);
    if (rightMost - (centerSecond || 0) < Math.floor(radiusSec / 3)) {
      void fetchWindow((centerSecond || 0) + radiusSec, radiusSec);
    }
  }, [table, apiBase, radiusSec, centerSecond, currentWindow?.from, currentWindow?.to]);

  // Build snapshot from cache: choose nearest point to current second for each player
  const snapshot = useMemo(() => {
    if (centerSecond == null) return [] as PositionPoint[];
    const second = Math.floor(centerSecond);
    const byPlayer = new Map<string, PositionPoint>();

    // Look at [second-1, second, second+1] for nearest to be robust
    const candidates: PositionPoint[] = [];
    for (let s = second - 1; s <= second + 1; s++) {
      const arr = cacheRef.current.get(s);
      if (arr) candidates.push(...arr);
    }
    for (const p of candidates) {
      const prev = byPlayer.get(p.player_display_name);
      const d = Math.abs(p.sec - (centerSecond || 0));
      if (!prev || d < Math.abs(prev.sec - (centerSecond || 0))) byPlayer.set(p.player_display_name, p);
    }
    return Array.from(byPlayer.values());
  }, [centerSecond, version]);

  return { snapshot, loading, error };
}


