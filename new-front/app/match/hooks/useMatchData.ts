"use client";

import { useEffect, useState } from "react";

export interface MatchEntry {
  player_display_name: string;
  time: string;
  speed: number;
  seconds_since_midnight: number;
}

export interface MatchEntries { entries: MatchEntry[] }

export interface MatchPeriods {
  match_name: string;
  detected_first_half_start?: number;
  detected_first_half_end?: number;
  detected_second_half_start?: number;
  detected_second_half_end?: number;
  detected_halftime_start?: number;
  detected_halftime_end?: number;
  using_manual?: boolean;
}

export interface WorstCase {
  player_display_name: string;
  start_second: number;
  end_second: number;
  distance_covered: number;
}

export interface WorstCases { worst_cases: WorstCase[] }

export interface SprintInWorstCase {
  player_display_name: string;
  sprint_id: number;
  start_second: number;
  end_second: number;
  sprint_start_time: string;
  sprint_end_time: string;
  total_sprint_distance: number;
  min_speed_reached_within_sprint: number;
  max_speed_reached_within_sprint: number;
  worst_case_distance_covered: number;
  sprint_start_sec?: number;
  sprint_end_sec?: number;
}

export interface SprintsInWorstCases { sprints_in_worst_cases: SprintInWorstCase[] }

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function useMatchData(apiBase: string, selectedTable: string | null, reloadToken?: number) {
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [periods, setPeriods] = useState<MatchPeriods | null>(null);
  const [worstCases, setWorstCases] = useState<WorstCase[]>([]);
  const [sprints, setSprints] = useState<SprintInWorstCase[]>([]);
  const [thresholds, setThresholds] = useState<{ match: number; halftime: number; kickoff: number } | null>(null);
  const [kickoffSpike, setKickoffSpike] = useState<number | null>(null);
  const [baseTime, setBaseTime] = useState<string | null>(null);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingWorstCases, setLoadingWorstCases] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTable) return;
    const controller = new AbortController();
    const signal = controller.signal;
    setLoadingDetect(true);
    setLoadingEntries(true);
    setError(null);
    const isAbort = (err: any) => !!err && ((err.name === 'AbortError') || String(err).toLowerCase().includes('abort'));
    const detectUrl = `${apiBase}/match/table/${selectedTable}/periods/detect-notebook`;
    const entriesUrl = `${apiBase}/match/table/${selectedTable}/entries`;
    Promise.allSettled([
      fetchJson<any>(detectUrl, signal),
      fetchJson<MatchEntries>(entriesUrl, signal),
    ])
      .then(([detectRes, entriesRes]) => {
        if (detectRes.status === 'fulfilled') {
          const data = detectRes.value;
          const spi = (v: any) => { const n = parseInt(String(v)); return isNaN(n) ? undefined : n; };
          setPeriods({
            match_name: data.match_name,
            detected_first_half_start: spi(data.detected_first_half_start),
            detected_first_half_end: spi(data.detected_first_half_end),
            detected_second_half_start: spi(data.detected_second_half_start),
            detected_second_half_end: spi(data.detected_second_half_end),
            detected_halftime_start: spi(data.detected_halftime_start),
            detected_halftime_end: spi(data.detected_halftime_end),
            using_manual: !!data.using_manual,
          });
          setThresholds(data.thresholds || null);
          setKickoffSpike(typeof data.kickoff_spike_sec === 'number' ? data.kickoff_spike_sec : null);
          setBaseTime(typeof data.base_time === 'string' ? data.base_time : null);
        } else {
          if (!isAbort(detectRes.reason)) {
            setError(detectRes.reason?.message || 'Failed to detect periods');
          }
        }
        if (entriesRes.status === 'fulfilled') {
          setEntries(entriesRes.value.entries || []);
        } else {
          if (!isAbort(entriesRes.reason)) {
            setError(entriesRes.reason?.message || 'Failed to fetch entries');
          }
        }
      })
      .then(() => {
        const wcUrl = `${apiBase}/match/table/${selectedTable}/worst-cases-from-view`;
        const spUrl = `${apiBase}/match/table/${selectedTable}/sprints-in-worst-cases`;
        setLoadingWorstCases(true);
        setLoadingSprints(true);
        return Promise.allSettled([
          fetchJson<WorstCases>(wcUrl, signal),
          fetchJson<SprintsInWorstCases>(spUrl, signal),
        ]).then(([wc, sp]) => {
          if (wc.status === 'fulfilled') setWorstCases(wc.value.worst_cases || []);
          else if (!isAbort(wc.reason)) setError(wc.reason?.message || 'Failed to fetch worst cases');
          if (sp.status === 'fulfilled') setSprints(sp.value.sprints_in_worst_cases || []);
          else if (!isAbort(sp.reason)) setError(sp.reason?.message || 'Failed to fetch sprints');
        });
      })
      .catch((e) => { if (!isAbort(e)) setError(e instanceof Error ? e.message : 'Error'); })
      .finally(() => { setLoadingDetect(false); setLoadingEntries(false); setLoadingWorstCases(false); setLoadingSprints(false); });
    return () => controller.abort();
  }, [apiBase, selectedTable, reloadToken]);

  return { entries, periods, worstCases, sprints, thresholds, kickoffSpike, baseTime, loadingDetect, loadingEntries, loadingWorstCases, loadingSprints, error };
}


