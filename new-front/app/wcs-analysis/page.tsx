"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WcsComparisonRow {
  metric: string;
  match_average: number;
  wcs_1min: number;
  increase_1min_pct: number;
}

interface WcsComparisonByPosition {
  position: string;
  match_average: number;
  wcs_1min: number;
  increase_1min_pct: number;
  player_count: number;
}

interface PlayerProfile {
  position: string;
  avg_1min_peak: number;
  total_wcs_events: number;
  player_count: number;
}

interface WcsMatchInfo {
  match_name: string;
  match_date: string | null;
  player_count: number;
  wcs_count: number;
}

interface DetailedEvent {
  match_name: string;
  player_name: string;
  position: string | null;
  start_second: number;
  end_second: number;
  window_duration_sec: number;
  distance_covered: number;
  distance_per_min: number;
  match_minute: number | null;
  match_period: string;
}

const COLOR_PALETTE = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#10b981", // green
  "#f59e0b", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // violet
  "#22c55e", // lime
  "#f97316", // deep orange
  "#6366f1", // indigo
];

const POSITION_TRANSLATIONS: Record<string, string> = {
  "Defensa Central": "Central Defender",
  "Lateral Derecho": "Right Fullback",
  "Lateral Izquierdo": "Left Fullback",
  "Volante Central": "Central Midfielder",
  "Volante Creativo": "Creative Midfielder",
  "Volante Exterior Derecho": "Right External Midfielder",
  "Volante Exterior Izquierdo": "Left External Midfielder",
  "Volante Interior Derecho": "Right Internal Midfielder",
  "Volante Interior Izquierdo": "Left Internal Midfielder",
  Delantero: "Forward",
  Arquero: "Goalkeeper",
  Mediocampista: "Midfielder",
  Defensor: "Defender",
  Atacante: "Attacker",
};

const translatePosition = (position: string): string => {
  return POSITION_TRANSLATIONS[position] || position;
};

const getPositionColorMap = (
  profiles: PlayerProfile[]
): Record<string, string> => {
  const uniquePositions = Array.from(new Set(profiles.map((p) => p.position)));
  const colorMap: Record<string, string> = {};
  uniquePositions.forEach((position, index) => {
    colorMap[position] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  });
  return colorMap;
};

interface PositionTimingStats {
  position: string;
  mean: number;
  stdDev: number;
  events: Array<{ minute: number }>;
  count: number;
}

const calculatePositionTimingStats = (
  events: DetailedEvent[]
): PositionTimingStats[] => {
  // Filter out events without position or match_minute
  const validEvents = events.filter(
    (e) => e.position && e.match_minute !== null
  );

  // Group by position
  const byPosition: Record<string, number[]> = {};
  validEvents.forEach((event) => {
    const pos = event.position!;
    if (!byPosition[pos]) {
      byPosition[pos] = [];
    }
    byPosition[pos].push(event.match_minute!);
  });

  // Calculate stats for each position and translate to English
  const stats: PositionTimingStats[] = [];
  Object.entries(byPosition).forEach(([position, minutes]) => {
    const count = minutes.length;
    const mean = minutes.reduce((sum, m) => sum + m, 0) / count;
    const variance =
      minutes.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    stats.push({
      position: translatePosition(position),
      mean,
      stdDev,
      events: minutes.map((minute) => ({ minute })),
      count,
    });
  });

  // Sort by mean timing
  return stats.sort((a, b) => a.mean - b.mean);
};

