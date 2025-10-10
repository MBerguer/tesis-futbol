"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  thresholds?: { match: number; halftime: number; kickoff: number } | null;
  vertical?: boolean;
  inChart?: boolean;
  className?: string;
}

export default function ThresholdLegend({
  thresholds,
  vertical,
  inChart,
  className,
}: Props) {
  if (!thresholds) return null;

  const Item = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <div
      className={`${
        vertical ? "flex flex-col gap-2" : "flex items-center gap-4"
      } ${
        inChart
          ? "rounded-md bg-card border border-border px-3 py-2 shadow-sm"
          : ""
      } ${className || ""}`}
    >
      <Item color="hsl(var(--chart-3))" label="25.2 km/h" />
      <Item color="hsl(var(--destructive))" label="19.8 km/h" />
      <Item color="hsl(var(--chart-2))" label="11 km/h" />
      <Item color="hsl(var(--chart-1))" label="5.9 km/h" />
    </div>
  );
}
