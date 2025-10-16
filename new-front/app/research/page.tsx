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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TimeSeriesData {
  normalized_minute: number;
  distance_m_per_min: number;
  sample_count: number;
}

interface TimeSeriesResponse {
  data: TimeSeriesData[];
  metadata: {
    min_minutes_played: number;
    normalized_duration: number;
    median: number;
    zone?: string;
  };
}

interface Match {
  match_name: string;
  player_count: number;
  duration_minutes: number;
}

interface AccelDecelData {
  normalized_minute: number;
  avg_acceleration: number;
  avg_deceleration: number;
}

interface RatioData {
  normalized_minute: number;
  ratio: number;
}

export default function ResearchPage() {
  const [dtrData, setDtrData] = useState<TimeSeriesData[]>([]);
  const [z2Data, setZ2Data] = useState<TimeSeriesData[]>([]);
  const [sprintData, setSprintData] = useState<TimeSeriesData[]>([]);
  const [highAccelData, setHighAccelData] = useState<TimeSeriesData[]>([]);
  const [accelDecelData, setAccelDecelData] = useState<AccelDecelData[]>([]);
  const [ratioData, setRatioData] = useState<RatioData[]>([]);
  
  const [dtrMetadata, setDtrMetadata] = useState<
    TimeSeriesResponse["metadata"] | null
  >(null);
  const [z2Metadata, setZ2Metadata] = useState<
    TimeSeriesResponse["metadata"] | null
  >(null);
  const [sprintMetadata, setSprintMetadata] = useState<any>(null);
  const [highAccelMetadata, setHighAccelMetadata] = useState<any>(null);
  const [accelDecelMetadata, setAccelDecelMetadata] = useState<any>(null);
  const [ratioMetadata, setRatioMetadata] = useState<any>(null);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [minMinutesPlayed, setMinMinutesPlayed] = useState(85);

  useEffect(() => {
    fetchData();
  }, [minMinutesPlayed]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        dtrRes,
        z2Res,
        sprintRes,
        highAccelRes,
        accelDecelRes,
        ratioRes,
        matchesRes,
      ] = await Promise.all([
        fetch(
          `${API_BASE}/research/distance-per-minute?min_minutes_played=${minMinutesPlayed}`
        ),
        fetch(
          `${API_BASE}/research/distance-in-zone-per-minute?min_minutes_played=${minMinutesPlayed}`
        ),
        fetch(
          `${API_BASE}/research/sprint-distance-per-minute?min_minutes_played=${minMinutesPlayed}`
        ),
        fetch(
          `${API_BASE}/research/high-accel-decel-per-minute?min_minutes_played=${minMinutesPlayed}`
        ),
        fetch(
          `${API_BASE}/research/accel-decel-separated-per-minute?min_minutes_played=${minMinutesPlayed}`
        ),
        fetch(
          `${API_BASE}/research/accel-decel-ratio-per-minute?min_minutes_played=${minMinutesPlayed}`
        ),
        fetch(`${API_BASE}/research/available-matches`),
      ]);

      const dtrJson: TimeSeriesResponse = await dtrRes.json();
      const z2Json: TimeSeriesResponse = await z2Res.json();
      const sprintJson = await sprintRes.json();
      const highAccelJson = await highAccelRes.json();
      const accelDecelJson = await accelDecelRes.json();
      const ratioJson = await ratioRes.json();
      const matchesJson = await matchesRes.json();

      setDtrData(dtrJson.data || []);
      setDtrMetadata(dtrJson.metadata);
      setZ2Data(z2Json.data || []);
      setZ2Metadata(z2Json.metadata);
      setSprintData(sprintJson.data || []);
      setSprintMetadata(sprintJson.metadata);
      setHighAccelData(highAccelJson.data || []);
      setHighAccelMetadata(highAccelJson.metadata);
      setAccelDecelData(accelDecelJson.data || []);
      setAccelDecelMetadata(accelDecelJson.metadata);
      setRatioData(ratioJson.data || []);
      setRatioMetadata(ratioJson.metadata);
      setMatches(matchesJson.matches || []);
    } catch (error) {
      console.error("Error fetching research data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Research & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Aggregated time-series analysis across all championship matches
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Parameters</CardTitle>
          <CardDescription>
            Configure filters for the aggregated analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">
                Minimum Minutes Played
              </label>
              <input
                type="number"
                value={minMinutesPlayed}
                onChange={(e) => setMinMinutesPlayed(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                min={0}
                max={120}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only include players who played at least this many minutes
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Available Matches</label>
              <div className="mt-1 px-3 py-2 bg-muted rounded-md">
                <span className="text-2xl font-bold">{matches.length}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">
                Total Player-Matches
              </label>
              <div className="mt-1 px-3 py-2 bg-muted rounded-md">
                <span className="text-2xl font-bold">
                  {matches.reduce((sum, m) => sum + m.player_count, 0)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Total Distance Traveled per Minute (DTR)</CardTitle>
              <CardDescription>
                Average distance covered per minute across all matches
                (normalized to 100 minutes). Players with ≥ {minMinutesPlayed}{" "}
                minutes played.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dtrMetadata && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-muted-foreground">Median: </span>
                      <span className="font-semibold">
                        {dtrMetadata.median.toFixed(1)} m/min
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Data points:{" "}
                      </span>
                      <span className="font-semibold">{dtrData.length}</span>
                    </div>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={dtrData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="normalized_minute"
                    label={{
                      value: "Normalized Time (100 min)",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis
                    label={{
                      value: "Distance (m/min)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(1)} m/min`,
                      "Distance",
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {dtrMetadata && (
                    <ReferenceLine
                      y={dtrMetadata.median}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      label={{ value: "Median", position: "right" }}
                    />
                  )}
                  <ReferenceLine
                    x={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: "Halftime", position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="distance_m_per_min"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="DTR"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Distance in Z2 per Minute (19.8 - 25.2 km/h)
              </CardTitle>
              <CardDescription>
                Average distance covered in high-speed running zone per minute.
                Matches normalized to 100 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {z2Metadata && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-muted-foreground">Zone: </span>
                      <span className="font-semibold">{z2Metadata.zone}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Median: </span>
                      <span className="font-semibold">
                        {z2Metadata.median.toFixed(1)} m/min
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Data points:{" "}
                      </span>
                      <span className="font-semibold">{z2Data.length}</span>
                    </div>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={z2Data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="normalized_minute"
                    label={{
                      value: "Normalized Time (100 min)",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis
                    label={{
                      value: "Distance Z2 (m/min)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(2)} m/min`,
                      "Z2 Distance",
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {z2Metadata && (
                    <ReferenceLine
                      y={z2Metadata.median}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      label={{ value: "Median", position: "right" }}
                    />
                  )}
                  <ReferenceLine
                    x={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: "Halftime", position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="distance_m_per_min"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                    name="Z2 Distance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sprint Distance per Minute (>25.2 km/h)</CardTitle>
              <CardDescription>
                Average distance covered in sprint zone per minute. Matches
                normalized to 100 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sprintMetadata && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-muted-foreground">Zone: </span>
                      <span className="font-semibold">
                        {sprintMetadata.zone}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Median: </span>
                      <span className="font-semibold">
                        {sprintMetadata.median.toFixed(2)} m/min
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={sprintData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="normalized_minute"
                    label={{
                      value: "Tiempo juego normalizado (100 min)",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis
                    label={{
                      value: "Distancia en sprint (m/min)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(2)} m/min`,
                      "Sprint",
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {sprintMetadata && (
                    <ReferenceLine
                      y={sprintMetadata.median}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      label={{ value: "Media", position: "right" }}
                    />
                  )}
                  <ReferenceLine
                    x={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: "Descanso", position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="distance_m_per_min"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Sprint Distance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                High Accelerations & Decelerations (>3.0 m/s²)
              </CardTitle>
              <CardDescription>
                Count of high-intensity acceleration/deceleration events per
                minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {highAccelMetadata && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-muted-foreground">Threshold: </span>
                      <span className="font-semibold">
                        {highAccelMetadata.threshold}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Media: </span>
                      <span className="font-semibold">
                        {highAccelMetadata.median.toFixed(2)} /min
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={highAccelData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="normalized_minute"
                    label={{
                      value: "Tiempo juego normalizado (100 min)",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis
                    label={{
                      value: "Aceleraciones y deceleraciones (>3.0 m/s2)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(2)} events`,
                      "High Accel/Decel",
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {highAccelMetadata && (
                    <ReferenceLine
                      y={highAccelMetadata.median}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      label={{ value: "Media", position: "right" }}
                    />
                  )}
                  <ReferenceLine
                    x={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: "Descanso", position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count_per_min"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={false}
                    name="High Accel/Decel"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Average Accelerations and Decelerations
              </CardTitle>
              <CardDescription>
                Separate trends for acceleration and deceleration magnitudes per
                minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accelDecelMetadata && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-muted-foreground">
                        Media AC:{" "}
                      </span>
                      <span className="font-semibold">
                        {accelDecelMetadata.median_acceleration.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Media DC:{" "}
                      </span>
                      <span className="font-semibold">
                        {accelDecelMetadata.median_deceleration.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={accelDecelData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="normalized_minute"
                    label={{
                      value: "Tiempo juego normalizado (100 min)",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis label={{ value: "Numero", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {accelDecelMetadata && (
                    <>
                      <ReferenceLine
                        y={accelDecelMetadata.median_acceleration}
                        stroke="hsl(var(--chart-1))"
                        strokeDasharray="5 5"
                        strokeOpacity={0.5}
                        label={{ value: "Media AC", position: "right" }}
                      />
                      <ReferenceLine
                        y={accelDecelMetadata.median_deceleration}
                        stroke="hsl(var(--chart-5))"
                        strokeDasharray="5 5"
                        strokeOpacity={0.5}
                        label={{ value: "Media DC", position: "right" }}
                      />
                    </>
                  )}
                  <ReferenceLine
                    x={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: "Descanso", position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_acceleration"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                    name="Aceleraciones"
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_deceleration"
                    stroke="hsl(var(--chart-5))"
                    strokeWidth={2}
                    dot={false}
                    name="Deceleraciones"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acceleration/Deceleration Ratio (AC/DC)</CardTitle>
              <CardDescription>
                Ratio between acceleration and deceleration counts per minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ratioMetadata && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-muted-foreground">Media: </span>
                      <span className="font-semibold">
                        {ratioMetadata.median.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={ratioData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="normalized_minute"
                    label={{
                      value: "Tiempo juego normalizado (100 min)",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis label={{ value: "Ratio AC/DC", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(2)}`,
                      "Ratio",
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {ratioMetadata && (
                    <ReferenceLine
                      y={ratioMetadata.median}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      label={{ value: "Media", position: "right" }}
                    />
                  )}
                  <ReferenceLine
                    x={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: "Descanso", position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="AC/DC Ratio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Matches</CardTitle>
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
                      {match.player_count} players ·{" "}
                      {match.duration_minutes?.toFixed(0) || "N/A"} min
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