export default function WcsAnalysisPage() {
  const [comparisonData, setComparisonData] = useState<WcsComparisonRow[]>([]);
  const [comparisonByPosition, setComparisonByPosition] = useState<
    WcsComparisonByPosition[]
  >([]);
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>([]);
  const [matches, setMatches] = useState<WcsMatchInfo[]>([]);
  const [detailedEvents, setDetailedEvents] = useState<DetailedEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [sortColumn, setSortColumn] = useState<
    "position" | "match_average" | "wcs_1min" | "player_count"
  >("position");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [detailedSortColumn, setDetailedSortColumn] = useState<
    | "match_name"
    | "player_name"
    | "position"
    | "match_minute"
    | "distance_covered"
  >("match_name");
  const [detailedSortDirection, setDetailedSortDirection] = useState<
    "asc" | "desc"
  >("asc");

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSort = (
    column: "position" | "match_average" | "wcs_1min" | "player_count"
  ) => {
    console.log("Sorting by:", column);
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleDetailedSort = (
    column:
      | "match_name"
      | "player_name"
      | "position"
      | "match_minute"
      | "distance_covered"
  ) => {
    console.log("Sorting detailed by:", column);
    if (detailedSortColumn === column) {
      setDetailedSortDirection(
        detailedSortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setDetailedSortColumn(column);
      setDetailedSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    const filtered = comparisonByPosition.filter((row) => row.wcs_1min > 0);
    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortColumn === "position") {
        aVal = translatePosition(a.position);
        bVal = translatePosition(b.position);
      } else {
        aVal = a[sortColumn];
        bVal = b[sortColumn];
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
  }, [comparisonByPosition, sortColumn, sortDirection]);

  const sortedDetailedEvents = useMemo(() => {
    return [...detailedEvents].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;

      switch (detailedSortColumn) {
        case "match_name":
          aVal = a.match_name;
          bVal = b.match_name;
          break;
        case "player_name":
          aVal = a.player_name;
          bVal = b.player_name;
          break;
        case "position":
          aVal = a.position || "";
          bVal = b.position || "";
          break;
        case "match_minute":
          aVal = a.match_minute ?? -1;
          bVal = b.match_minute ?? -1;
          break;
        case "distance_covered":
          aVal = a.distance_covered;
          bVal = b.distance_covered;
          break;
        default:
          return 0;
      }

      // Handle null values
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return detailedSortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return detailedSortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
  }, [detailedEvents, detailedSortColumn, detailedSortDirection]);

  const fetchAllData = async () => {
    setLoading(true);
    setLoadingProfiles(true);
    setLoadingEvents(true);

    try {
      const [compRes, compByPosRes, profilesRes, matchesRes, eventsRes] =
        await Promise.all([
          fetch(`${API_BASE}/wcs/comparison-data`),
          fetch(`${API_BASE}/wcs/comparison-by-position`),
          fetch(`${API_BASE}/wcs/player-profiles`),
          fetch(`${API_BASE}/wcs/matches-info`),
          fetch(`${API_BASE}/wcs/detailed-events`),
        ]);

      const compJson = await compRes.json();
      setComparisonData(compJson.data || []);

      const compByPosJson = await compByPosRes.json();
      setComparisonByPosition(compByPosJson.data || []);
      setLoading(false);

      const profilesJson = await profilesRes.json();
      console.log("WCS Profiles from backend:", profilesJson.data);
      setPlayerProfiles(profilesJson.data || []);
      setLoadingProfiles(false);

      const matchesJson = await matchesRes.json();
      setMatches(matchesJson.matches || []);

      const eventsJson = await eventsRes.json();
      setDetailedEvents(eventsJson.events || []);
      setLoadingEvents(false);
    } catch (error) {
      console.error("Error fetching WCS data:", error);
      setLoading(false);
      setLoadingProfiles(false);
      setLoadingEvents(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Worst Case Scenario Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Peak physical demands during the most intense match periods
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Overview</CardTitle>
          <CardDescription>
            Summary statistics for the WCS analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Available Matches</label>
              <div className="mt-1 px-3 py-2 bg-muted rounded-md">
                <span className="text-2xl font-bold">{matches.length}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Total WCS Events</label>
              <div className="mt-1 px-3 py-2 bg-muted rounded-md">
                <span className="text-2xl font-bold">
                  {matches.reduce((sum, m) => sum + m.wcs_count, 0)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quantifying Peak Demands vs. Match Averages</CardTitle>
          <CardDescription>
            Comparison of match average demands with 1-minute Worst Case
            Scenario peaks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comparisonData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Metric</th>
                    <th className="p-3 font-semibold text-right">
                      Match Average
                    </th>
                    <th className="p-3 font-semibold text-right">
                      WCS (1-min Peak)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row) => (
                    <tr key={row.metric} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{row.metric} (m/min)</td>
                      <td className="p-3 text-right">
                        {row.match_average.toFixed(1)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold">
                            {row.wcs_1min.toFixed(1)}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            +{row.increase_1min_pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peak Demands by Position</CardTitle>
          <CardDescription>
            Comparison of match average demands vs. WCS peaks grouped by playing
            position
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comparisonByPosition.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th
                      className="p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("position")}
                    >
                      <div className="flex items-center gap-1">
                        Position
                        {sortColumn === "position" && (
                          <span className="text-xs">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="p-3 font-semibold text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("match_average")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Match Average (HSR {"\u2265"} 19.8 km/h) (m/min)
                        {sortColumn === "match_average" && (
                          <span className="text-xs">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="p-3 font-semibold text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("wcs_1min")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        WCS Peak (HSR {"\u2265"} 19.8 km/h) (m/min)
                        {sortColumn === "wcs_1min" && (
                          <span className="text-xs">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="p-3 font-semibold text-center cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("player_count")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Players
                        {sortColumn === "player_count" && (
                          <span className="text-xs">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row) => (
                    <tr
                      key={row.position}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="p-3 font-medium">
                        {translatePosition(row.position)}
                      </td>
                      <td className="p-3 text-right">
                        {row.match_average.toFixed(1)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold">
                            {row.wcs_1min.toFixed(1)}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            +{row.increase_1min_pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">{row.player_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positional Analysis: Peak Demand by Position</CardTitle>
          <CardDescription>
            Average 1-Minute Peak Distance by Position
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProfiles ? (
            <div className="h-[450px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <>
              {(() => {
                // Translate positions to English for display
                const translatedProfiles = playerProfiles.map((p) => ({
                  ...p,
                  position: translatePosition(p.position),
                }));
                const colorMap = getPositionColorMap(playerProfiles);
                const translatedColorMap: Record<string, string> = {};
                Object.entries(colorMap).forEach(([pos, color]) => {
                  translatedColorMap[translatePosition(pos)] = color;
                });

                return (
                  <>
                    <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                      <p>
                        This chart shows the average 1-minute peak distance (HSR{" "}
                        {"\u2265"} 19.8 km/h) by position.
                      </p>
                    </div>

                    <ResponsiveContainer width="100%" height={450}>
                      <BarChart
                        data={translatedProfiles}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 110, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          type="number"
                          label={{
                            value: "Distance (HSR >= 19.8 km/h) (m/min)",
                            position: "insideBottom",
                            offset: -5,
                          }}
                        />
                        <YAxis
                          type="category"
                          dataKey="position"
                          width={100}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                          }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as PlayerProfile;
                              return (
                                <div className="bg-card border border-border rounded-md p-3 shadow-lg">
                                  <p className="font-semibold">
                                    {data.position}
                                  </p>
                                  <div className="space-y-1 text-sm mt-2">
                                    <p>
                                      Avg 1-min peak:{" "}
                                      <span className="font-semibold">
                                        {data.avg_1min_peak.toFixed(1)} m/min
                                      </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {data.player_count} players
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {data.total_wcs_events} total WCS events
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={56}
                          content={() => (
                            <div className="flex flex-wrap gap-3 justify-center mb-6 text-xs">
                              {Object.entries(translatedColorMap).map(
                                ([pos, color]) => (
                                  <div
                                    key={pos}
                                    className="flex items-center gap-1"
                                  >
                                    <div
                                      className="w-3 h-3 rounded"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span>{pos}</span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        />
                        <Bar dataKey="avg_1min_peak" radius={[0, 4, 4, 0]}>
                          {translatedProfiles.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                translatedColorMap[entry.position] || "#6b7280"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Temporal Distribution of WCS Events by Position</CardTitle>
          <CardDescription>
            When during the match do worst case scenarios occur? (Mean ±
            Standard Deviation)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <>
              {(() => {
                const timingStats =
                  calculatePositionTimingStats(detailedEvents);

                // Create color map based on original positions, then translate
                const originalColorMap = getPositionColorMap(
                  playerProfiles.length > 0 ? playerProfiles : []
                );
                const translatedColorMap: Record<string, string> = {};
                Object.entries(originalColorMap).forEach(([pos, color]) => {
                  translatedColorMap[translatePosition(pos)] = color;
                });

                // Prepare data for scatter plot - each event as a point
                const scatterData = timingStats.flatMap((stat) =>
                  stat.events.map((event) => ({
                    position: stat.position,
                    minute: event.minute,
                    mean: stat.mean,
                    stdDev: stat.stdDev,
                  }))
                );

                return (
                  <>
                    <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                      <p>
                        This chart shows the temporal distribution of WCS events
                        throughout the match, grouped by position. Each point
                        represents an individual WCS event. The vertical lines
                        indicate the mean timing for each position, while the
                        shaded areas represent ±1 standard deviation.
                      </p>
                    </div>

                    <div className="mb-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">
                              Position
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Mean (min)
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Std Dev
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Events
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {timingStats.map((stat, idx) => (
                            <tr
                              key={stat.position}
                              className={idx % 2 === 0 ? "bg-muted/30" : ""}
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded"
                                    style={{
                                      backgroundColor:
                                        translatedColorMap[stat.position] ||
                                        "#6b7280",
                                    }}
                                  />
                                  {stat.position}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {stat.mean.toFixed(1)}&apos;
                              </td>
                              <td className="px-3 py-2 text-right">
                                ±{stat.stdDev.toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {stat.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <ResponsiveContainer width="100%" height={500}>
                      <ScatterChart
                        margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          type="number"
                          dataKey="minute"
                          domain={[0, 90]}
                          ticks={[0, 15, 30, 45, 60, 75, 90]}
                          label={{
                            value: "Match Minute",
                            position: "insideBottom",
                            offset: -10,
                          }}
                        />
                        <YAxis
                          type="category"
                          dataKey="position"
                          allowDuplicatedCategory={false}
                          width={50}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                          }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-card border border-border rounded-md p-3 shadow-lg">
                                  <p className="font-semibold">
                                    {data.position}
                                  </p>
                                  <div className="space-y-1 text-sm mt-2">
                                    <p>
                                      Event at:{" "}
                                      <span className="font-semibold">
                                        {data.minute}&apos;
                                      </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Position Mean: {data.mean.toFixed(1)}
                                      &apos; (±{data.stdDev.toFixed(1)})
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        {/* Reference lines for means and areas for std dev */}
                        {timingStats.map((stat) => (
                          <React.Fragment key={`ref-${stat.position}`}>
                            {/* Standard deviation area */}
                            <ReferenceArea
                              x1={Math.max(0, stat.mean - stat.stdDev)}
                              x2={Math.min(90, stat.mean + stat.stdDev)}
                              y1={stat.position}
                              y2={stat.position}
                              fill={
                                translatedColorMap[stat.position] || "#6b7280"
                              }
                              fillOpacity={0.1}
                              strokeOpacity={0}
                            />
                            {/* Mean line */}
                            <ReferenceLine
                              x={stat.mean}
                              stroke={
                                translatedColorMap[stat.position] || "#6b7280"
                              }
                              strokeWidth={2}
                              strokeDasharray="5 5"
                            />
                          </React.Fragment>
                        ))}

                        {/* Scatter points grouped by position */}
                        {timingStats.map((stat) => (
                          <Scatter
                            key={stat.position}
                            name={stat.position}
                            data={scatterData.filter(
                              (d) => d.position === stat.position
                            )}
                            fill={
                              translatedColorMap[stat.position] || "#6b7280"
                            }
                            shape="circle"
                          />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed WCS Events</CardTitle>
          <CardDescription>
            Individual worst case scenario events with match timing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b sticky top-0 bg-background">
                  <tr className="text-left">
                    <th
                      className="p-2 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDetailedSort("match_name")}
                    >
                      <div className="flex items-center gap-1">
                        Match
                        {detailedSortColumn === "match_name" && (
                          <span className="text-xs">
                            {detailedSortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="p-2 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDetailedSort("player_name")}
                    >
                      <div className="flex items-center gap-1">
                        Player
                        {detailedSortColumn === "player_name" && (
                          <span className="text-xs">
                            {detailedSortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="p-2 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDetailedSort("position")}
                    >
                      <div className="flex items-center gap-1">
                        Position
                        {detailedSortColumn === "position" && (
                          <span className="text-xs">
                            {detailedSortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="p-2 font-semibold text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDetailedSort("match_minute")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Match Minute
                        {detailedSortColumn === "match_minute" && (
                          <span className="text-xs">
                            {detailedSortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="p-2 font-semibold">Period</th>
                    <th
                      className="p-2 font-semibold text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDetailedSort("distance_covered")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Distance (m)
                        {detailedSortColumn === "distance_covered" && (
                          <span className="text-xs">
                            {detailedSortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDetailedEvents.slice(0, 100).map((event, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-muted/50 text-xs"
                    >
                      <td className="p-2 font-mono text-xs truncate max-w-[120px]">
                        {event.match_name}
                      </td>
                      <td className="p-2">{event.player_name}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {event.position || "N/A"}
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {event.match_minute !== null
                          ? `${event.match_minute}'`
                          : "N/A"}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            event.match_period === "First Half"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : event.match_period === "Second Half"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {event.match_period}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        {event.distance_covered?.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detailedEvents.length > 100 && (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  Showing 100 of {detailedEvents.length} events
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Matches with WCS Data</CardTitle>
          <CardDescription>
            List of all matches included in this analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.map((match) => (
              <div
                key={match.match_name}
                className="p-3 border border-border rounded-md bg-card hover:bg-accent transition-colors"
              >
                <div className="font-medium text-sm truncate">
                  {match.match_name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {match.match_date || "No date"} · {match.player_count} players
                  · {match.wcs_count} WCS events
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
