"use client";

import React from "react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts";
import { toAbsoluteTime as toAbsFromUtils } from "../utils/time";

export interface MatchEntry {
  player_display_name: string;
  time: string;
  speed: number;
  seconds_since_midnight: number;
}

interface PlayersChartProps {
  entries: MatchEntry[];
  baseTime: string | null;
}

export default function PlayersChart({ entries, baseTime }: PlayersChartProps) {
  // Group by player and pivot to chart rows
  const playerData = React.useMemo(() => {
    const dataByPlayer: { [key: string]: MatchEntry[] } = {};
    entries.forEach((entry) => {
      if (!dataByPlayer[entry.player_display_name]) dataByPlayer[entry.player_display_name] = [];
      dataByPlayer[entry.player_display_name].push(entry);
    });
    Object.keys(dataByPlayer).forEach((p) => dataByPlayer[p].sort((a, b) => a.seconds_since_midnight - b.seconds_since_midnight));
    return dataByPlayer;
  }, [entries]);

  const allTimes = React.useMemo(() => Array.from(new Set(entries.map((e) => e.seconds_since_midnight))).sort((a, b) => a - b), [entries]);

  const chartData = React.useMemo(() => {
    return allTimes.map((time) => {
      const row: any = { seconds_since_midnight: time };
      Object.keys(playerData).forEach((player) => {
        const found = playerData[player].find((e) => e.seconds_since_midnight === time);
        row[player] = found ? found.speed : null;
      });
      return row;
    });
  }, [allTimes, playerData]);

  // base time resolution
  const derivedBase = React.useMemo(() => {
    if (!entries || entries.length === 0) return null as string | null;
    const t = entries.map((e) => e.time).filter(Boolean).sort()[0];
    return t || null;
  }, [entries]);

  const toAbsoluteTime = (sec?: number) => toAbsFromUtils(baseTime || derivedBase, sec);

  return (
    <div className="h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="seconds_since_midnight" tickFormatter={(s) => toAbsoluteTime(s)} label={{ value: 'Clock (HH:MM:SS)', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'Speed', angle: -90, position: 'insideLeft' }} />
          <Tooltip labelFormatter={(l:any)=> toAbsoluteTime(l)} />
          <Legend />
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
  );
}



