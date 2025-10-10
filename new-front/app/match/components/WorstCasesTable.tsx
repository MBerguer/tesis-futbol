"use client";

import React from "react";
import { formatMatchTime } from "../utils/time";

export interface WorstCase {
  player_display_name: string;
  start_second: number;
  end_second: number;
  distance_covered: number;
}

interface WorstCasesTableProps {
  data: WorstCase[];
  highlightedPlayer?: string | null;
}

export default function WorstCasesTable({
  data,
  highlightedPlayer,
}: WorstCasesTableProps) {
  if (!data || data.length === 0) return <div>No worst cases</div>;
  return (
    <div className="space-y-2">
      {data.map((wc, i) => {
        const initials = wc.player_display_name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <div
            key={i}
            className={`flex items-center justify-between rounded-md border px-3 py-2 hover:border-ring ${
              highlightedPlayer === wc.player_display_name
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground grid place-items-center text-xs font-medium">
                {initials}
              </div>
              <div className="text-sm text-foreground">
                {wc.player_display_name}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div>
                <span className="text-muted-foreground">Start:</span>{" "}
                {formatMatchTime(wc.start_second)}
              </div>
              <div>
                <span className="text-muted-foreground">End:</span>{" "}
                {formatMatchTime(wc.end_second)}
              </div>
              <div className="min-w-[120px] text-right">
                <span className="text-muted-foreground">Distance:</span>{" "}
                {wc.distance_covered.toFixed(2)} m
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
