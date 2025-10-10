"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { toAbsoluteTime as toAbsFromUtils } from "../utils/time";

export interface AvgPoint {
  second: number;
  speed: number | null;
}

interface AvgSpeedChartProps {
  entries: {
    player_display_name: string;
    speed: number;
    seconds_since_midnight: number;
  }[];
  thresholds?: { match: number; halftime: number; kickoff: number } | null;
  periods?: {
    detected_first_half_start?: number;
    detected_first_half_end?: number;
    detected_second_half_start?: number;
    detected_second_half_end?: number;
    detected_halftime_start?: number;
    detected_halftime_end?: number;
  } | null;
  kickoffSpike?: number | null;
  cursorSecond?: number | null;
  patchedFirstHalfStart?: number | null;
  patchedSecondHalfStart?: number | null;
}

export default function AvgSpeedChart({
  entries,
  thresholds,
  periods,
  kickoffSpike,
  cursorSecond,
  patchedFirstHalfStart,
  patchedSecondHalfStart,
}: AvgSpeedChartProps) {
  // build avg series per second (>=2 players) in km/h
  const series = React.useMemo<AvgPoint[]>(() => {
    if (!entries || entries.length === 0) return [];
    const secondToSpeeds: Map<number, number[]> = new Map();
    const secondToPlayers: Map<number, Set<string>> = new Map();
    for (const e of entries) {
      const sec = Math.floor(e.seconds_since_midnight);
      if (!secondToSpeeds.has(sec)) secondToSpeeds.set(sec, []);
      // Convert from m/s to km/h for charting --> * 3.6
      secondToSpeeds.get(sec)!.push(e.speed);
      if (!secondToPlayers.has(sec)) secondToPlayers.set(sec, new Set());
      secondToPlayers.get(sec)!.add(e.player_display_name);
    }
    const seconds = Array.from(secondToSpeeds.keys());
    if (seconds.length === 0) return [];
    const min = Math.min(...seconds),
      max = Math.max(...seconds);
    const out: AvgPoint[] = [];
    for (let s = min; s <= max; s++) {
      const speeds = secondToSpeeds.get(s) || [];
      const players = secondToPlayers.get(s) || new Set<string>();
      if (players.size >= 2 && speeds.length > 0) {
        const sum = speeds.reduce((a, b) => a + b, 0);
        out.push({ second: s, speed: sum / speeds.length });
      } else {
        // Use null instead of 0 so the line does not drop to the x-axis creating bar-like spikes
        out.push({ second: s, speed: null });
      }
    }
    return out;
  }, [entries]);

  const toAbsoluteTime = (sec?: number) => toAbsFromUtils(sec);

  // x ticks at key points
  const ticks = React.useMemo(() => {
    if (!periods) return undefined;
    const v: number[] = [];
    const push = (n?: number) => {
      if (typeof n === "number") v.push(n);
    };
    push(periods.detected_first_half_start);
    push(periods.detected_first_half_end);
    push(periods.detected_second_half_start);
    push(periods.detected_second_half_end);
    return Array.from(new Set(v)).sort((a, b) => a - b);
  }, [periods]);

  // keep thresholds in km/h for display
  const thresholdsKmh = React.useMemo(() => {
    if (!thresholds) return null;
    return {
      match: thresholds.match,
      halftime: thresholds.halftime,
      kickoff: thresholds.kickoff,
    };
  }, [thresholds]);

  // Zoom state and selection
  const [xDomain, setXDomain] = React.useState<[number, number] | null>(null);
  const [refLeft, setRefLeft] = React.useState<number | null>(null);
  const [refRight, setRefRight] = React.useState<number | null>(null);
  const resetZoom = () => setXDomain(null);
  const onMouseDown = (e: any) => {
    if (e && typeof e.activeLabel === "number") setRefLeft(e.activeLabel);
  };
  const onMouseMove = (e: any) => {
    if (refLeft !== null && e && typeof e.activeLabel === "number")
      setRefRight(e.activeLabel);
  };
  const onMouseUp = () => {
    if (refLeft === null || refRight === null) {
      setRefLeft(null);
      setRefRight(null);
      return;
    }
    let left = Math.floor(refLeft);
    let right = Math.floor(refRight);
    if (left === right) {
      setRefLeft(null);
      setRefRight(null);
      return;
    }
    if (left > right) {
      const t = left;
      left = right;
      right = t;
    }
    setXDomain([left, right]);
    setRefLeft(null);
    setRefRight(null);
  };

  return (
    <div className="h-[340px]">
      <div className="flex justify-start mb-1">
        {xDomain ? (
          <button
            onClick={resetZoom}
            className="text-xs px-2 py-1 rounded border border-border hover:border-ring bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            Reset zoom
          </button>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={series}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <defs>
            <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.5}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.2}
              />
            </linearGradient>
          </defs>
          <XAxis
            type="number"
            dataKey="second"
            domain={xDomain ? xDomain : ["auto", "auto"]}
            allowDataOverflow
            ticks={ticks}
            tickFormatter={(s) => toAbsoluteTime(s)}
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
              fontFamily: "inherit",
            }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            domain={[0, "auto"]}
            label={{
              value: "Speed (km/h)",
              angle: -90,
              position: "insideLeft",
              fill: "hsl(var(--muted-foreground))",
              style: { fontSize: "12px", fontFamily: "inherit" },
            }}
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
              fontFamily: "inherit",
            }}
            stroke="hsl(var(--border))"
          />
          <Tooltip
            labelFormatter={(l: any) => toAbsoluteTime(l)}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontFamily: "inherit",
              fontSize: "12px",
            }}
            labelStyle={{
              color: "hsl(var(--popover-foreground))",
              fontWeight: "500",
            }}
            itemStyle={{
              color: "hsl(var(--popover-foreground))",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "12px",
              fontFamily: "inherit",
            }}
            iconType="line"
          />
          <Area
            type="monotone"
            dataKey="speed"
            name="Team Average Speed"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="url(#avgFill)"
            connectNulls
            isAnimationActive={false}
          />

          {thresholdsKmh && (
            <>
              <ReferenceLine
                y={thresholdsKmh.match}
                stroke="hsl(var(--chart-1))"
                strokeOpacity={0.6}
                ifOverflow="extendDomain"
              />
              <ReferenceLine
                y={thresholdsKmh.halftime}
                stroke="hsl(var(--chart-2))"
                strokeOpacity={0.6}
                ifOverflow="extendDomain"
              />
              {/* Adjusted from 20 to 19.8 km/h */}
              <ReferenceLine
                y={19.8}
                stroke="hsl(var(--destructive))"
                strokeOpacity={0.7}
                ifOverflow="extendDomain"
              />
              {/* Added sprint threshold at 25.2 km/h */}
              <ReferenceLine
                y={25.2}
                stroke="hsl(var(--chart-3))"
                strokeOpacity={0.7}
                ifOverflow="extendDomain"
              />
            </>
          )}
          {typeof cursorSecond === "number" && (
            <ReferenceLine
              x={Math.floor(cursorSecond)}
              stroke="hsl(var(--accent-foreground))"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          )}
          {typeof patchedFirstHalfStart === "number" && (
            <ReferenceLine
              x={patchedFirstHalfStart}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
            />
          )}
          {typeof patchedSecondHalfStart === "number" && (
            <ReferenceLine
              x={patchedSecondHalfStart}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
            />
          )}
          {periods &&
            periods.detected_halftime_start !== undefined &&
            periods.detected_halftime_end !== undefined && (
              <ReferenceArea
                x1={periods.detected_halftime_start}
                x2={periods.detected_halftime_end}
                fill="hsl(var(--muted))"
                fillOpacity={0.2}
                ifOverflow="extendDomain"
              />
            )}
          {periods && (
            <>
              {typeof periods.detected_first_half_start === "number" && (
                <ReferenceLine
                  x={periods.detected_first_half_start}
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={6}
                  strokeDasharray="12 8"
                  label={{
                    value: "PT Start",
                    position: "top",
                    style: { fill: "hsl(var(--foreground))", fontSize: "12px" },
                  }}
                />
              )}
              {typeof periods.detected_first_half_end === "number" && (
                <ReferenceLine
                  x={periods.detected_first_half_end}
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={6}
                  strokeDasharray="12 8"
                  label={{
                    value: "PT End",
                    position: "top",
                    style: { fill: "hsl(var(--foreground))", fontSize: "12px" },
                  }}
                />
              )}
              {typeof periods.detected_halftime_start === "number" && (
                <ReferenceLine
                  x={periods.detected_halftime_start}
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={6}
                  strokeDasharray="12 8"
                  label={{
                    value: "HT Start",
                    position: "top",
                    style: { fill: "hsl(var(--foreground))", fontSize: "12px" },
                  }}
                />
              )}
              {typeof periods.detected_halftime_end === "number" && (
                <ReferenceLine
                  x={periods.detected_halftime_end}
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={6}
                  strokeDasharray="12 8"
                  label={{
                    value: "HT End",
                    position: "top",
                    style: { fill: "hsl(var(--foreground))", fontSize: "12px" },
                  }}
                />
              )}
              {typeof periods.detected_second_half_start === "number" && (
                <ReferenceLine
                  x={periods.detected_second_half_start}
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={6}
                  strokeDasharray="12 8"
                  label={{
                    value: "ST Start",
                    position: "top",
                    style: { fill: "hsl(var(--foreground))", fontSize: "12px" },
                  }}
                />
              )}
              {typeof periods.detected_second_half_end === "number" && (
                <ReferenceLine
                  x={periods.detected_second_half_end}
                  stroke="hsl(var(--primary))"
                  strokeWidth={6}
                  strokeDasharray="12 8"
                  label={{
                    value: "ST End",
                    position: "top",
                    style: { fill: "hsl(var(--foreground))", fontSize: "12px" },
                  }}
                />
              )}
            </>
          )}
          {typeof kickoffSpike === "number" && (
            <ReferenceLine
              x={kickoffSpike}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              label={{
                value: "Kickoff spike",
                position: "top",
                style: { fill: "hsl(var(--foreground))", fontSize: "12px" },
              }}
            />
          )}
          {refLeft !== null && refRight !== null && (
            <ReferenceArea
              x1={refLeft}
              x2={refRight}
              fill="hsl(var(--primary))"
              fillOpacity={0.15}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
