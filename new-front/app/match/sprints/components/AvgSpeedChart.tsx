"use client";

import React from "react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ReferenceArea, ReferenceLine } from "recharts";
import { toAbsoluteTime as toAbsFromUtils } from "../utils/time";

export interface AvgPoint { second: number; speed: number }

interface AvgSpeedChartProps {
  entries: { player_display_name: string; speed: number; centralized_elapsed_time: number }[];
  baseTime: string | null;
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
}

export default function AvgSpeedChart({ entries, baseTime, thresholds, periods, kickoffSpike, cursorSecond }: AvgSpeedChartProps) {
  // build avg series per second (>=2 players) in km/h
  const series = React.useMemo<AvgPoint[]>(() => {
    if (!entries || entries.length === 0) return [];
    const secondToSpeeds: Map<number, number[]> = new Map();
    const secondToPlayers: Map<number, Set<string>> = new Map();
    for (const e of entries) {
      const sec = Math.floor(e.centralized_elapsed_time);
      if (!secondToSpeeds.has(sec)) secondToSpeeds.set(sec, []);
      // Convert from m/s to km/h for charting --> * 3.6
      secondToSpeeds.get(sec)!.push(e.speed);
      if (!secondToPlayers.has(sec)) secondToPlayers.set(sec, new Set());
      secondToPlayers.get(sec)!.add(e.player_display_name);
    }
    const seconds = Array.from(secondToSpeeds.keys());
    if (seconds.length === 0) return [];
    const min = Math.min(...seconds), max = Math.max(...seconds);
    const out: AvgPoint[] = [];
    for (let s = min; s <= max; s++) {
      const speeds = secondToSpeeds.get(s) || [];
      const players = secondToPlayers.get(s) || new Set<string>();
      if (players.size >= 2 && speeds.length > 0) {
        const sum = speeds.reduce((a, b) => a + b, 0);
        out.push({ second: s, speed: sum / speeds.length });
      } else {
        out.push({ second: s, speed: 0 });
      }
    }
    return out;
  }, [entries]);

  const toAbsoluteTime = (sec?: number) => toAbsFromUtils(baseTime, sec);

  // x ticks at key points
  const ticks = React.useMemo(() => {
    if (!periods) return undefined;
    const v: number[] = [];
    const push = (n?: number) => { if (typeof n === 'number') v.push(n); };
    push(periods.detected_first_half_start);
    push(periods.detected_first_half_end);
    push(periods.detected_second_half_start);
    push(periods.detected_second_half_end);
    return Array.from(new Set(v)).sort((a,b)=>a-b);
  }, [periods]);

  // keep thresholds in km/h for display
  const thresholdsKmh = React.useMemo(() => {
    if (!thresholds) return null;
    return { match: thresholds.match, halftime: thresholds.halftime, kickoff: thresholds.kickoff };
  }, [thresholds]);

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="second" ticks={ticks} tickFormatter={(s) => toAbsoluteTime(s)} />
          <YAxis label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }} />
          <Tooltip labelFormatter={(l:any)=> toAbsoluteTime(l)} />
          <Legend />
          {thresholdsKmh && (
            <>
              <ReferenceLine y={thresholdsKmh.match} stroke="#38ff48" strokeDasharray="4 4" ifOverflow="extendDomain" />
              <ReferenceLine y={thresholdsKmh.halftime} stroke="#bb00b4" strokeDasharray="4 4" ifOverflow="extendDomain" />
              <ReferenceLine y={thresholdsKmh.kickoff} stroke="#E53E3E" strokeDasharray="4 4" ifOverflow="extendDomain" />
            </>
          )}
          {typeof cursorSecond === 'number' && (
            <ReferenceLine x={Math.floor(cursorSecond)} stroke="#111827" strokeWidth={2} ifOverflow="extendDomain" />
          )}
          {periods && periods.detected_halftime_start !== undefined && periods.detected_halftime_end !== undefined && (
            <ReferenceArea x1={periods.detected_halftime_start} x2={periods.detected_halftime_end} fill="#E53E3E" fillOpacity={0.28} ifOverflow="extendDomain" />
          )}
          {periods && (
            <>
              {typeof periods.detected_first_half_start === 'number' && (<ReferenceLine x={periods.detected_first_half_start} stroke="#38A169" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'PT Start', position: 'top' }} />)}
              {typeof periods.detected_first_half_end === 'number' && (<ReferenceLine x={periods.detected_first_half_end} stroke="#2F855A" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'PT End', position: 'top' }} />)}
              {typeof periods.detected_halftime_start === 'number' && (<ReferenceLine x={periods.detected_halftime_start} stroke="#805AD5" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'HT Start', position: 'top' }} />)}
              {typeof periods.detected_halftime_end === 'number' && (<ReferenceLine x={periods.detected_halftime_end} stroke="#6B46C1" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'HT End', position: 'top' }} />)}
              {typeof periods.detected_second_half_start === 'number' && (<ReferenceLine x={periods.detected_second_half_start} stroke="#3182CE" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'ST Start', position: 'top' }} />)}
              {typeof periods.detected_second_half_end === 'number' && (<ReferenceLine x={periods.detected_second_half_end} stroke="#2B6CB0" strokeWidth={6} strokeDasharray="12 8" label={{ value: 'ST End', position: 'top' }} />)}
            </>
          )}
          {typeof kickoffSpike === 'number' && (
            <ReferenceLine x={kickoffSpike} stroke="#DD6B20" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Kickoff spike', position: 'top' }} />
          )}
          <Line type="monotone" dataKey="speed" name="Avg speed" stroke="#2C5282" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


