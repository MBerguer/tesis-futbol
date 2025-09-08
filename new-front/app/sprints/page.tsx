"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMatchData } from "./hooks/useMatchData";
import { Card, CardContent, CardHeader, CardTitle } from "../dashboard/components/ui/card";
import { Button } from "../dashboard/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { formatTime, formatMatchTime, toAbsoluteTime as toAbsFromUtils, formatDuration } from './utils/time';
import PeriodsSummary from "./components/PeriodsSummary";
import PlayersChart from "./components/PlayersChart";
import AvgSpeedChart from "./components/AvgSpeedChart";
import MatchSelector from "./components/MatchSelector";
import WorstCasesTable from "./components/WorstCasesTable";
import SprintsTable from "./components/SprintsTable";
import Skeleton from "./components/Skeleton";
import TopProgress from "./components/TopProgress";
import ThresholdLegend from "./components/ThresholdLegend";

interface MatchTable {
  tables: string[];
}

interface MatchPlayers {
  players: string[];
}

interface MatchEntry {
  player_display_name: string;
  time: string;
  speed: number;
  centralized_elapsed_time: number;
}

interface MatchEntries {
  entries: MatchEntry[];
}

interface MatchPeriods {
  match_name: string;
  detected_first_half_start?: number;
  detected_first_half_end?: number;
  detected_second_half_start?: number;
  detected_second_half_end?: number;
  detected_halftime_start?: number;
  detected_halftime_end?: number;
  manual_first_half_start?: number;
  manual_first_half_end?: number;
  manual_second_half_start?: number;
  manual_second_half_end?: number;
  manual_halftime_start?: number;
  manual_halftime_end?: number;
}

interface WorstCase {
  player_display_name: string;
  start_second: number;
  end_second: number;
  distance_covered: number;
}

interface WorstCases {
  worst_cases: WorstCase[];
}

interface SprintInWorstCase {
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
}

interface SprintsInWorstCases {
  sprints_in_worst_cases: SprintInWorstCase[];
}

