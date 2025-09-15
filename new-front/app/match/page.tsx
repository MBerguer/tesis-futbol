"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMatchContext } from "./context";
import { useMatchData } from "./hooks/useMatchData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PeriodsSummary from "./components/PeriodsSummary";
import PlayersChart from "./components/PlayersChart";
import AvgSpeedChart from "./components/AvgSpeedChart";
import WorstCasesTable from "./components/WorstCasesTable";
import SprintsTable from "./components/SprintsTable";
import Skeleton from "./components/Skeleton";
import TopProgress from "./components/TopProgress";
import ThresholdLegend from "./components/ThresholdLegend";
import PlayerMiniList from "./components/PlayerMiniList";
import PlayerDetailCard from "./components/PlayerDetailCard";
import UnifiedVideo from "./components/UnifiedVideo";
import StadiumMap from "./components/StadiumMap";
import PitchMap from "./components/PitchMap";
import Spinner from "./components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

  interface MatchDetails {
  match_id: string;
  competition_id: string | null;
  competition_name?: string | null;
  match_date: string;
  venue_id: string | null;
  venue_name?: string | null;
  venue_city?: string | null;
  venue_latitude?: number | null;
  venue_longitude?: number | null;
  category: string | null;
  home_team_id: string;
  away_team_id: string;
  result_home: number;
  result_away: number;
  youtube_link: string | null;
  notes: string | null;
  source_pdf_hash: string | null;
  parse_confidence: number | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
}

