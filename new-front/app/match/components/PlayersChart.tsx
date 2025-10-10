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
} from "recharts";
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
      if (!dataByPlayer[entry.player_display_name])
        dataByPlayer[entry.player_display_name] = [];
      dataByPlayer[entry.player_display_name].push(entry);
    });
    Object.keys(dataByPlayer).forEach((p) =>
      dataByPlayer[p].sort(
        (a, b) => a.seconds_since_midnight - b.seconds_since_midnight
      )
    );
    return dataByPlayer;
  }, [entries]);

  const allTimes = React.useMemo(
    () =>
      Array.from(new Set(entries.map((e) => e.seconds_since_midnight))).sort(
        (a, b) => a - b
      ),
    [entries]
  );

  const chartData = React.useMemo(() => {
    return allTimes.map((time) => {
      const row: any = { seconds_since_midnight: time };
      Object.keys(playerData).forEach((player) => {
        const found = playerData[player].find(
          (e) => e.seconds_since_midnight === time
        );
        row[player] = found ? found.speed : null;
      });
      return row;
    });
  }, [allTimes, playerData]);

  // base time resolution
  const derivedBase = React.useMemo(() => {
    if (!entries || entries.length === 0) return null as string | null;
    const t = entries
      .map((e) => e.time)
      .filter(Boolean)
      .sort()[0];
    return t || null;
  }, [entries]);

  const toAbsoluteTime = (sec?: number) =>
    toAbsFromUtils(baseTime || derivedBase, sec);

  return (
    <div className="h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="seconds_since_midnight"
            tickFormatter={(s) => toAbsoluteTime(s)}
            label={{
              value: "Clock (HH:MM:SS)",
              position: "insideBottom",
              offset: -5,
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
          <YAxis
            label={{
              value: "Speed",
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
          />
          {Object.keys(playerData).map((player, index) => {
            const chartColors = [
              "hsl(var(--chart-1))",
              "hsl(var(--chart-2))",
              "hsl(var(--chart-3))",
              "hsl(var(--chart-4))",
              "hsl(var(--chart-5))",
              "hsl(var(--primary))",
              "hsl(var(--secondary))",
              "hsl(var(--accent))",
            ];
            return (
              <Line
                key={player}
                type="monotone"
                dataKey={player}
                name={player}
                stroke={chartColors[index % chartColors.length]}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={true}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
