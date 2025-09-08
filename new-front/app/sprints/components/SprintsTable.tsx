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
}

export default function SprintsTable({ data }: SprintsTableProps) {
  if (!data || data.length === 0) return <div>No sprints</div>;
  return (
    <div className="overflow-x-auto max-h-[400px]">
      <table className="min-w-full">
        <thead className="sticky top-0 bg-white">
          <tr>
            <th className="px-4 py-2">Player</th>
            <th className="px-4 py-2">Sprint ID</th>
            <th className="px-4 py-2">Start Time</th>
            <th className="px-4 py-2">End Time</th>
            <th className="px-4 py-2">Min Speed</th>
            <th className="px-4 py-2">Max Speed</th>
            <th className="px-4 py-2">Distance (m)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2">{s.player_display_name}</td>
              <td className="px-4 py-2">{s.sprint_id}</td>
              <td className="px-4 py-2">{s.sprint_start_time}</td>
              <td className="px-4 py-2">{s.sprint_end_time}</td>
              <td className="px-4 py-2">{s.min_speed_reached_within_sprint.toFixed(2)}</td>
              <td className="px-4 py-2">{s.max_speed_reached_within_sprint.toFixed(2)}</td>
              <td className="px-4 py-2">{s.total_sprint_distance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


