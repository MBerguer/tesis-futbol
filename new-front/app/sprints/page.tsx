"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../dashboard/components/ui/card";
import { Button } from "../dashboard/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

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
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [periods, setPeriods] = useState<MatchPeriods | null>(null);
  const [kickoffSpike, setKickoffSpike] = useState<number | null>(null);
  const [thresholds, setThresholds] = useState<{ match: number; halftime: number; kickoff: number } | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
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

  useEffect(() => {
    const fetchMatchTables = async () => {
      try {
        const response = await fetch(`${API_BASE}/match/tables`);
        if (!response.ok) {
          throw new Error("Failed to fetch match tables");
        }
        const data: MatchTable = await response.json();
        setMatchTables(data.tables);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMatchTables();
  }, []);

  const handleTableClick = async (tableName: string) => {
    setSelectedTable(tableName);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/match/table/${tableName}/players`);
      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }
      const data: MatchPlayers = await response.json();
      setPlayers(data.players);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleShowEntries = async () => {
    if (!selectedTable) return;
    
    setLoadingEntries(true);
    try {
      const response = await fetch(`${API_BASE}/match/table/${selectedTable}/entries`);
      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }
      const data: MatchEntries = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleDetectPeriods = async () => {
    if (!selectedTable) return;
    
    setLoadingPeriods(true);
    try {
      const response = await fetch(`${API_BASE}/match/table/${selectedTable}/periods/detect-notebook`);
      if (!response.ok) {
        throw new Error("Failed to detect periods");
      }
      const data = await response.json();
      console.log("Raw response data:", data);
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Función helper para convertir valores de manera segura
      const safeParseInt = (value: any): number | undefined => {
        if (value === null || value === undefined || value === "") {
          return undefined;
        }
        const parsed = parseInt(String(value));
        return isNaN(parsed) ? undefined : parsed;
      };

      // Convertir explícitamente a números y verificar
      const processedData = {
        match_name: data.match_name,
        detected_first_half_start: safeParseInt(data.detected_first_half_start),
        detected_first_half_end: safeParseInt(data.detected_first_half_end),
        detected_second_half_start: safeParseInt(data.detected_second_half_start),
        detected_second_half_end: safeParseInt(data.detected_second_half_end),
        detected_halftime_start: safeParseInt(data.detected_halftime_start),
        detected_halftime_end: safeParseInt(data.detected_halftime_end),
        manual_first_half_start: safeParseInt(data.manual_first_half_start),
        manual_first_half_end: safeParseInt(data.manual_first_half_end),
        manual_second_half_start: safeParseInt(data.manual_second_half_start),
        manual_second_half_end: safeParseInt(data.manual_second_half_end),
        manual_halftime_start: safeParseInt(data.manual_halftime_start),
        manual_halftime_end: safeParseInt(data.manual_halftime_end),
      };
      
      console.log("Processed data with explicit parsing:", processedData);
      setPeriods(processedData);
      setKickoffSpike(typeof data.kickoff_spike_sec === 'number' ? data.kickoff_spike_sec : null);
      setThresholds(data.thresholds || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setPeriods(null);
    } finally {
      setLoadingPeriods(false);
    }
  };

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

  // Función para convertir segundos a formato MM:SS
  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined || seconds === null) return "-";
    
    // Asegurarse de que estamos trabajando con un número
    const rawSeconds = parseInt(String(seconds));
    
    if (isNaN(rawSeconds)) {
      return "-";
    }
    
    const totalSeconds = Math.abs(rawSeconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Función para convertir segundos desde inicio del partido a formato HH:MM:SS
  const formatMatchTime = (seconds: number | undefined) => {
    if (seconds === undefined || seconds === null) return "-";
    
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !selectedTable) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <main className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Match Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {matchTables.map((table, index) => (
                <li 
                  key={index} 
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-100 ${
                    selectedTable === table ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleTableClick(table)}
                >
                  {table}
                </li>
              ))}
            </ul>
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
              {loading ? (
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

          {selectedTable && entries.length > 0 && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Player Speeds Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="centralized_elapsed_time" 
                        label={{ value: 'Elapsed_time (seconds)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Speed (m/s)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      {/* Horizontal threshold lines (converted from km/h to m/s) */}
                      {thresholdsMps && (
                        <>
                          <ReferenceLine y={thresholdsMps.match} stroke="#A0AEC0" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ position: 'right', value: '5.9 km/h' }} />
                          <ReferenceLine y={thresholdsMps.halftime} stroke="#CBD5E0" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ position: 'right', value: '11 km/h' }} />
                          <ReferenceLine y={thresholdsMps.kickoff} stroke="#E53E3E" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ position: 'right', value: '20 km/h' }} />
                        </>
                      )}
                      {/* Halftime shaded area */}
                      {periods && periods.detected_halftime_start !== undefined && periods.detected_halftime_end !== undefined && (
                        <ReferenceArea x1={periods.detected_halftime_start} x2={periods.detected_halftime_end} y1={0} y2={'auto'} fill="#FED7D7" fillOpacity={0.15} />
                      )}
                      {/* Vertical markers for PT/HT/ST */}
                      {periods && (
                        <>
                          {typeof periods.detected_first_half_start === 'number' && (
                            <ReferenceLine x={periods.detected_first_half_start} stroke="#38A169" label={{ value: 'PT Start', position: 'top' }} />
                          )}
                          {typeof periods.detected_first_half_end === 'number' && (
                            <ReferenceLine x={periods.detected_first_half_end} stroke="#2F855A" label={{ value: 'PT End', position: 'top' }} />
                          )}
                          {typeof periods.detected_halftime_start === 'number' && (
                            <ReferenceLine x={periods.detected_halftime_start} stroke="#805AD5" label={{ value: 'HT Start', position: 'top' }} />
                          )}
                          {typeof periods.detected_halftime_end === 'number' && (
                            <ReferenceLine x={periods.detected_halftime_end} stroke="#6B46C1" label={{ value: 'HT End', position: 'top' }} />
                          )}
                          {typeof periods.detected_second_half_start === 'number' && (
                            <ReferenceLine x={periods.detected_second_half_start} stroke="#3182CE" label={{ value: 'ST Start', position: 'top' }} />
                          )}
                          {typeof periods.detected_second_half_end === 'number' && (
                            <ReferenceLine x={periods.detected_second_half_end} stroke="#2B6CB0" label={{ value: 'ST End', position: 'top' }} />
                          )}
                        </>
                      )}
                      {/* Kickoff spike marker if present */}
                      {typeof kickoffSpike === 'number' && (
                        <ReferenceLine x={kickoffSpike} stroke="#DD6B20" strokeDasharray="3 3" label={{ value: 'Kickoff spike', position: 'top' }} />
                      )}
                      {Object.keys(playerData).map((player, index) => (
                        <Line
                          key={player}
                          type="monotone"
                          dataKey={player}
                          name={player}
                          stroke={`hsl(${index * 137.5}, 70%, 50%)`}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={true}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTable && avgSeries.length > 0 && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Average Speed Over Time (Notebook-style)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={avgSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="second" ticks={keyTicks} tickFormatter={(s) => formatTime(s)} />
                      <YAxis label={{ value: 'Speed (m/s)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip labelFormatter={(l:any)=> `t=${formatTime(l)}`} />
                      <Legend />
                      {/* thresholds (km/h -> m/s) */}
                      {thresholdsMps && (
                        <>
                          <ReferenceLine y={thresholdsMps.match} stroke="#A0AEC0" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ position: 'right', value: '5.9 km/h' }} />
                          <ReferenceLine y={thresholdsMps.halftime} stroke="#CBD5E0" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ position: 'right', value: '11 km/h' }} />
                          <ReferenceLine y={thresholdsMps.kickoff} stroke="#E53E3E" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ position: 'right', value: '20 km/h' }} />
                        </>
                      )}
                      {/* halftime band */}
                      {periods && periods.detected_halftime_start !== undefined && periods.detected_halftime_end !== undefined && (
                        <ReferenceArea x1={periods.detected_halftime_start} x2={periods.detected_halftime_end} fill="#E53E3E" fillOpacity={0.28} ifOverflow="extendDomain" />
                      )}
                      {/* PT/HT/ST markers */}
                      {periods && (
                        <>
                          {typeof periods.detected_first_half_start === 'number' && (
                            <ReferenceLine x={periods.detected_first_half_start} stroke="#38A169" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'PT Start', position: 'top' }} />
                          )}
                          {typeof periods.detected_first_half_end === 'number' && (
                            <ReferenceLine x={periods.detected_first_half_end} stroke="#2F855A" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'PT End', position: 'top' }} />
                          )}
                          {typeof periods.detected_halftime_start === 'number' && (
                            <ReferenceLine x={periods.detected_halftime_start} stroke="#805AD5" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'HT Start', position: 'top' }} />
                          )}
                          {typeof periods.detected_halftime_end === 'number' && (
                            <ReferenceLine x={periods.detected_halftime_end} stroke="#6B46C1" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'HT End', position: 'top' }} />
                          )}
                          {typeof periods.detected_second_half_start === 'number' && (
                            <ReferenceLine x={periods.detected_second_half_start} stroke="#3182CE" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'ST Start', position: 'top' }} />
                          )}
                          {typeof periods.detected_second_half_end === 'number' && (
                            <ReferenceLine x={periods.detected_second_half_end} stroke="#2B6CB0" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'ST End', position: 'top' }} />
                          )}
                        </>
                      )}
                      {/* kickoff spike */}
                      {typeof kickoffSpike === 'number' && (
                        <ReferenceLine x={kickoffSpike} stroke="#DD6B20" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Kickoff spike', position: 'top' }} />
                      )}
                      <Line type="monotone" dataKey="speed" name="Avg speed" stroke="#2C5282" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle>Match Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleShowEntries}
                  className="mb-4"
                >
                  Load Player First Appearances
                </Button>
                {loadingEntries ? (
                  <div>Loading entries...</div>
                ) : entries && entries.length > 0 ? (
                  <div>
                    <Button
                      onClick={() => setShowTable(!showTable)}
                      className="mb-4"
                    >
                      {showTable ? 'Hide Table Details' : 'Show Table Details'}
                    </Button>
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
                <Button 
                  onClick={handleDetectPeriods}
                  className="mb-4"
                  disabled={loadingPeriods}
                >
                  {loadingPeriods ? "Detecting Periods..." : "Detect Match Periods"}
                </Button>

                {periods && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-2">Period</th>
                          <th className="px-4 py-2">Detected Time</th>
                          <th className="px-4 py-2">Manual Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-2">First Half Start</td>
                          <td className="px-4 py-2">{formatTime(periods.detected_first_half_start)}</td>
                          <td className="px-4 py-2">{formatTime(periods.manual_first_half_start)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">First Half End</td>
                          <td className="px-4 py-2">{formatTime(periods.detected_first_half_end)}</td>
                          <td className="px-4 py-2">{formatTime(periods.manual_first_half_end)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Halftime Start</td>
                          <td className="px-4 py-2">{formatTime(periods.detected_halftime_start)}</td>
                          <td className="px-4 py-2">{formatTime(periods.manual_halftime_start)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Halftime End</td>
                          <td className="px-4 py-2">{formatTime(periods.detected_halftime_end)}</td>
                          <td className="px-4 py-2">{formatTime(periods.manual_halftime_end)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Second Half Start</td>
                          <td className="px-4 py-2">{formatTime(periods.detected_second_half_start)}</td>
                          <td className="px-4 py-2">{formatTime(periods.manual_second_half_start)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Second Half End</td>
                          <td className="px-4 py-2">{formatTime(periods.detected_second_half_end)}</td>
                          <td className="px-4 py-2">{formatTime(periods.manual_second_half_end)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Removed heavy chart for now to keep UX fast; reuse Players chart above for exploration */}
              </CardContent>
            </Card>
          )}

          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle>Worst Cases Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <Button 
                    onClick={handleLoadWorstCases}
                    disabled={loadingWorstCases}
                  >
                    {loadingWorstCases ? "Loading..." : "Load Worst Cases"}
                  </Button>
                  <Button 
                    onClick={handleLoadSprints}
                    disabled={loadingSprints}
                  >
                    {loadingSprints ? "Loading..." : "Load Sprints in Worst Cases"}
                  </Button>
                </div>

                {showWorstCases && worstCases.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Worst Cases (HSR ≥19.8 km/h)</h3>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="min-w-full">
                        <thead className="sticky top-0 bg-white">
                          <tr>
                            <th className="px-4 py-2">Player</th>
                            <th className="px-4 py-2">Start Time</th>
                            <th className="px-4 py-2">End Time</th>
                            <th className="px-4 py-2">Distance (m)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {worstCases.map((worstCase, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{worstCase.player_display_name}</td>
                              <td className="px-4 py-2">{formatMatchTime(worstCase.start_second)}</td>
                              <td className="px-4 py-2">{formatMatchTime(worstCase.end_second)}</td>
                              <td className="px-4 py-2">{worstCase.distance_covered.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {showSprints && sprintsInWorstCases.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Sprints in Worst Cases (≥25.2 km/h)</h3>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="min-w-full">
                        <thead className="sticky top-0 bg-white">
                          <tr>
                            <th className="px-4 py-2">Player</th>
                            <th className="px-4 py-2">Sprint ID</th>
                            <th className="px-4 py-2">Start Time</th>
                            <th className="px-4 py-2">End Time</th>
                            <th className="px-4 py-2">Min Speed</th>
                            <th className="px-4 py-2">Max Speed</th>
                            <th className="px-4 py-2">Distance (m)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sprintsInWorstCases.map((sprint, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{sprint.player_display_name}</td>
                              <td className="px-4 py-2">{sprint.sprint_id}</td>
                              <td className="px-4 py-2">{sprint.sprint_start_time}</td>
                              <td className="px-4 py-2">{sprint.sprint_end_time}</td>
                              <td className="px-4 py-2">{sprint.min_speed_reached_within_sprint.toFixed(2)}</td>
                              <td className="px-4 py-2">{sprint.max_speed_reached_within_sprint.toFixed(2)}</td>
                              <td className="px-4 py-2">{sprint.total_sprint_distance.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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