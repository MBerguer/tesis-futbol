"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MatchStats {
  match_name: string;
  dtr: number;
  z2_distance: number;
  sprint_distance: number;
  accelerations: number;
  decelerations: number;
  high_intensity: number;
  player_count: number;
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
];

export default function CompareMatchesPage() {
  const [allMatches, setAllMatches] = useState<MatchStats[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [matchColors, setMatchColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/research/match-aggregate-stats`);
      const data = await res.json();
      setAllMatches(data.matches || []);
    } catch (error) {
      console.error("Error fetching match stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMatch = (matchName: string) => {
    if (selectedMatches.includes(matchName)) {
      // Deselect: remove from selectedMatches and from matchColors
      setSelectedMatches(selectedMatches.filter((m) => m !== matchName));
      const newColors = { ...matchColors };
      delete newColors[matchName];
      setMatchColors(newColors);
    } else if (selectedMatches.length < 3) {
      // Select: add to selectedMatches and assign next available color
      setSelectedMatches([...selectedMatches, matchName]);
      // Find next available color (one that's not currently used)
      const usedColors = Object.values(matchColors);
      const availableColor =
        CHART_COLORS.find((c) => !usedColors.includes(c)) || CHART_COLORS[0];
      setMatchColors({ ...matchColors, [matchName]: availableColor });
    }
  };

  const getRadarData = () => {
    if (selectedMatches.length === 0) return [];

    const selectedStats = allMatches.filter((m) =>
      selectedMatches.includes(m.match_name)
    );

    // Helper function to normalize with exaggerated scale using range
    // Maps to [20, 100] range to avoid tiny polygons and exaggerate differences
    const normalizeRange = (value: number, min: number, max: number) => {
      if (max === min) return 100; // If all values are the same
      // Map from [min, max] to [20, 100] to avoid center of radar
      return 20 + ((value - min) / (max - min)) * 80;
    };

    // Calculate min and max for each metric across ALL matches (not just selected)
    // This gives consistent scale regardless of which matches are selected
    const dtrMin = Math.min(...allMatches.map((m) => m.dtr));
    const dtrMax = Math.max(...allMatches.map((m) => m.dtr));
    const z2Min = Math.min(...allMatches.map((m) => m.z2_distance));
    const z2Max = Math.max(...allMatches.map((m) => m.z2_distance));
    const sprintMin = Math.min(...allMatches.map((m) => m.sprint_distance));
    const sprintMax = Math.max(...allMatches.map((m) => m.sprint_distance));
    const accelMin = Math.min(...allMatches.map((m) => m.accelerations));
    const accelMax = Math.max(...allMatches.map((m) => m.accelerations));
    const decelMin = Math.min(...allMatches.map((m) => m.decelerations));
    const decelMax = Math.max(...allMatches.map((m) => m.decelerations));
    const intensityMin = Math.min(...allMatches.map((m) => m.high_intensity));
    const intensityMax = Math.max(...allMatches.map((m) => m.high_intensity));

    return [
      {
        metric: "DTR (m/min)",
        fullMark: 100,
        ...Object.fromEntries(
          selectedStats.map((m) => [
            m.match_name,
            normalizeRange(m.dtr, dtrMin, dtrMax),
          ])
        ),
        // Store real values for tooltip
        ...Object.fromEntries(
          selectedStats.map((m) => [`real_${m.match_name}`, m.dtr])
        ),
      },
      {
        metric: "Z2 (m/min)",
        fullMark: 100,
        ...Object.fromEntries(
          selectedStats.map((m) => [
            m.match_name,
            normalizeRange(m.z2_distance, z2Min, z2Max),
          ])
        ),
        ...Object.fromEntries(
          selectedStats.map((m) => [`real_${m.match_name}`, m.z2_distance])
        ),
      },
      {
        metric: "Sprint (m/min)",
        fullMark: 100,
        ...Object.fromEntries(
          selectedStats.map((m) => [
            m.match_name,
            normalizeRange(m.sprint_distance, sprintMin, sprintMax),
          ])
        ),
        ...Object.fromEntries(
          selectedStats.map((m) => [`real_${m.match_name}`, m.sprint_distance])
        ),
      },
      {
        metric: "Accel (m/s²)",
        fullMark: 100,
        ...Object.fromEntries(
          selectedStats.map((m) => [
            m.match_name,
            normalizeRange(m.accelerations, accelMin, accelMax),
          ])
        ),
        ...Object.fromEntries(
          selectedStats.map((m) => [`real_${m.match_name}`, m.accelerations])
        ),
      },
      {
        metric: "Decel (m/s²)",
        fullMark: 100,
        ...Object.fromEntries(
          selectedStats.map((m) => [
            m.match_name,
            normalizeRange(m.decelerations, decelMin, decelMax),
          ])
        ),
        ...Object.fromEntries(
          selectedStats.map((m) => [`real_${m.match_name}`, m.decelerations])
        ),
      },
      {
        metric: "High Int (ev/min)",
        fullMark: 100,
        ...Object.fromEntries(
          selectedStats.map((m) => [
            m.match_name,
            normalizeRange(m.high_intensity, intensityMin, intensityMax),
          ])
        ),
        ...Object.fromEntries(
          selectedStats.map((m) => [`real_${m.match_name}`, m.high_intensity])
        ),
      },
    ];
  };

  const filteredMatches = allMatches.filter((m) =>
    m.match_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare Matches</h1>
          <p className="text-muted-foreground mt-1">
            Select up to 3 matches to compare their aggregate performance
            metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Match Selector */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Select Matches</CardTitle>
            <CardDescription>
              Choose up to 3 matches ({selectedMatches.length}/3 selected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pr-8 bg-background border border-input rounded-md text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading matches...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredMatches.map((match) => {
                    const isSelected = selectedMatches.includes(
                      match.match_name
                    );
                    const selectedIndex = selectedMatches.indexOf(
                      match.match_name
                    );
                    const canSelect = isSelected || selectedMatches.length < 3;

                    return (
                      <button
                        key={match.match_name}
                        onClick={() =>
                          canSelect && toggleMatch(match.match_name)
                        }
                        disabled={!canSelect}
                        className={`p-3 rounded-lg border text-left transition-all relative ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : canSelect
                            ? "border-border hover:border-primary hover:bg-accent"
                            : "border-border opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate mb-1">
                              {match.match_name}
                            </div>
                            <div className="text-xs text-muted-foreground font-normal leading-relaxed">
                              {match.player_count} plys · DTR{" "}
                              {match.dtr.toFixed(2)} · Z2{" "}
                              {match.z2_distance.toFixed(2)} · Sp{" "}
                              {match.sprint_distance.toFixed(2)} · HI{" "}
                              {match.high_intensity.toFixed(2)}
                            </div>
                          </div>
                          {isSelected && (
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                              style={{
                                backgroundColor: matchColors[match.match_name],
                              }}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart and Table Combined */}
        <div className="space-y-6">
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
              <CardDescription>
                Aggregate metrics averaged across players with ≥85 minutes
                played
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMatches.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  Select at least one match to view comparison
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-3">
                    {selectedMatches.map((matchName) => (
                      <div
                        key={matchName}
                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: matchColors[matchName] }}
                        />
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {matchName}
                        </span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={false}
                      />
                      {selectedMatches.map((matchName) => (
                        <Radar
                          key={matchName}
                          name={matchName}
                          dataKey={matchName}
                          stroke={matchColors[matchName]}
                          fill={matchColors[matchName]}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          animationDuration={200}
                        />
                      ))}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        formatter={(value: any, name: any, props: any) => {
                          // name is the match_name now (not match0, match1, etc)
                          const realValue = props.payload[`real_${name}`];
                          return [realValue.toFixed(2), name];
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </>
              )}
            </CardContent>
          </Card>

          {/* Transposed Stats Table */}
          {selectedMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detailed Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">
                          Metric
                        </th>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <th
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              <div className="flex items-center justify-end gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      matchColors[match.match_name],
                                  }}
                                />
                                <span className="font-medium truncate max-w-[120px]">
                                  {match.match_name}
                                </span>
                              </div>
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          Players
                        </td>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <td
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              {match.player_count}
                            </td>
                          ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          DTR (m/min)
                        </td>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <td
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              {match.dtr.toFixed(2)}
                            </td>
                          ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          Z2 (m/min)
                        </td>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <td
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              {match.z2_distance.toFixed(2)}
                            </td>
                          ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          Sprint (m/min)
                        </td>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <td
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              {match.sprint_distance.toFixed(2)}
                            </td>
                          ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          Avg Accel (m/s²)
                        </td>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <td
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              {match.accelerations.toFixed(2)}
                            </td>
                          ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          Avg Decel (m/s²)
                        </td>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <td
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              {match.decelerations.toFixed(2)}
                            </td>
                          ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          High Int (ev/min)
                        </td>
                        {allMatches
                          .filter((m) => selectedMatches.includes(m.match_name))
                          .map((match) => (
                            <td
                              key={match.match_name}
                              className="text-right py-3 px-4"
                            >
                              {match.high_intensity.toFixed(2)}
                            </td>
                          ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