export default function Page() {
  const searchParams = useSearchParams();
  const { reloadToken: globalReloadToken, selectedTable: selectedTableFromContext, setSelectedTable } = useMatchContext();
  const selectedTable = selectedTableFromContext ?? searchParams.get('table');
  const selectedMatchId = searchParams.get('match');
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [matchDetailsLoading, setMatchDetailsLoading] = useState<boolean>(false);
  const [matchDetailsError, setMatchDetailsError] = useState<string | null>(null);
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
  const [youtubeLink, setYoutubeLink] = useState<string | null>(null);
  const handleVideoSecondChange = React.useCallback((s: number)=> setVideoTimeSec(s), []);
  const [showPatchPanel, setShowPatchPanel] = useState<boolean>(false);
  const [patchedFirstHalfStart, setPatchedFirstHalfStart] = useState<number | null>(null);
  const [patchedSecondHalfStart, setPatchedSecondHalfStart] = useState<number | null>(null);
  const [patchedFirstHalfDuration, setPatchedFirstHalfDuration] = useState<number | null>(null);
  const [patchedSecondHalfDuration, setPatchedSecondHalfDuration] = useState<number | null>(null);
  
  const [worstCases, setWorstCases] = useState<WorstCase[]>([]);
  const [sprintsInWorstCases, setSprintsInWorstCases] = useState<SprintInWorstCase[]>([]);
  const [loadingWorstCases, setLoadingWorstCases] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [showWorstCases, setShowWorstCases] = useState(false);
  const [showSprints, setShowSprints] = useState(false);
  const [hoverPlayer, setHoverPlayer] = useState<string | null>(null);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [lineupMinutes, setLineupMinutes] = useState<any[]>([]);
  const [loadingLineup, setLoadingLineup] = useState<boolean>(false);
  const [eventsTab, setEventsTab] = useState<'events'|'lineup'>('events');
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

    const halftimeStart = (periods?.detected_first_half_end?? periods?.detected_halftime_start) ?? null;
    const halftimeEnd = (periods?.detected_second_half_start ?? periods?.detected_halftime_end) ?? null;
    const halftimeDuration = (halftimeStart !== null && halftimeEnd !== null) ? Math.max(0, halftimeEnd - halftimeStart) : 0;

    const map: Record<string, Array<{start:number; end:number; distance?: number, start_adj: number, end_adj: number, start_abs: number, end_abs: number}>> = {};
    for (const wc of worstCases) {
      const key = norm(wc.player_display_name || '');
      const start = (wc.start_second || 0) - baseOffset;
      const end = (wc.end_second || 0) - baseOffset;
      const startAbs = wc.start_second || 0;
      const endAbs = wc.end_second || 0;
      const halftimeAdj = (halftimeEnd !== null && startAbs >= halftimeEnd) ? halftimeDuration : 0;
      const start_adj = (startAbs - baseOffset) - halftimeAdj;
      const end_adj = (endAbs - baseOffset) - halftimeAdj;
      (map[key] ||= []).push({ start, end, distance: wc.distance_covered, start_adj, end_adj, start_abs: startAbs, end_abs: endAbs });
    }
    return map;
  }, [worstCases, baseTime, entries, periods]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [reloadToken, setReloadToken] = useState<number>(0);
  
  // Resolve table from match id if needed
  useEffect(() => {
    if (selectedTable) return; // already set via query or context
    const matchId = selectedMatchId;
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/match/by-id/${matchId}/table`);
        if (!res.ok) return;
        const data = await res.json();
        const table = data?.table as string | null;
        if (!cancelled && table) {
          setSelectedTable?.(table);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [API_BASE, selectedMatchId, selectedTable, setSelectedTable]);

  // Fetch match details (incl. youtube link) when match id is present
  useEffect(() => {
    const matchId = selectedMatchId;
    if (!matchId) { setYoutubeLink(null); setMatchDetails(null); setMatchDetailsError(null); setMatchDetailsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setMatchDetailsLoading(true);
        setMatchDetailsError(null);
        const res = await fetch(`${API_BASE}/api/matches/${matchId}`);
        if (!res.ok) {
          const txt = await res.text().catch(()=>"error");
          console.error('Failed to fetch match details', res.status, txt);
          // Fallback: fetch list and pick the item by id
          try {
            const resList = await fetch(`${API_BASE}/api/matches`);
            if (resList.ok) {
              const arr: MatchDetails[] = await resList.json();
              const found = Array.isArray(arr) ? arr.find(m => m.match_id === matchId) : null;
              if (!cancelled && found) {
                setMatchDetails(found);
                setYoutubeLink(found.youtube_link || null);
                setMatchDetailsError(null);
                return;
              }
            }
          } catch (e2) {
            console.error('Fallback list fetch failed', e2);
          }
          if (!cancelled) setMatchDetailsError(`HTTP ${res.status}: ${txt}`);
          return;
        }
        const data: MatchDetails = await res.json();
        if (!cancelled) {
          setMatchDetails(data);
          setYoutubeLink(data?.youtube_link || null);
        }
      } catch (e) { 
        console.error('Error fetching match details', e);
        if (!cancelled) { setYoutubeLink(null); setMatchDetailsError('Network error'); }
      } finally {
        if (!cancelled) setMatchDetailsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [API_BASE, selectedMatchId]);

  useEffect(() => {
    const id = selectedMatchId;
    if (!id) { setMatchEvents([]); setLineupMinutes([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoadingEvents(true);
        const res = await fetch(`${API_BASE}/api/matches/${id}/events`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setMatchEvents(Array.isArray(data?.events) ? data.events : []);
        } else { if (!cancelled) setMatchEvents([]); }
      } finally { if (!cancelled) setLoadingEvents(false); }
    })();
    (async () => {
      try {
        setLoadingLineup(true);
        const res = await fetch(`${API_BASE}/api/matches/${id}/lineup`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setLineupMinutes(Array.isArray(data?.lineup) ? data.lineup : []);
        } else { if (!cancelled) setLineupMinutes([]); }
      } finally { if (!cancelled) setLoadingLineup(false); }
    })();
    return () => { cancelled = true; };
  }, [API_BASE, selectedMatchId]);
  
  const autoData = useMatchData(API_BASE, (selectedTable || null), reloadToken + globalReloadToken);
  const entriesAuto = autoData.entries;
  const periodsAuto = autoData.periods;
  const thresholdsAuto = autoData.thresholds;
  const kickoffSpikeAuto = autoData.kickoffSpike;
  const baseTimeAuto = autoData.baseTime;
  const worstCasesAuto = autoData.worstCases;
  const sprintsAuto = autoData.sprints;
  const loadingDetectAuto = autoData.loadingDetect;
  const loadingEntriesAuto = autoData.loadingEntries;

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
      } finally {
        setLoadingPlayers(false);
      }
    })();
    return () => controller.abort();
  }, [API_BASE, selectedTable]);

  const derivedBaseTime = React.useMemo(() => {
    if (!entries || entries.length === 0) return null as string | null;
    const t = entries
      .map(e => e.time)
      .filter(Boolean)
      .sort()[0];
    return t || null;
  }, [entries]);

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

  const googleRasterStyle = React.useMemo(() => ({
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
  }), []);

  const playersGrouped = React.useMemo(() => {
    const byPlayer: Record<string, typeof entries> = {} as any;
    entries.forEach(e => { (byPlayer[e.player_display_name] ||= []).push(e); });
    Object.keys(byPlayer).forEach(k => byPlayer[k].sort((a,b)=>a.centralized_elapsed_time-b.centralized_elapsed_time));
    return byPlayer;
  }, [entries]);

  const sprintsGrouped = React.useMemo(() => {
    const sprintByPlayer: Record<string, typeof sprintsInWorstCases> = {} as any;
    sprintsInWorstCases.forEach(s => { (sprintByPlayer[s.player_display_name] ||= []).push(s); });
    return sprintByPlayer;
  }, [sprintsInWorstCases]);

  const orderedPlayers = React.useMemo(() => Object.keys(playersGrouped), [playersGrouped]);
  const [playersRenderLimit, setPlayersRenderLimit] = React.useState<number>(10);

  const [pinnedPlayers, setPinnedPlayers] = useState<Record<string, boolean>>({});
  const togglePinned = React.useCallback((name: string) => {
    setPinnedPlayers(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);
  const [mapStacked, setMapStacked] = useState<boolean>(true);
  const [mapBearing, setMapBearing] = useState<number>(0);
  const [showInfo, setShowInfo] = useState<boolean>(true);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(true);
  const [showPlayersSection, setShowPlayersSection] = useState<boolean>(false);
  
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
      <div className="space-y-4">
      <TopProgress active={loadingEntries || loadingPeriods || loadingWorstCases || loadingSprints} />
      <div className="mb-3" />
      <div className="space-y-4">        
          
            <button
              onClick={()=>setShowInfo(v=>!v)}
              className="w-full mt-2 flex items-center justify-between rounded-md bg-zinc-900/60 border border-zinc-800 px-3 py-2 hover:border-zinc-700 transition text-zinc-200"
              aria-expanded={showInfo}
            >
              <span className="text-base font-semibold">Match info</span>
              <svg className={`w-4 h-4 ml-3 transition-transform ${showInfo ? 'rotate-0' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
            </button>
            <div style={{maxHeight: showInfo ? '2000px' : '0px'}} className="transition-[max-height] duration-300 overflow-hidden">
            {showInfo && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3">
              <div className="md:col-span-4 h-full">
                <Card className="h-full bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="h-[660px] md:h-[760px]">
                  {!selectedMatchId ? (
                    <div className="text-sm text-gray-600">Select a match to view details.</div>
                  ) : matchDetailsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5" />
                    </div>
                  ) : matchDetailsError ? (
                    <div className="text-sm text-red-400">Failed to load match details. {matchDetailsError}</div>
                  ) : (
                    matchDetails == null ? (
                      <div className="text-sm text-gray-600">No info.</div>
                    ) : (() => { const md = matchDetails as MatchDetails; return (
                      <div className="space-y-2 text-sm">
                        <p className="text-lg font-semibold">
                          {(md.home_team_name || (md.home_team_id?.slice(0,8)+"…"))} vs {(md.away_team_name || (md.away_team_id?.slice(0,8)+"…"))}
                        </p>
                        <p>
                          <span className="text-zinc-400">Date:</span> {md.match_date ? new Date(md.match_date).toLocaleString() : 'No info'}
                        </p>
                        <p>
                          <span className="text-zinc-400">Competition:</span> {md.competition_name || 'No info'}
                        </p>                        
                        <p>
                          <span className="text-zinc-400">Venue:</span> {md.venue_name ? `${md.venue_name}${md.venue_city ? ' · ' + md.venue_city : ''}` : 'No info'}
                        </p>
                        <p>
                          <span className="text-zinc-400">Result:</span> {md.result_home} - {md.result_away}
                        </p>
                        <p>
                          <span className="text-zinc-400">YouTube:</span> {md.youtube_link ? (<a href={md.youtube_link} className="underline" target="_blank" rel="noreferrer">{md.youtube_link}</a>) : 'No info'}
                        </p>
                        <hr className="border-zinc-800" />
                        <p>
                          <span className="text-zinc-400">Home team:</span> {md.home_team_name || 'No info'}
                        </p>
                        <p>
                          <span className="text-zinc-400">Away team:</span> {md.away_team_name || 'No info'}
                        </p>                        
                        <p>
                          <span className="text-zinc-400">Parse confidence:</span> {md.parse_confidence ?? 'No info'}
                        </p>
                        <p>
                          <span className="text-zinc-400">Source PDF hash:</span> {md.source_pdf_hash || 'No info'}
                        </p>
                        <p>
                          <span className="text-zinc-400">Notes:</span> {md.notes || 'No info'}
                        </p>
                        <div className="mt-3" />
                        <div>
                          <div className="text-sm font-semibold mb-2">Stadium</div>
                          <div className="rounded-md overflow-hidden border border-zinc-800">
                            <StadiumMap
                              latitude={(md.venue_latitude ?? -34.795334) as number}
                              longitude={(md.venue_longitude ?? -56.147974) as number}
                              zoom={15}
                              styleUrl={`https://api.maptiler.com/maps/streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY || ''}`}
                            />
                          </div>
                        </div>
                      </div>
                    ); })()
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

              <div className="md:col-span-4 h-full">
                <Card className="h-full bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <button onClick={()=>setEventsTab('events')} className={`px-3 py-1.5 rounded border ${eventsTab==='events'?'border-zinc-600 bg-zinc-800 text-zinc-100':'border-zinc-800 text-zinc-300 hover:border-zinc-700'}`}>Events</button>
                      <button onClick={()=>setEventsTab('lineup')} className={`px-3 py-1.5 rounded border ${eventsTab==='lineup'?'border-zinc-600 bg-zinc-800 text-zinc-100':'border-zinc-800 text-zinc-300 hover:border-zinc-700'}`}>Lineup minutes</button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {eventsTab === 'events' ? (
                      (!selectedMatchId || loadingEvents) ? (
                        <div className="space-y-2">
                          <Skeleton className="h-5" />
                          <Skeleton className="h-5" />
                          <Skeleton className="h-5" />
                        </div>
                      ) : matchEvents.length === 0 ? (
                        <div className="text-sm text-gray-600">No events.</div>
                      ) : (
                        <div className="space-y-1 text-sm">
                          {matchEvents.map((ev: any) => (
                            <div key={ev.event_id} className="flex items-start gap-2 py-1 px-2 rounded border border-zinc-800">
                              <div className="w-16 text-zinc-400">{ev.minute}{typeof ev.added_time === 'number' ? `+${ev.added_time}` : ''}'</div>
                              <div className="flex-1">
                                <div><span className="text-zinc-300">{ev.team_name}</span> · <span className="uppercase text-xs px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700">{ev.type}</span></div>
                                <div className="text-zinc-400">
                                  {ev.jugador || ''}
                                  {ev.related_jugador ? ` ↔ ${ev.related_jugador}` : ''}
                                  {ev.assist_jugador ? ` (assist: ${ev.assist_jugador})` : ''}
                                  {ev.reason ? ` – ${ev.reason}` : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      (!selectedMatchId || loadingLineup) ? (
                        <div className="space-y-2">
                          <Skeleton className="h-5" />
                          <Skeleton className="h-5" />
                          <Skeleton className="h-5" />
                        </div>
                      ) : lineupMinutes.length === 0 ? (
                        <div className="text-sm text-gray-600">No lineup data.</div>
                      ) : (
                        <div className="text-sm space-y-1">
                          {lineupMinutes.map((row: any) => (
                            <div key={row.match_player_id} className="flex items-center justify-between border border-zinc-800 rounded px-2 py-1">
                              <div className="truncate mr-2">
                                <span className="text-zinc-300">{row.team_name}</span> · {row.jugador || '—'} {row.role === 'starter' ? '' : '(sub)'}
                              </div>
                              <div className="text-zinc-400">{row.minutes_played ?? 0} min</div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            )}
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
            {showAnalysis && (
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
                          <UnifiedVideo
                            youtubeId={searchParams.get('yt')}
                            videoUrl={youtubeLink || searchParams.get('video') || undefined}
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
                                    styleObj={googleRasterStyle}
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
                    <div className="ml-auto">
                      <Button variant={'secondary'} onClick={()=>setShowPatchPanel(false)}>Close Editor</Button>
                    </div>
                    <CardTitle>Periods Editor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!periods ? (
                      <div className="text-sm text-gray-600">No detected periods yet.</div>
                    ) : (
                      <div className="space-y-4 text-sm">
                        <div className="space-y-2">
                          <Label className="font-medium text-zinc-300">Detected first half start</Label>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300">sec: {periods.detected_first_half_start ?? '—'}</span>
                            <span className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300">time: {toAbsFromUtils(baseTime || null, periods.detected_first_half_start)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-medium text-zinc-300">Detected second half start</Label>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300">sec: {periods.detected_second_half_start ?? '—'}</span>
                            <span className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300">time: {toAbsFromUtils(baseTime || null, periods.detected_second_half_start)}</span>
                          </div>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="space-y-1">
                          <Label className="font-medium text-zinc-300" htmlFor="fh-start">Patched first half start (sec)</Label>
                          <Input
                            id="fh-start"
                            type="number"
                            className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                            value={patchedFirstHalfStart ?? ''}
                            onChange={(e)=>setPatchedFirstHalfStart(e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-medium text-zinc-300" htmlFor="sh-start">Patched second half start (sec)</Label>
                          <Input
                            id="sh-start"
                            type="number"
                            className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                            value={patchedSecondHalfStart ?? ''}
                            onChange={(e)=>setPatchedSecondHalfStart(e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <Button size={'sm'} variant={'outline'} onClick={()=>{
                            setPatchedFirstHalfStart(periods.detected_first_half_start ?? null);
                            setPatchedSecondHalfStart(periods.detected_second_half_start ?? null);
                            const fh = periods.detected_first_half_start ?? null;
                            const fe = periods.detected_first_half_end ?? null;
                            setPatchedFirstHalfDuration(fh !== null && fe !== null ? Math.max(0, Math.floor(fe - fh)) : null);
                            const sh = periods.detected_second_half_start ?? null;
                            const se = periods.detected_second_half_end ?? null;
                            setPatchedSecondHalfDuration(sh !== null && se !== null ? Math.max(0, Math.floor(se - sh)) : null);
                          }}>Reset to detected</Button>
                          <Button size={'sm'} variant={'default'} className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                        <Separator className="bg-zinc-800" />
                        <div className="space-y-1">
                          <Label className="font-medium text-zinc-300" htmlFor="fh-dur">First half duration (mm:ss)</Label>
                          <Input
                            id="fh-dur"
                            type="text"
                            placeholder="45:00"
                            className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                            value={formatMmSsFromSeconds(patchedFirstHalfDuration)}
                            onChange={(e)=> setPatchedFirstHalfDuration(parseMmSsToSeconds(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-medium text-zinc-300" htmlFor="sh-dur">Second half duration (mm:ss)</Label>
                          <Input
                            id="sh-dur"
                            type="text"
                            placeholder="45:00"
                            className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
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
            )}
            </div>

            
            </div>
          

          <button
            onClick={()=>setShowPlayersSection(v=>!v)}
            className="w-full mt-6 flex items-center justify-between rounded-md bg-zinc-900/60 border border-zinc-800 px-3 py-2 hover:border-zinc-700 transition text-zinc-200"
            aria-expanded={showPlayersSection}
          >
            <span className="text-base font-semibold">Players</span>
            <svg className={`w-4 h-4 ml-3 transition-transform ${showPlayersSection ? 'rotate-0' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
          </button>
          {selectedTable && showPlayersSection && (
            <div className="grid gap-4 items-start">
              <div className="md:col-span-3 space-y-3">
                {orderedPlayers.slice(0, playersRenderLimit).map(p => {
                  const norm = (s: string) => (s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase();
                  return (
                    <PlayerDetailCard
                      key={p}
                      name={p}
                      entries={playersGrouped[p]}
                      windows={playerHighlights[norm(p)]}
                      sprints={sprintsGrouped[p]}
                    />
                  );
                })}
                {orderedPlayers.length > playersRenderLimit && (
                  <div className="flex justify-center mt-2">
                    <Button variant={'outline'} onClick={()=>setPlayersRenderLimit(l=>l+10)}>Load more</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTable && showPlayersSection && (
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
    </main>
  );
}
