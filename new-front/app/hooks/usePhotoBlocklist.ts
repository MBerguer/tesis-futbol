"use client";

import React from "react";

type BlockMap = Record<string, boolean>;

const STORAGE_KEY = "photo_blocklist";

function readBlockMap(): BlockMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as BlockMap) : {};
  } catch {
    return {};
  }
}

function writeBlockMap(map: BlockMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function usePhotoBlocklist() {
  const [version, setVersion] = React.useState<number>(0);

  const getMap = React.useCallback((): BlockMap => {
    return readBlockMap();
  }, []);

  const isBlocked = React.useCallback((id?: string | number | null): boolean => {
    if (id === undefined || id === null) return false;
    const key = String(id);
    const map = readBlockMap();
    return !!map[key];
  }, []);

  const block = React.useCallback((id?: string | number | null) => {
    if (id === undefined || id === null) return;
    const key = String(id);
    const map = readBlockMap();
    if (!map[key]) {
      map[key] = true;
      writeBlockMap(map);
      setVersion((v) => v + 1);
    }
  }, []);

  const unblock = React.useCallback((id?: string | number | null) => {
    if (id === undefined || id === null) return;
    const key = String(id);
    const map = readBlockMap();
    if (map[key]) {
      delete map[key];
      writeBlockMap(map);
      setVersion((v) => v + 1);
    }
  }, []);

  return {
    version,
    getMap,
    isBlocked,
    block,
    unblock,
  };
}