export default function SprintsPage() {
  const [matchTables, setMatchTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [periods, setPeriods] = useState<MatchPeriods | null>(null);
  const [kickoffSpike, setKickoffSpike] = useState<number | null>(null);
  const [thresholds, setThresholds] = useState<{ match: number; halftime: number; kickoff: number } | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [baseTime, setBaseTime] = useState<string | null>(null);
  const thresholdsMps = React.useMemo(() => {
    if (!thresholds) return null;
    return {
      match: thresholds.match / 3.6,
      halftime: thresholds.halftime / 3.6,
      kickoff: thresholds.kickoff / 3.6,
    };
  }, [thresholds]);
  
  // Nuevos estados para worst cases y sprints
  const [worstCases, setWorstCases] = useState<WorstCase[]>([]);
  const [sprintsInWorstCases, setSprintsInWorstCases] = useState<SprintInWorstCase[]>([]);
  const [loadingWorstCases, setLoadingWorstCases] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [showWorstCases, setShowWorstCases] = useState(false);
  const [showSprints, setShowSprints] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [reloadToken, setReloadToken] = useState<number>(0);

  // Auto-loading data hook (must be called directly, not inside useMemo)
  const autoData = useMatchData(API_BASE, selectedTable, reloadToken);
  const entriesAuto = autoData.entries;
  const periodsAuto = autoData.periods;
  const thresholdsAuto = autoData.thresholds;
  const kickoffSpikeAuto = autoData.kickoffSpike;
  const baseTimeAuto = autoData.baseTime;
  const worstCasesAuto = autoData.worstCases;
  const sprintsAuto = autoData.sprints;
  const loadingDetectAuto = autoData.loadingDetect;
  const loadingEntriesAuto = autoData.loadingEntries;
  const loadingWorstAuto = autoData.loadingWorstCases;
  const loadingSprintsAuto = autoData.loadingSprints;

  // Bridge hook data into existing local state (minimal refactor)
  useEffect(() => {
    if (entriesAuto) setEntries(entriesAuto);
    if (periodsAuto) setPeriods(periodsAuto);
    if (thresholdsAuto) setThresholds(thresholdsAuto);
    if (typeof kickoffSpikeAuto === 'number' || kickoffSpikeAuto === null) setKickoffSpike(kickoffSpikeAuto);
    if (baseTimeAuto) setBaseTime(baseTimeAuto);
    if (worstCasesAuto) { setWorstCases(worstCasesAuto); setShowWorstCases(worstCasesAuto.length > 0); }
    if (sprintsAuto) { setSprintsInWorstCases(sprintsAuto); setShowSprints(sprintsAuto.length > 0); }
    setLoadingEntries(loadingEntriesAuto);
    setLoadingPeriods(loadingDetectAuto);
    if (autoData.error) setError(autoData.error);
  }, [entriesAuto, periodsAuto, thresholdsAuto, kickoffSpikeAuto, baseTimeAuto, worstCasesAuto, sprintsAuto, loadingEntriesAuto, loadingDetectAuto, autoData.error]);

  // Clear previous data instantly on table change to show fresh skeletons
  useEffect(() => {
    if (!selectedTable) return;
    setPlayers([]);
    setLoadingPlayers(true);
    setEntries([]);
    setLoadingEntries(true);
    setPeriods(null);
    setLoadingPeriods(true);
    setWorstCases([]);
    setShowWorstCases(false);
    setSprintsInWorstCases([]);
    setShowSprints(false);
    setKickoffSpike(null);
    setThresholds(null);
    setBaseTime(null);
  }, [selectedTable]);

  // Auto-load players whenever a table is chosen (including URL preselect)
  useEffect(() => {
    if (!selectedTable) return;
    const controller = new AbortController();
    const signal = controller.signal;
    (async () => {
      try {
        setLoadingPlayers(true);
        const res = await fetch(`${API_BASE}/match/table/${selectedTable}/players`, { signal });
        if (res.ok) {
          const data: MatchPlayers = await res.json();
          setPlayers(data.players || []);
        }
      } catch (_) {
        // ignore abort
      } finally {
        setLoadingPlayers(false);
      }
    })();
    return () => controller.abort();
  }, [API_BASE, selectedTable]);

  useEffect(() => {
    const fetchMatchTables = async () => {
      try {
        const response = await fetch(`${API_BASE}/match/tables`);
        if (!response.ok) throw new Error("Failed to fetch match tables");
        const data: MatchTable = await response.json();
        setMatchTables(data.tables);
        // preselect from URL or last selection
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get('table');
        const candidate = fromUrl && data.tables.includes(fromUrl) ? fromUrl : (localStorage.getItem('lastTable') || null);
        if (candidate && data.tables.includes(candidate)) {
          setSelectedTable(candidate);
        } else if (fromUrl && !data.tables.includes(fromUrl)) {
          // fallback: if URL has a table not in list yet, still set it to trigger fetch (server may allow it)
          setSelectedTable(fromUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally { setLoading(false); }
    };
    fetchMatchTables();
  }, []);

  const handleTableClick = async (tableName: string) => {
    setSelectedTable(tableName);
    localStorage.setItem('lastTable', tableName);
    const url = new URL(window.location.href);
    url.searchParams.set('table', tableName);
    window.history.replaceState({}, '', url.toString());
    // fetch players list in background
    try {
      const res = await fetch(`${API_BASE}/match/table/${tableName}/players`);
      if (res.ok) {
        const data: MatchPlayers = await res.json();
        setPlayers(data.players);
      }
    } catch {}
  };

  const handleRefresh = () => {
    setReloadToken(Date.now());
  };

  // auto-load flows now; keep function only for legacy UI toggle
  const handleShowEntries = async () => {};

  const handleDetectPeriods = async () => {};

  const handleLoadWorstCases = async () => {
    if (!selectedTable) return;
    
    setLoadingWorstCases(true);
    try {
      const response = await fetch(`${API_BASE}/match/table/${selectedTable}/worst-cases-from-view`);
      if (!response.ok) {
        throw new Error("Failed to fetch worst cases");
      }
      const data: WorstCases = await response.json();
      setWorstCases(data.worst_cases || []);
      setShowWorstCases(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setWorstCases([]);
    } finally {
      setLoadingWorstCases(false);
    }
  };

  const handleLoadSprints = async () => {
    if (!selectedTable) return;
    
    setLoadingSprints(true);
    try {
      const response = await fetch(`${API_BASE}/match/table/${selectedTable}/sprints-in-worst-cases`);
      if (!response.ok) {
        throw new Error("Failed to fetch sprints");
      }
      const data: SprintsInWorstCases = await response.json();
      setSprintsInWorstCases(data.sprints_in_worst_cases || []);
      setShowSprints(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSprintsInWorstCases([]);
    } finally {
      setLoadingSprints(false);
    }
  };

  // Group entries by player for the chart
  const playerData = React.useMemo(() => {
    const dataByPlayer: { [key: string]: MatchEntry[] } = {};
    entries.forEach(entry => {
      if (!dataByPlayer[entry.player_display_name]) {
        dataByPlayer[entry.player_display_name] = [];
      }
      dataByPlayer[entry.player_display_name].push(entry);
    });
    // Ordenar por tiempo para cada jugador
    Object.keys(dataByPlayer).forEach(player => {
      dataByPlayer[player].sort((a, b) => a.centralized_elapsed_time - b.centralized_elapsed_time);
    });
    return dataByPlayer;
  }, [entries]);

  // Construir una lista de todos los tiempos únicos
  const allTimes = React.useMemo(() => {
    return Array.from(new Set(entries.map(e => e.centralized_elapsed_time))).sort((a, b) => a - b);
  }, [entries]);

  // Construir la tabla cruzada (pivot) para el gráfico
  const chartData = React.useMemo(() => {
    return allTimes.map(time => {
      const row: any = { centralized_elapsed_time: time };
      Object.keys(playerData).forEach(player => {
        const found = playerData[player].find(e => e.centralized_elapsed_time === time);
        row[player] = found ? found.speed : null;
      });
      return row;
    });
  }, [allTimes, playerData]);

  // Serie promedio por segundo (estilo notebook), requiere >=2 jugadores por segundo
  const avgSeries = React.useMemo(() => {
    if (entries.length === 0) return [] as { second: number; speed: number }[];
    const secondToSpeeds: Map<number, number[]> = new Map();
    const secondToPlayers: Map<number, Set<string>> = new Map();
    for (const e of entries) {
      const sec = Math.floor(e.centralized_elapsed_time);
      if (!secondToSpeeds.has(sec)) secondToSpeeds.set(sec, []);
      secondToSpeeds.get(sec)!.push(e.speed);
      if (!secondToPlayers.has(sec)) secondToPlayers.set(sec, new Set());
      secondToPlayers.get(sec)!.add(e.player_display_name);
    }
    const seconds = Array.from(secondToSpeeds.keys());
    if (seconds.length === 0) return [] as { second: number; speed: number }[];
    const minSec = Math.min(...seconds);
    const maxSec = Math.max(...seconds);
    const series: { second: number; speed: number }[] = [];
    for (let s = minSec; s <= maxSec; s++) {
      const speeds = secondToSpeeds.get(s) || [];
      const players = secondToPlayers.get(s) || new Set<string>();
      if (players.size >= 2 && speeds.length > 0) {
        const sum = speeds.reduce((a, b) => a + b, 0);
        series.push({ second: s, speed: sum / speeds.length });
      } else {
        series.push({ second: s, speed: 0 });
      }
    }
    return series;
  }, [entries]);

  // X-axis ticks only at PT start/end and ST start/end
  const keyTicks = React.useMemo(() => {
    if (!periods) return undefined;
    const values: number[] = [];
    const push = (v: number | undefined) => {
      if (typeof v === 'number') values.push(v);
    };
    push(periods.detected_first_half_start);
    push(periods.detected_first_half_end);
    push(periods.detected_second_half_start);
    push(periods.detected_second_half_end);
    // unique & sorted
    return Array.from(new Set(values)).sort((a, b) => a - b);
  }, [periods]);

  // Convert base time (HH:MM:SS.MS) + seconds to absolute HH:MM:SS
  const derivedBaseTime = React.useMemo(() => {
    if (!entries || entries.length === 0) return null as string | null;
    const t = entries
      .map(e => e.time)
      .filter(Boolean)
      .sort()[0];
    return t || null;
  }, [entries]);

  const toAbsoluteTime = (sec: number | undefined) => {
    if (sec === undefined || sec === null) return "-";
    const base = baseTime || derivedBaseTime;
    if (!base) return "-";
    return toAbsFromUtils(base, sec);
  };

  if (loading && !selectedTable) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <main className="p-4">
      <TopProgress active={loading || loadingEntries || loadingPeriods || loadingWorstCases || loadingSprints} />
      <div className="sticky top-2 z-40 mb-3 flex items-center gap-2">
        <div className="text-xl font-semibold">Sprints & Periods</div>
        <div className="flex-1" />
        <Button onClick={handleRefresh} variant="outline">Refresh</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Match Tables</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && matchTables.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : (
              <MatchSelector tables={matchTables} selected={selectedTable} onSelect={handleTableClick} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTable ? `Players in ${selectedTable}` : 'Select a match to view players'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPlayers ? (
                <div>Loading players...</div>
              ) : (
                <ul className="space-y-2">
                  {players.map((player, index) => (
                    <li key={index} className="p-2 border rounded">
                      {player}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {selectedTable && (
            <Card className="col-span-2">
              <CardHeader><CardTitle>Player Speeds Over Time</CardTitle></CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <Skeleton className="h-[500px]" />
                ) : (
                  <PlayersChart entries={entries} baseTime={baseTime || derivedBaseTime} />
                )}
              </CardContent>
            </Card>
          )}

          {selectedTable && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Average Speed Over Time</CardTitle>
                <ThresholdLegend thresholds={thresholds} />
              </CardHeader>
              <CardContent>
                {entries.length === 0 || !periods ? (
                  <Skeleton className="h-[420px]" />
                ) : (
                  <AvgSpeedChart
                    entries={entries}
                    baseTime={baseTime || derivedBaseTime}
                    thresholds={thresholds}
                    periods={periods}
                    kickoffSpike={kickoffSpike}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle>Match Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEntries ? (
                  <div>Loading entries...</div>
                ) : entries && entries.length > 0 ? (
                  <div>
                    {showTable && (
                      <div className="overflow-x-auto max-h-[400px]">
                        <table className="min-w-full">
                          <thead className="sticky top-0 bg-white">
                            <tr>
                              <th className="px-4 py-2">Player</th>
                              <th className="px-4 py-2">Time</th>
                              <th className="px-4 py-2">Speed</th>
                              <th className="px-4 py-2">Centralized Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((entry, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2">{entry.player_display_name}</td>
                                <td className="px-4 py-2">{entry.time}</td>
                                <td className="px-4 py-2">{entry.speed.toFixed(2)}</td>
                                <td className="px-4 py-2">{entry.centralized_elapsed_time.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>No entries to show</div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle>Match Periods</CardTitle>
              </CardHeader>
              <CardContent>
                {!periods ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6" />
                    <Skeleton className="h-6" />
                    <Skeleton className="h-6" />
                  </div>
                ) : (
                  <PeriodsSummary
                    baseTime={baseTime}
                    detected_first_half_start={periods.detected_first_half_start}
                    detected_first_half_end={periods.detected_first_half_end}
                    detected_second_half_start={periods.detected_second_half_start}
                    detected_second_half_end={periods.detected_second_half_end}
                    detected_halftime_start={periods.detected_halftime_start}
                    detected_halftime_end={periods.detected_halftime_end}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle>Worst Cases Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWorstCases ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6" />
                    <Skeleton className="h-6" />
                    <Skeleton className="h-6" />
                  </div>
                ) : showWorstCases && worstCases.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Worst Cases (HSR ≥19.8 km/h)</h3>
                    <WorstCasesTable data={worstCases} />
                  </div>
                )}

                {loadingSprints ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6" />
                    <Skeleton className="h-6" />
                    <Skeleton className="h-6" />
                  </div>
                ) : showSprints && sprintsInWorstCases.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Sprints in Worst Cases (≥25.2 km/h)</h3>
                    <SprintsTable data={sprintsInWorstCases} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
} 