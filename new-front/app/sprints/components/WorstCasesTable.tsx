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
}

export default function WorstCasesTable({ data }: WorstCasesTableProps) {
  if (!data || data.length === 0) return <div>No worst cases</div>;
  return (
    <div className="overflow-x-auto max-h-[400px]">
      <table className="min-w-full">
        <thead className="sticky top-0 bg-white">
          <tr>
            <th className="px-4 py-2">Player</th>
            <th className="px-4 py-2">Start Time</th>
            <th className="px-4 py-2">End Time</th>
            <th className="px-4 py-2">Distance (m)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((wc, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2">{wc.player_display_name}</td>
              <td className="px-4 py-2">{formatMatchTime(wc.start_second)}</td>
              <td className="px-4 py-2">{formatMatchTime(wc.end_second)}</td>
              <td className="px-4 py-2">{wc.distance_covered.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


