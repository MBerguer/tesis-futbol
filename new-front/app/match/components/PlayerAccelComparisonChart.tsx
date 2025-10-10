"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const colorMap: { [key: string]: string } = {
      "Accel Low": "#dc2626", // Dark red
      "Accel Med": "#ea580c", // Medium orange-red
      "Accel High": "#f97316", // Light orange-red
      "Decel Low": "#1e40af", // Dark blue
      "Decel Med": "#1d4ed8", // Medium blue
      "Decel High": "#3b82f6", // Light blue
    };

    return (
      <div className="bg-popover border border-border p-3 shadow-lg rounded-none">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3"
                style={{ backgroundColor: colorMap[entry.name] || entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export interface AccelerationRowForChart {
  id: number;
  player_display_name: string;
  values: number[]; // [Total Accels, Accel Low, Accel Med, Accel High, Total Decels, Decel Low, Decel Med, Decel High, Distance (m), Time (s)]
}

interface PlayerAccelComparisonChartProps {
  rows: AccelerationRowForChart[];
  maxPlayers?: number;
}

function buildChartData(rows: AccelerationRowForChart[], maxPlayers: number) {
  const limited = rows.slice(0, Math.max(0, maxPlayers));
  return limited.map((r) => ({
    player: r.player_display_name,
    acc_total: r.values?.[0] ?? 0,
    acc_low: r.values?.[1] ?? 0,
    acc_med: r.values?.[2] ?? 0,
    acc_high: r.values?.[3] ?? 0,
    dec_total: r.values?.[4] ?? 0,
    dec_low: r.values?.[5] ?? 0,
    dec_med: r.values?.[6] ?? 0,
    dec_high: r.values?.[7] ?? 0,
  }));
}

export default function PlayerAccelComparisonChart({
  rows,
  maxPlayers = 12,
}: PlayerAccelComparisonChartProps) {
  const data = React.useMemo(
    () => buildChartData(rows || [], maxPlayers),
    [rows, maxPlayers]
  );

  return (
    <div className="h-[260px]">
      <style jsx>{`
        .recharts-tooltip-cursor {
          display: none !important;
        }
        .recharts-bar-rectangle:hover {
          opacity: 1 !important;
        }
        .recharts-cartesian-axis-tick {
          pointer-events: none;
        }
        .recharts-bar-rectangle {
          transition: none !important;
        }
        .recharts-bar-rectangle:hover {
          filter: none !important;
          transform: none !important;
        }
        .recharts-active-bar {
          opacity: 1 !important;
        }
        .recharts-bar-rectangle:active {
          opacity: 1 !important;
        }
      `}</style>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 40, right: 16, left: 8, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="player"
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
              fontFamily: "inherit",
            }}
            angle={-20}
            textAnchor="end"
            interval={0}
            height={50}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
              fontFamily: "inherit",
            }}
            stroke="hsl(var(--border))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "12px",
              fontFamily: "inherit",
            }}
            iconType="rect"
            verticalAlign="top"
            align="center"
          />

          {/* Group 1: Total Accels -> stacked by low/med/high (Red/Orange spectrum) */}
          <Bar
            dataKey="acc_low"
            stackId="acc"
            name="Accel Low"
            fill="#dc2626" // Dark red
          />
          <Bar
            dataKey="acc_med"
            stackId="acc"
            name="Accel Med"
            fill="#ea580c" // Medium orange-red
          />
          <Bar
            dataKey="acc_high"
            stackId="acc"
            name="Accel High"
            fill="#f97316" // Light orange-red
          />

          {/* Group 2: Total Decels -> stacked by low/med/high (Blue spectrum) */}
          <Bar
            dataKey="dec_low"
            stackId="dec"
            name="Decel Low"
            fill="#1e40af" // Dark blue
          />
          <Bar
            dataKey="dec_med"
            stackId="dec"
            name="Decel Med"
            fill="#1d4ed8" // Medium blue
          />
          <Bar
            dataKey="dec_high"
            stackId="dec"
            name="Decel High"
            fill="#3b82f6" // Light blue
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
