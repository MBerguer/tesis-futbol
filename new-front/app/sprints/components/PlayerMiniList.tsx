"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";

export interface MiniEntry { player_display_name: string; speed: number; centralized_elapsed_time: number }

interface Props {
  entries: MiniEntry[];
}

export default function PlayerMiniList({ entries }: Props) {
  const byPlayer = React.useMemo(() => {
    const m: Record<string, MiniEntry[]> = {};
    for (const e of entries) {
      (m[e.player_display_name] ||= []).push(e);
    }
    Object.keys(m).forEach(k => m[k].sort((a,b)=>a.centralized_elapsed_time-b.centralized_elapsed_time));
    return m;
  }, [entries]);
  const players = Object.keys(byPlayer);
  if (players.length === 0) return <div className="text-sm text-zinc-500">No players</div>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {players.map((p) => (
        <div key={p} className="flex items-center gap-3 rounded border p-2">
          <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-xs">{p.slice(0,2)}</div>
          <div className="flex-1">
            <div className="text-sm font-medium">{p}</div>
            <div className="h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byPlayer[p]} margin={{ top: 2, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="centralized_elapsed_time" hide />
                  <YAxis hide domain={[0, 36]} />
                  <Line type="monotone" dot={false} dataKey="speed" stroke="#3b82f6" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

