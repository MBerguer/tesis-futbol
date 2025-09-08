"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMatchContext } from "../../match/context";
import { useMatchData } from "./hooks/useMatchData";
import { Card, CardContent, CardHeader, CardTitle } from "../../players/components/ui/card";
import PeriodsSummary from "./components/PeriodsSummary";
import PlayersChart from "./components/PlayersChart";
import AvgSpeedChart from "./components/AvgSpeedChart";
// Match selector moved to parent page
import WorstCasesTable from "./components/WorstCasesTable";
import SprintsTable from "./components/SprintsTable";
import Skeleton from "./components/Skeleton";
import TopProgress from "./components/TopProgress";
import ThresholdLegend from "./components/ThresholdLegend";
import PlayerMiniList from "./components/PlayerMiniList";
import VideoComponent from "../videoComponent";
import StadiumMap from "./components/StadiumMap";
import Spinner from "./components/Spinner";

interface MatchPlayers {
  players: string[];
}

interface MatchEntry {
  player_display_name: string;
  time: string;
  speed: number;
  centralized_elapsed_time: number;
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


export default function SprintsPage({ selectedTable: selectedTableProp }: { selectedTable?: string | null }) {
  const searchParams = useSearchParams();
  const { reloadToken: globalReloadToken } = useMatchContext();
  const selectedTable = selectedTableProp ?? searchParams.get('table');
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const matchMetadata = {
    teamA: "Equipo A",
    teamB: "Equipo B",
    date: "1 de enero de 2022",
    location: "Nombre del Estadio",
    referee: "Juan Pérez",
    attendance: "50,000",
    result: {
      teamAScore: 2,
      teamBScore: 1,
    },
    goals: [
      { player: "Jugador A", team: "Equipo A", minute: 10 },
      { player: "Jugador B", team: "Equipo B", minute: 20 },
      { player: "Jugador C", team: "Equipo A", minute: 30 },
    ],
    yellowCards: [
      { player: "Jugador D", team: "Equipo A", minute: 15 },
      { player: "Jugador E", team: "Equipo B", minute: 25 },
    ],
    redCards: [{ player: "Jugador F", team: "Equipo A", minute: 60 }],
  };
  const [players, setPlayers] = useState<string[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [periods, setPeriods] = useState<MatchPeriods | null>(null);
  const [kickoffSpike, setKickoffSpike] = useState<number | null>(null);
  const [thresholds, setThresholds] = useState<{ match: number; halftime: number; kickoff: number } | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [baseTime, setBaseTime] = useState<string | null>(null);
  const [videoTimeSec, setVideoTimeSec] = useState<number>(0);
  
  // Nuevos estados para worst cases y sprints
  const [worstCases, setWorstCases] = useState<WorstCase[]>([]);
  const [sprintsInWorstCases, setSprintsInWorstCases] = useState<SprintInWorstCase[]>([]);
  const [loadingWorstCases, setLoadingWorstCases] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [showWorstCases, setShowWorstCases] = useState(false);
  const [showSprints, setShowSprints] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [reloadToken, setReloadToken] = useState<number>(0);
  const sectionParam = (searchParams.get('section') as 'overview'|'players'|'details'|null);
  const activeTab: 'overview' | 'players' = sectionParam === 'players' ? 'players' : 'overview';

  // Auto-loading data hook (must be called directly, not inside useMemo)
  const autoData = useMatchData(API_BASE, selectedTable, reloadToken + globalReloadToken);
  const entriesAuto = autoData.entries;
  const periodsAuto = autoData.periods;
  const thresholdsAuto = autoData.thresholds;
  const kickoffSpikeAuto = autoData.kickoffSpike;
  const baseTimeAuto = autoData.baseTime;
  const worstCasesAuto = autoData.worstCases;
  const sprintsAuto = autoData.sprints;
  const loadingDetectAuto = autoData.loadingDetect;
  const loadingEntriesAuto = autoData.loadingEntries;

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

  // Auto-load players whenever a table is chosen
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

  // Match selection is handled by parent component

  // Convert base time (HH:MM:SS.MS) + seconds to absolute HH:MM:SS
  const derivedBaseTime = React.useMemo(() => {
    if (!entries || entries.length === 0) return null as string | null;
    const t = entries
      .map(e => e.time)
      .filter(Boolean)
      .sort()[0];
    return t || null;
  }, [entries]);


  return (
    <main className="p-4">
      <TopProgress active={loadingEntries || loadingPeriods || loadingWorstCases || loadingSprints} />
      <div className="mb-3" />
      <div className="space-y-4">
          {activeTab === 'players' && (
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
          )}

          {/* Player Speeds Over Time moved to Players tab */}

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3 h-full">
                  <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Match Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedTable ? (
                      <div className="text-sm text-gray-600">Select a match to view details.</div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-lg font-semibold">{matchMetadata.teamA} vs {matchMetadata.teamB}</p>
                        <p>Date: {matchMetadata.date}</p>
                        <p>Location: {matchMetadata.location}</p>
                        <p>Referee: {matchMetadata.referee}</p>
                        <p>Attendance: {matchMetadata.attendance}</p>
                        <div className="mt-2">
                          <p className="font-medium">Result:</p>
                          <p>{matchMetadata.teamA} {matchMetadata.result.teamAScore} - {matchMetadata.teamB} {matchMetadata.result.teamBScore}</p>
                          <p className="mt-1 font-medium">Goals:</p>
                          <ul className="list-disc pl-5">
                            {matchMetadata.goals.map((g, i)=> (
                              <li key={i}>{g.player} ({g.team}) - {g.minute}'</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  </Card>
                </div>

                <div className="md:col-span-4 h-full">
                  <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Match Periods
                    {loadingPeriods && (
                      <Spinner />
                    )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedTable ? (
                      <div className="text-sm text-gray-600">Select a match to view periods.</div>
                    ) : !periods ? (
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
                </div>

                <div className="md:col-span-5 h-full">
                  <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Stadium Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <StadiumMap
                        latitude={-34.795334}
                        longitude={-56.147974}
                        zoom={15}
                        styleUrl={`https://api.maptiler.com/maps/satellite/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY || ''}`}
                      />
                  </CardContent>
                  </Card>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Average Speed Over Time
                    {loadingEntries&&(
                      <Spinner />
                    )}
                    </CardTitle>
                    <ThresholdLegend thresholds={thresholds} />
                  </CardHeader>
                  <CardContent>
                    {loadingEntries ? (                      
                      <Skeleton className="h-[360px]" />
                    ) : entries.length === 0 || !periods ? (
                      <div className="text-sm text-gray-600">No data to display.</div>
                    ) : (
                      <AvgSpeedChart
                        entries={entries}
                        baseTime={baseTime || derivedBaseTime}
                        thresholds={thresholds}
                        periods={periods}
                        kickoffSpike={kickoffSpike}
                        cursorSecond={(function(){
                          const p = periods;
                          const kickoff = kickoffSpike ?? 0;
                          const t = videoTimeSec;
                          if (!p) return kickoff + t;
                          const fhStart = (p.detected_first_half_start ?? p.manual_first_half_start ?? kickoff) as number;
                          const fhEnd = p.detected_first_half_end ?? p.manual_first_half_end;
                          const shStart = p.detected_second_half_start ?? p.manual_second_half_start;
                          if (typeof fhEnd === 'number' && typeof shStart === 'number') {
                            const firstHalfDuration = Math.max(0, fhEnd - fhStart);
                            if (t <= firstHalfDuration) return fhStart + t;
                            return shStart + (t - firstHalfDuration);
                          }
                          return fhStart + t;
                        })()}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Match Video</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VideoComponent onSecondChange={(s)=>setVideoTimeSec(s)} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Players</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedTable ? (
                      <div className="text-sm text-gray-600">Select a match to view players.</div>
                    ) : loadingPlayers ? (
                      <Spinner />
                    ) : players.length === 0 ? (
                      <div className="text-sm text-gray-600">No players found.</div>
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
              </div>
            </>
          )}

          {selectedTable && activeTab === 'players' && (
            <Card>
              <CardHeader>
                <CardTitle>Match Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEntries ? (
                  <div>Loading entries...</div>
                ) : entries && entries.length > 0 ? (
                  <div>
                    <div className="mb-4">
                      <PlayerMiniList entries={entries} />
                    </div>
                    
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
                    
                  </div>
                ) : (
                  <div>No entries to show</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Periods moved to Details page */}

          {selectedTable && activeTab === 'players' && (
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

          {selectedTable && activeTab === 'players' && (
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
      </div>
    </main>
  );
} 