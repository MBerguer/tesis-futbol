"use client";

import React from "react";

type Block = { player_id: number; path: string };

export function useServerPhotoBlocks(apiBase?: string) {
  const [blocks, setBlocks] = React.useState<Map<number, Set<string>>>(new Map());
  const [customUrls, setCustomUrls] = React.useState<Map<number, string>>(new Map());
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

      // load custom photos
      const res2 = await fetch(`${base}/player/custom-photo`, { cache: "no-store" });
      if (res2.ok) {
        const j2 = await res2.json();
        const m2 = new Map<number, string>();
        const arr = Array.isArray(j2?.photos) ? j2.photos : [];
        for (const it of arr) {
          if (typeof it?.player_id === 'number' && typeof it?.url === 'string') {
            const u: string = it.url.startsWith('http') ? it.url : `${base}${it.url}`;
            m2.set(it.player_id, u);
          }
        }
        setCustomUrls(m2);
      } else {
        setCustomUrls(new Map());
      }
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

  const getCustomUrl = React.useCallback((playerId?: number | null) => {
    if (playerId == null) return undefined;
    return customUrls.get(playerId);
  }, [customUrls]);

  const uploadCustom = React.useCallback(async (playerId: number, file: File) => {
    const fd = new FormData();
    fd.append('player_id', String(playerId));
    fd.append('file', file);
    const res = await fetch(`${base}/player/custom-photo/upload`, { method: 'POST', body: fd });
    if (!res.ok) return false;
    const j = await res.json();
    const url = j?.url as string | undefined;
    if (url) {
      const abs = url.startsWith('http') ? url : `${base}${url}`;
      setCustomUrls(prev => new Map(prev).set(playerId, abs));
    }
    return !!url;
  }, [base]);

  const deleteCustom = React.useCallback(async (playerId: number) => {
    const res = await fetch(`${base}/player/custom-photo/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: playerId })
    });
    if (!res.ok) return false;
    setCustomUrls(prev => { const next = new Map(prev); next.delete(playerId); return next; });
    return true;
  }, [base]);

  return { blocks, loading, error, isBlocked, block, unblock, reload: load, getCustomUrl, uploadCustom, deleteCustom };
}


