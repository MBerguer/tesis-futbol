"use client";

import React from "react";

type Block = { player_id: number; path: string };

export function useServerPhotoBlocks(apiBase?: string) {
  const [blocks, setBlocks] = React.useState<Map<number, Set<string>>>(new Map());
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const base = apiBase || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/player/photo-blocks`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      const list: Block[] = Array.isArray(json?.blocks) ? json.blocks : [];
      const map = new Map<number, Set<string>>();
      for (const b of list) {
        if (typeof b?.player_id !== "number" || typeof b?.path !== "string") continue;
        if (!map.has(b.player_id)) map.set(b.player_id, new Set());
        map.get(b.player_id)!.add(b.path);
      }
      setBlocks(map);
    } catch (e: any) {
      setError(e?.message || "error");
    } finally {
      setLoading(false);
    }
  }, [base]);

  React.useEffect(() => { load(); }, [load]);

  const isBlocked = React.useCallback((playerId?: number | null, path?: string | null) => {
    if (playerId == null || !path) return false;
    const set = blocks.get(playerId);
    return !!set && set.has(path);
  }, [blocks]);

  const block = React.useCallback(async (playerId?: number | null, path?: string | null) => {
    if (playerId == null || !path) return false;
    try {
      const res = await fetch(`${base}/player/photo-blocks/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, path }),
      });
      if (!res.ok) throw new Error("failed");
      setBlocks(prev => {
        const next = new Map(prev);
        if (!next.has(playerId)) next.set(playerId, new Set());
        next.get(playerId)!.add(path);
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, [base]);

  const unblock = React.useCallback(async (playerId?: number | null, path?: string | null) => {
    if (playerId == null || !path) return false;
    try {
      const res = await fetch(`${base}/player/photo-blocks/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, path }),
      });
      if (!res.ok) throw new Error("failed");
      setBlocks(prev => {
        const next = new Map(prev);
        const set = next.get(playerId);
        if (set) {
          set.delete(path);
          if (set.size === 0) next.delete(playerId);
        }
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, [base]);

  return { blocks, loading, error, isBlocked, block, unblock, reload: load };
}


