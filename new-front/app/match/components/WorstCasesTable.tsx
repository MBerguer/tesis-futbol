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

export default function WorstCasesTable({ data, highlightedPlayer }: WorstCasesTableProps) {
  if (!data || data.length === 0) return <div>No worst cases</div>;
  return (
    <div className="space-y-2">
      {data.map((wc, i) => {
        const initials = wc.player_display_name
          .split(' ')
          .map(p => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <div key={i} className={`flex items-center justify-between rounded-md border px-3 py-2 hover:border-zinc-700 ${highlightedPlayer===wc.player_display_name ? 'border-sky-500 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/40'}`}>
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-zinc-800 text-zinc-300 grid place-items-center text-xs font-medium">
                {initials}
              </div>
              <div className="text-sm text-zinc-200">{wc.player_display_name}</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-300">
              <div><span className="text-zinc-500">Start:</span> {formatMatchTime(wc.start_second)}</div>
              <div><span className="text-zinc-500">End:</span> {formatMatchTime(wc.end_second)}</div>
              <div className="min-w-[120px] text-right"><span className="text-zinc-500">Distance:</span> {wc.distance_covered.toFixed(2)} m</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}



