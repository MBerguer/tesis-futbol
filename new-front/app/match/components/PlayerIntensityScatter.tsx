"use client";

import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export interface AccelerationRowForScatter {
  id: number;
  player_display_name: string;
  values: number[]; // as defined in page: [Total Accels, Accel Low, Accel Med, Accel High, Total Decels, Decel Low, Decel Med, Decel High, Distance (m), Time (s)]
}

interface PlayerIntensityScatterProps {
  rows: AccelerationRowForScatter[];
  useDecelerationsOnX?: boolean; // if true X = Total Decels, else X = Total Accels
  outputMetric?: "distance" | "time"; // Y-axis: distance (m) or time (s)
  bubbleBy?: "acc_high" | "dec_high"; // bubble size by high intensity
  maxPlayers?: number;
}

function buildScatterData(
  rows: AccelerationRowForScatter[],
  opts: {
    useDecels: boolean;
    output: "distance" | "time";
    bubble: "acc_high" | "dec_high";
    maxPlayers: number;
  }
) {
  const limited = rows.slice(0, Math.max(0, opts.maxPlayers));
  return limited.map((r) => {
    const x = opts.useDecels ? r.values?.[4] ?? 0 : r.values?.[0] ?? 0;
    const y =
      opts.output === "distance" ? r.values?.[8] ?? 0 : r.values?.[9] ?? 0;
    const z =
      opts.bubble === "acc_high" ? r.values?.[3] ?? 0 : r.values?.[7] ?? 0;
    return { player: r.player_display_name, x, y, z };
  });
}

export default function PlayerIntensityScatter({
  rows,
  useDecelerationsOnX = false,
  outputMetric = "distance",
  bubbleBy = "acc_high",
  maxPlayers = 20,
}: PlayerIntensityScatterProps) {
  const data = React.useMemo(
    () =>
      buildScatterData(rows || [], {
        useDecels: useDecelerationsOnX,
        output: outputMetric,
        bubble: bubbleBy,
        maxPlayers,
      }),
    [rows, useDecelerationsOnX, outputMetric, bubbleBy, maxPlayers]
  );

  const xLabel = useDecelerationsOnX ? "Total Decels" : "Total Accels";
  const yLabel = outputMetric === "distance" ? "Distance (m)" : "Time (s)";
  const zLabel = bubbleBy === "acc_high" ? "Accel High" : "Decel High";

  return (
    <div className="h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
              fontFamily: "inherit",
            }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
              fontFamily: "inherit",
            }}
            stroke="hsl(var(--border))"
          />
          <ZAxis type="number" dataKey="z" name={zLabel} range={[60, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
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
          <Scatter
            data={data}
            name="Players"
            fill="hsl(var(--chart-1))"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
