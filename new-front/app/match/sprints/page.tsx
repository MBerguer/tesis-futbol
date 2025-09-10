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
import PlayerDetailCard from "./components/PlayerDetailCard";
import VideoComponent from "../videoComponent";
import YouTubeVideo from "./components/YouTubeVideo";
import UnifiedVideo from "./components/UnifiedVideo";
import StadiumMap from "./components/StadiumMap";
import PitchMap from "./components/PitchMap";
import Spinner from "./components/Spinner";
import { Button } from "../../players/components/ui/button";
import { toAbsoluteTime as toAbsFromUtils, formatMmSsFromSeconds, parseMmSsToSeconds } from "./utils/time";
import { usePositionsWindow } from "./hooks/usePositionsWindow";
import { stringToColorPair } from "./utils/colors";

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
  const { reloadToken: globalReloadToken, fullWidth } = useMatchContext();
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
  const handleVideoSecondChange = React.useCallback((s: number)=> setVideoTimeSec(s), []);
  const [showPatchPanel, setShowPatchPanel] = useState<boolean>(false);
  const [patchedFirstHalfStart, setPatchedFirstHalfStart] = useState<number | null>(null);
  const [patchedSecondHalfStart, setPatchedSecondHalfStart] = useState<number | null>(null);
  const [patchedFirstHalfDuration, setPatchedFirstHalfDuration] = useState<number | null>(null);
  const [patchedSecondHalfDuration, setPatchedSecondHalfDuration] = useState<number | null>(null);
  
  // Nuevos estados para worst cases y sprints
  const [worstCases, setWorstCases] = useState<WorstCase[]>([]);
  const [sprintsInWorstCases, setSprintsInWorstCases] = useState<SprintInWorstCase[]>([]);
  const [loadingWorstCases, setLoadingWorstCases] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [showWorstCases, setShowWorstCases] = useState(false);
  const [showSprints, setShowSprints] = useState(false);
  const [hoverPlayer, setHoverPlayer] = useState<string | null>(null);
  // derivedBaseTime must be declared above; move memo below its declaration
  let playerHighlights = React.useMemo(()=>{
    const norm = (s: string) => (s||'').trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .toLowerCase();
    const parseTimeToSec = (t?: string | null) => {
      if (!t) return 0;
      const m = t.match(/^(\d{2}):(\d{2}):(\d{2})(?:[\.,](\d+))?/);
      if (!m) return 0;
      const h = parseInt(m[1]||'0',10); const mi = parseInt(m[2]||'0',10); const s = parseInt(m[3]||'0',10);
      return h*3600 + mi*60 + s;
    };
    const derived = (entries && entries.length > 0) ? entries.map(e=>e.time).filter(Boolean).sort()[0] : null;
    const baseOffset = parseTimeToSec(baseTime || derived || null);
    const map: Record<string, Array<{start:number; end:number; distance?: number}>> = {};
    for (const wc of worstCases) {
      const key = norm(wc.player_display_name || '');
      const start = (wc.start_second || 0) - baseOffset;
      const end = (wc.end_second || 0) - baseOffset;
      (map[key] ||= []).push({ start, end, distance: wc.distance_covered });
    }
    return map;
  }, [worstCases, baseTime, entries]);

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
  // GPS cursor second (same logic used for AvgSpeedChart) to drive live positions window
  const gpsCursorSecond = React.useMemo(() => {
    const p = periods;
    const kickoff = kickoffSpike ?? 0;
    const t = videoTimeSec;
    const fhStartPatched = patchedFirstHalfStart ?? p?.detected_first_half_start ?? kickoff;
    const shStartPatched = patchedSecondHalfStart ?? p?.detected_second_half_start ?? undefined;
    const fhDurPatched = patchedFirstHalfDuration ?? (p && p.detected_first_half_end !== undefined ? Math.max(0, (p.detected_first_half_end as number) - fhStartPatched) : undefined);
    if (!p) return kickoff + t;
    if (typeof shStartPatched === 'number' && typeof fhDurPatched === 'number') {
      const firstHalfDuration = Math.max(0, fhDurPatched);
      if (t <= firstHalfDuration) return fhStartPatched + t;
      return shStartPatched + (t - firstHalfDuration);
    }
    return fhStartPatched + t;
  }, [periods, kickoffSpike, videoTimeSec, patchedFirstHalfStart, patchedSecondHalfStart, patchedFirstHalfDuration]);

  const { snapshot: livePositions, loading: loadingPositions } = usePositionsWindow(
    API_BASE,
    selectedTable || null,
    gpsCursorSecond,
    15,
  );

  // Pinned popups shared between list and map
  const [pinnedPlayers, setPinnedPlayers] = useState<Record<string, boolean>>({});
  const togglePinned = React.useCallback((name: string) => {
    setPinnedPlayers(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);
  const [mapStacked, setMapStacked] = useState<boolean>(true);
  const [mapBearing, setMapBearing] = useState<number>(0);
  const [showInfo, setShowInfo] = useState<boolean>(true);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(true);

  // Initialize patch values whenever detected periods load/update
  useEffect(() => {
    if (!periods) return;
    const fh = periods.detected_first_half_start ?? null;
    const sh = periods.detected_second_half_start ?? null;
    setPatchedFirstHalfStart(typeof fh === 'number' ? fh : null);
    setPatchedSecondHalfStart(typeof sh === 'number' ? sh : null);
    const fe = periods.detected_first_half_end ?? null;
    setPatchedFirstHalfDuration(fh !== null && fe !== null ? Math.max(0, Math.floor(fe - fh)) : null);
    const se = periods.detected_second_half_end ?? null;
    setPatchedSecondHalfDuration(sh !== null && se !== null ? Math.max(0, Math.floor(se - sh)) : null);
  }, [periods?.detected_first_half_start, periods?.detected_second_half_start]);


  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} p-4 md:p-6 space-y-4`}>
      <TopProgress active={loadingEntries || loadingPeriods || loadingWorstCases || loadingSprints} />
      <div className="mb-3" />
      <div className="space-y-4">        
          
          {activeTab === 'overview' && (
            <>
              <button
                onClick={()=>setShowInfo(v=>!v)}
                className="w-full mt-2 flex items-center justify-between rounded-md bg-zinc-900/60 border border-zinc-800 px-3 py-2 hover:border-zinc-700 transition text-zinc-200"
                aria-expanded={showInfo}
              >
                <span className="text-base font-semibold">Match info</span>
                <svg className={`w-4 h-4 ml-3 transition-transform ${showInfo ? 'rotate-0' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>
              <div style={{maxHeight: showInfo ? '2000px' : '0px'}} className="transition-[max-height] duration-300 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3">
                <div className="md:col-span-3 h-full">
                  <Card className="h-full bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[660px] md:h-[760px]">
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
                  <Card className="h-full bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle>Periods
                    {loadingPeriods && (
                      <Spinner />
                    )}
                    </CardTitle>
                    {!loadingPeriods && periods && (
                      <div className="text-xs text-gray-500">{autoData.periods?.using_manual ? 'Using patched periods' : 'Using detected periods'}</div>
                    )}
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
                  <Card className="h-full bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle>Stadium</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <StadiumMap
                        latitude={-34.795334}
                        longitude={-56.147974}
                        zoom={15}
                        styleUrl={`https://api.maptiler.com/maps/streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY || ''}`}
                      />
                  </CardContent>
                  </Card>
                </div>
              </div>
              </div>
              <button
                onClick={()=>setShowAnalysis(v=>!v)}
                className="w-full mt-6 flex items-center justify-between rounded-md bg-zinc-900/60 border border-zinc-800 px-3 py-2 hover:border-zinc-700 transition text-zinc-200"
                aria-expanded={showAnalysis}
              >
                <span className="text-base font-semibold">Analysis</span>
                <svg className={`w-4 h-4 ml-3 transition-transform ${showAnalysis ? 'rotate-0' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>
              <div style={{maxHeight: showAnalysis ? '4000px' : '0px'}} className="transition-[max-height] duration-300 overflow-hidden">
              <div className={`grid gap-4 mt-3 ${showPatchPanel ? 'grid-cols-1 md:grid-cols-6' : 'grid-cols-1'}`}>
                <Card className={`${showPatchPanel ? 'md:col-span-5' : ''} bg-zinc-900/50 border-zinc-800`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Average Speed Over Time
                      {loadingEntries&&(
                        <Spinner />
                      )}

                    {!showPatchPanel && (
                      <div className="ml-auto justify-end">
                        <Button variant={'outline'} onClick={()=>setShowPatchPanel(true)}>
                          Edit Periods
                        </Button>
                      </div>
                    )}
                    </CardTitle>
                    
                    <div className="ml-auto">
                      <div className="relative" style={{ height: 0 }}>
                        <div className="absolute right-3 -top-4">
                          <ThresholdLegend thresholds={thresholds} inChart vertical className="min-w-[300px]" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingEntries ? (                      
                      <Skeleton className="h-[360px]" />
                    ) : entries.length === 0 || !periods ? (
                      <div className="text-sm text-gray-600">No data to display.</div>
                    ) : (
                      <>
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
                            const fhStartPatched = patchedFirstHalfStart ?? p?.detected_first_half_start ?? kickoff;
                            const shStartPatched = patchedSecondHalfStart ?? p?.detected_second_half_start ?? undefined;
                            const fhDurPatched = patchedFirstHalfDuration ?? (p && p.detected_first_half_end !== undefined ? Math.max(0, (p.detected_first_half_end as number) - fhStartPatched) : undefined);
                            if (!p) return kickoff + t;
                            if (typeof shStartPatched === 'number' && typeof fhDurPatched === 'number') {
                              const firstHalfDuration = Math.max(0, fhDurPatched);
                              if (t <= firstHalfDuration) return fhStartPatched + t;
                              return shStartPatched + (t - firstHalfDuration);
                            }
                            return fhStartPatched + t;
                          })()}
                          patchedFirstHalfStart={patchedFirstHalfStart}
                          patchedSecondHalfStart={patchedSecondHalfStart}
                        />

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-2">
                            {/* Automatically choose player via query params: ?yt=<id> or ?video=<url> */}
                            <UnifiedVideo
                              youtubeId={searchParams.get('yt')}
                              videoUrl={searchParams.get('video')}
                              onSecondChange={handleVideoSecondChange}
                            />
                          </div>
                          <div className="p-2">
                            <div className="h-[660px] md:h-[760px]">
                              <div className="sticky top-0 z-20 bg-zinc-900/80 backdrop-blur rounded-md px-3 mb-2 shadow-sm border border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 py-2">
                                  <label className="text-xs text-zinc-400">Orientation</label>
                                  <input type="range" min={-180} max={180} value={mapBearing} onChange={(e)=>setMapBearing(parseFloat(e.target.value))} className="w-44" />
                                  <span className="ml-1 text-xs w-10 text-right text-zinc-300">{mapBearing}°</span>
                                </div>
                                <Button variant={'ghost'} size={'sm'} onClick={()=>setMapStacked(v=>!v)}>Toggle layout</Button>
                              </div>
                              {(!selectedTable || !periods) ? (
                                <div className="text-sm text-gray-600">Select a match to view players and positions.</div>
                              ) : (
                                <div className={mapStacked ? 'flex flex-col h-full gap-3' : 'grid grid-cols-5 gap-3 h-full'}>
                                  <div className={mapStacked ? 'flex-1 min-h-0 relative z-0' : 'col-span-4 h-full relative z-0'}>
                                    <PitchMap
                                      points={livePositions}
                                      styleObj={{
                                        version: 8,
                                        sources: {
                                          google: {
                                            type: 'raster',
                                            tiles: [
                                              `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}`
                                            ],
                                            tileSize: 256,
                                            attribution: '© Google'
                                          }
                                        },
                                        layers: [
                                          { id: 'google', type: 'raster', source: 'google' }
                                        ]
                                      }}
                                      pinned={pinnedPlayers}
                                      onToggle={togglePinned}
                                      heightClass={'h-full'}
                                      heightStyle={mapStacked ? undefined : undefined}
                                      bearing={mapBearing}
                                    />
                                  </div>
                                  <div className={mapStacked ? 'h-28 md:h-32 overflow-y-auto relative z-10' : 'col-span-1 h-full overflow-y-auto relative z-10'}>
                                    {loadingPlayers ? (
                                      <Spinner />
                                    ) : players.length === 0 ? (
                                      <div className="text-sm text-gray-600">No players found.</div>
                                    ) : (
                                      <div className={mapStacked ? 'flex flex-wrap gap-2 items-start' : 'flex flex-col gap-2'}>
                                        {players.map((player, index) => {
                                          const { base, border } = stringToColorPair(player || "");
                                          const active = !!pinnedPlayers[player];
                                          return (
                                            <button
                                              key={index}
                                              onClick={() => togglePinned(player)}
                                              className={`inline-flex items-center gap-1 rounded-md text-[12px] transition-all duration-300 ease-in-out`}
                                              style={{
                                                background: active ? base : '#27272a',
                                                color: active ? '#fff' : '#d4d4d8',
                                                padding: '3px 8px',
                                              }}
                                              title={player}
                                            >
                                              <span
                                                className="inline-block rounded-full"
                                                style={{ width: 6, height: 6, background: active ? '#fff' : base, border: `2px solid ${border}` }}
                                              />
                                              <span className={mapStacked ? 'truncate max-w-[120px]' : ''}>{player}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                {showPatchPanel && (
                  <Card className="md:col-span-1 bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle>Periods Editor</CardTitle>
                      <div className="ml-auto">
                        <Button variant={'secondary'} onClick={()=>setShowPatchPanel(false)}>Close Editor</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!periods ? (
                        <div className="text-sm text-gray-600">No detected periods yet.</div>
                      ) : (
                        <div className="space-y-4 text-sm">
                          <div>
                            <div className="font-medium mb-1">Detected first half start</div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded bg-zinc-100">sec: {periods.detected_first_half_start ?? '—'}</span>
                              <span className="px-2 py-1 rounded bg-zinc-100">time: {toAbsFromUtils(baseTime || null, periods.detected_first_half_start)}</span>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium mb-1">Detected second half start</div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded bg-zinc-100">sec: {periods.detected_second_half_start ?? '—'}</span>
                              <span className="px-2 py-1 rounded bg-zinc-100">time: {toAbsFromUtils(baseTime || null, periods.detected_second_half_start)}</span>
                            </div>
                          </div>
                          <hr />
                          <div>
                            <div className="font-medium mb-1">Patched first half start (sec)</div>
                            <input
                              type="number"
                              className="w-full border rounded px-2 py-1"
                              value={patchedFirstHalfStart ?? ''}
                              onChange={(e)=>setPatchedFirstHalfStart(e.target.value === '' ? null : Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <div className="font-medium mb-1">Patched second half start (sec)</div>
                            <input
                              type="number"
                              className="w-full border rounded px-2 py-1"
                              value={patchedSecondHalfStart ?? ''}
                              onChange={(e)=>setPatchedSecondHalfStart(e.target.value === '' ? null : Number(e.target.value))}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant={'outline'} onClick={()=>{
                              setPatchedFirstHalfStart(periods.detected_first_half_start ?? null);
                              setPatchedSecondHalfStart(periods.detected_second_half_start ?? null);
                              const fh = periods.detected_first_half_start ?? null;
                              const fe = periods.detected_first_half_end ?? null;
                              setPatchedFirstHalfDuration(fh !== null && fe !== null ? Math.max(0, Math.floor(fe - fh)) : null);
                              const sh = periods.detected_second_half_start ?? null;
                              const se = periods.detected_second_half_end ?? null;
                              setPatchedSecondHalfDuration(sh !== null && se !== null ? Math.max(0, Math.floor(se - sh)) : null);
                            }}>Reset to detected</Button>
                            <Button
                              onClick={async()=>{
                                if (!selectedTable) return;
                                const body = {
                                  match_name: selectedTable,
                                  manual_first_half_start: patchedFirstHalfStart,
                                  manual_second_half_start: patchedSecondHalfStart,
                                  first_half_duration_sec: patchedFirstHalfDuration,
                                  second_half_duration_sec: patchedSecondHalfDuration,
                                };
                                try {
                                  await fetch(`${API_BASE}/match/table/${selectedTable}/periods/patch`,{
                                    method:'POST',
                                    headers:{'Content-Type':'application/json'},
                                    body: JSON.stringify(body)
                                  });
                                } catch (e) { /* ignore */ }
                              }}
                            >Save patched</Button>
                          </div>
                          <hr />
                          <div>
                            <div className="font-medium mb-1">First half duration (mm:ss)</div>
                            <input
                              type="text"
                              placeholder="45:00"
                              className="w-full border rounded px-2 py-1"
                              value={formatMmSsFromSeconds(patchedFirstHalfDuration)}
                              onChange={(e)=> setPatchedFirstHalfDuration(parseMmSsToSeconds(e.target.value))}
                            />
                          </div>
                          <div>
                            <div className="font-medium mb-1">Second half duration (mm:ss)</div>
                            <input
                              type="text"
                              placeholder="45:00"
                              className="w-full border rounded px-2 py-1"
                              value={formatMmSsFromSeconds(patchedSecondHalfDuration)}
                              onChange={(e)=> setPatchedSecondHalfDuration(parseMmSsToSeconds(e.target.value))}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              
              </div>
            </>
          )}

          {selectedTable && activeTab === 'players' && (
            <div className="grid gap-4 items-start">
              <div className="md:col-span-3 space-y-3">
                {(() => {
                  const norm = (s: string) => (s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase();
                  const byPlayer: Record<string, typeof entries> = {} as any;
                  entries.forEach(e => { (byPlayer[e.player_display_name] ||= []).push(e); });
                  Object.keys(byPlayer).forEach(k => byPlayer[k].sort((a,b)=>a.centralized_elapsed_time-b.centralized_elapsed_time));
                  const sprintByPlayer: Record<string, typeof sprintsInWorstCases> = {} as any;
                  sprintsInWorstCases.forEach(s => { (sprintByPlayer[s.player_display_name] ||= []).push(s); });
                  const order = Object.keys(byPlayer);
                  return order.map(p => (
                    <PlayerDetailCard
                      key={p}
                      name={p}
                      entries={byPlayer[p]}
                      windows={playerHighlights[norm(p)]}
                      sprints={sprintByPlayer[p]}
                    />
                  ));
                })()}
              </div>
            </div>
          )}

          {selectedTable && activeTab === 'players' && (
            <Card className="col-span-2 bg-zinc-900/50 border-zinc-800">
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
      </div>
    </main>
  );
} 