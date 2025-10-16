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

  // Individual loading states
  const [loadingDtr, setLoadingDtr] = useState(true);
  const [loadingZ2, setLoadingZ2] = useState(true);
  const [loadingSprint, setLoadingSprint] = useState(true);
  const [loadingHighAccel, setLoadingHighAccel] = useState(true);
  const [loadingAccelDecel, setLoadingAccelDecel] = useState(true);
  const [loadingRatio, setLoadingRatio] = useState(true);

  const [minMinutesPlayed, setMinMinutesPlayed] = useState(85);

  useEffect(() => {
    // Load each chart independently for faster perceived performance
    fetchDtrData();
    fetchZ2Data();
    fetchSprintData();
    fetchHighAccelData();
    fetchAccelDecelData();
    fetchRatioData();
  }, [minMinutesPlayed]);

  const fetchDtrData = async () => {
    setLoadingDtr(true);
    try {
      const res = await fetch(
        `${API_BASE}/research/distance-per-minute?min_minutes_played=${minMinutesPlayed}`
      );
      const json: TimeSeriesResponse = await res.json();
      setDtrData(json.data || []);
      setDtrMetadata(json.metadata);
    } catch (error) {
      console.error("Error fetching DTR data:", error);
    } finally {
      setLoadingDtr(false);
    }
  };

  const fetchZ2Data = async () => {
    setLoadingZ2(true);
    try {
      const res = await fetch(
        `${API_BASE}/research/distance-in-zone-per-minute?min_minutes_played=${minMinutesPlayed}`
      );
      const json: TimeSeriesResponse = await res.json();
      setZ2Data(json.data || []);
      setZ2Metadata(json.metadata);
    } catch (error) {
      console.error("Error fetching Z2 data:", error);
    } finally {
      setLoadingZ2(false);
    }
  };

  const fetchSprintData = async () => {
    setLoadingSprint(true);
    try {
      const res = await fetch(
        `${API_BASE}/research/sprint-distance-per-minute?min_minutes_played=${minMinutesPlayed}`
      );
      const json = await res.json();
      setSprintData(json.data || []);
      setSprintMetadata(json.metadata);
    } catch (error) {
      console.error("Error fetching sprint data:", error);
    } finally {
      setLoadingSprint(false);
    }
  };

  const fetchHighAccelData = async () => {
    setLoadingHighAccel(true);
    try {
      const res = await fetch(
        `${API_BASE}/research/high-accel-decel-per-minute?min_minutes_played=${minMinutesPlayed}`
      );
      const json = await res.json();
      setHighAccelData(json.data || []);
      setHighAccelMetadata(json.metadata);
    } catch (error) {
      console.error("Error fetching high accel data:", error);
    } finally {
      setLoadingHighAccel(false);
    }
  };

  const fetchAccelDecelData = async () => {
    setLoadingAccelDecel(true);
    try {
      const res = await fetch(
        `${API_BASE}/research/accel-decel-separated-per-minute?min_minutes_played=${minMinutesPlayed}`
      );
      const json = await res.json();
      setAccelDecelData(json.data || []);
      setAccelDecelMetadata(json.metadata);
    } catch (error) {
      console.error("Error fetching accel/decel data:", error);
    } finally {
      setLoadingAccelDecel(false);
    }
  };

  const fetchRatioData = async () => {
    setLoadingRatio(true);
    try {
      const res = await fetch(
        `${API_BASE}/research/accel-decel-ratio-per-minute?min_minutes_played=${minMinutesPlayed}`
      );
      const json = await res.json();
      setRatioData(json.data || []);
      setRatioMetadata(json.metadata);
    } catch (error) {
      console.error("Error fetching ratio data:", error);
    } finally {
      setLoadingRatio(false);
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
            Time-series analysis of GPS data normalized to 100 minutes
          </p>
        </div>
      </div>

      {/* DTR Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distance per Minute (DTR)</CardTitle>
          <CardDescription>
            Average distance covered per minute across all matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDtr ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground animate-pulse">
                Loading DTR data...
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={dtrData}
                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="normalized_minute"
                  label={{ value: "Minute", position: "bottom", offset: 20 }}
                />
                <YAxis
                  label={{
                    value: "Distance (m/min)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={50} />
                <Line
                  type="monotone"
                  dataKey="distance_m_per_min"
                  stroke="hsl(var(--chart-1))"
                  name="DTR"
                  dot={false}
                />
                {dtrMetadata && (
                  <ReferenceLine
                    y={dtrMetadata.median}
                    stroke="red"
                    strokeDasharray="3 3"
                    label="Median"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Z2 Zone Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distance in Z2 Zone per Minute</CardTitle>
          <CardDescription>
            Distance covered in Zone 2 (19.8-25.2 km/h) per minute
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingZ2 ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground animate-pulse">
                Loading Z2 data...
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={z2Data}
                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="normalized_minute"
                  label={{ value: "Minute", position: "bottom", offset: 20 }}
                />
                <YAxis
                  label={{
                    value: "Distance (m/min)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={50} />
                <Line
                  type="monotone"
                  dataKey="distance_m_per_min"
                  stroke="hsl(var(--chart-2))"
                  name="Z2 Distance"
                  dot={false}
                />
                {z2Metadata && (
                  <ReferenceLine
                    y={z2Metadata.median}
                    stroke="red"
                    strokeDasharray="3 3"
                    label="Median"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Sprint Distance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sprint Distance per Minute</CardTitle>
          <CardDescription>
            Distance covered at sprint speed (&gt;25.2 km/h) per minute
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSprint ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground animate-pulse">
                Loading sprint data...
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={sprintData}
                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="normalized_minute"
                  label={{ value: "Minute", position: "bottom", offset: 20 }}
                />
                <YAxis
                  label={{
                    value: "Distance (m/min)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={50} />
                <Line
                  type="monotone"
                  dataKey="distance_m_per_min"
                  stroke="#ef4444"
                  name="Sprint Distance"
                  dot={false}
                />
                {sprintMetadata && (
                  <ReferenceLine
                    y={sprintMetadata.median}
                    stroke="red"
                    strokeDasharray="3 3"
                    label="Median"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* High Intensity Events Chart */}
      <Card>
        <CardHeader>
          <CardTitle>High Intensity Events per Minute</CardTitle>
          <CardDescription>
            Accelerations & decelerations ≥3.0 m/s² per minute
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHighAccel ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground animate-pulse">
                Loading high intensity data...
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={highAccelData}
                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="normalized_minute"
                  label={{ value: "Minute", position: "bottom", offset: 20 }}
                />
                <YAxis
                  label={{
                    value: "Events/min",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={50} />
                <Line
                  type="monotone"
                  dataKey="distance_m_per_min"
                  stroke="hsl(var(--chart-4))"
                  name="High Intensity Events"
                  dot={false}
                />
                {highAccelMetadata && (
                  <ReferenceLine
                    y={highAccelMetadata.median}
                    stroke="red"
                    strokeDasharray="3 3"
                    label="Median"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Average Accelerations and Decelerations Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Average Accelerations and Decelerations</CardTitle>
          <CardDescription>
            Mean acceleration and deceleration magnitudes per minute
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAccelDecel ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground animate-pulse">
                Loading accel/decel data...
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={accelDecelData}
                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="normalized_minute"
                  label={{ value: "Minute", position: "bottom", offset: 20 }}
                />
                <YAxis
                  label={{ value: "m/s²", angle: -90, position: "insideLeft" }}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={50} />
                <Line
                  type="monotone"
                  dataKey="avg_acceleration"
                  stroke="hsl(var(--chart-1))"
                  name="Avg Acceleration"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avg_deceleration"
                  stroke="hsl(var(--chart-2))"
                  name="Avg Deceleration"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Acceleration/Deceleration Ratio Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Acceleration/Deceleration Ratio</CardTitle>
          <CardDescription>
            Ratio of accelerations to decelerations per minute
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRatio ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground animate-pulse">
                Loading ratio data...
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={ratioData}
                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="normalized_minute"
                  label={{ value: "Minute", position: "bottom", offset: 20 }}
                />
                <YAxis
                  label={{ value: "Ratio", angle: -90, position: "insideLeft" }}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={50} />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  stroke="hsl(var(--chart-5))"
                  name="Accel/Decel Ratio"
                  dot={false}
                />
                <ReferenceLine
                  y={1}
                  stroke="gray"
                  strokeDasharray="3 3"
                  label="Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
