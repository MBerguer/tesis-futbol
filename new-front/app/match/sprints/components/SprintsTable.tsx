"use client";

import React from "react";

export interface SprintInWorstCase {
  player_display_name: string;
  sprint_id: number;
  start_second: number;
  end_second: number;
  sprint_start_time: string;
  sprint_end_time: string;
  total_sprint_distance: number;
  min_speed_reached_within_sprint: number;
  max_speed_reached_within_sprint: number;
  worst_case_distance_covered: number;
}

interface SprintsTableProps {
  data: SprintInWorstCase[];
  highlightedPlayer?: string | null;
}

export default function SprintsTable({ data, highlightedPlayer }: SprintsTableProps) {
  if (!data || data.length === 0) return <div>No sprints</div>;
  return (
    <div className="space-y-2">
      {data.map((s, i) => {
        const initials = s.player_display_name
          .split(' ')
          .map(p => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <div key={i} className={`flex items-center justify-between rounded-md border px-3 py-2 hover:border-zinc-700 ${highlightedPlayer===s.player_display_name ? 'border-sky-500 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/40'}`}>
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-zinc-800 text-zinc-300 grid place-items-center text-xs font-medium">
                {initials}
              </div>
              <div className="text-sm text-zinc-200">{s.player_display_name}</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-300">
              <div><span className="text-zinc-500">Sprint:</span> {s.sprint_id}</div>
              <div><span className="text-zinc-500">Start:</span> {s.sprint_start_time}</div>
              <div><span className="text-zinc-500">End:</span> {s.sprint_end_time}</div>
              <div><span className="text-zinc-500">Min:</span> {s.min_speed_reached_within_sprint.toFixed(2)}</div>
              <div><span className="text-zinc-500">Max:</span> {s.max_speed_reached_within_sprint.toFixed(2)}</div>
              <div className="min-w-[120px] text-right"><span className="text-zinc-500">Dist:</span> {s.total_sprint_distance.toFixed(2)} m</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


