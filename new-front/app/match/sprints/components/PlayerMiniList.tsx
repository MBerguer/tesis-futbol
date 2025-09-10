"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";

export interface MiniEntry { player_display_name: string; speed: number; centralized_elapsed_time: number }

interface Props {
  entries: MiniEntry[];
  highlightedPlayer?: string | null;
  onHover?: (player: string | null) => void;
}

export default function PlayerMiniList({ entries, highlightedPlayer, onHover }: Props) {
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
    <div className="grid gap-3 sm:grid-cols-2">
      {players.map((p) => (
        <div
          key={p}
          className={`flex items-center gap-3 rounded-md border px-3 py-2 hover:border-zinc-700 ${highlightedPlayer===p ? 'border-sky-500 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/40'}`}
          onMouseEnter={()=> onHover && onHover(p)}
          onMouseLeave={()=> onHover && onHover(null)}
        >
          <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 grid place-items-center text-xs font-medium">{p.slice(0,2).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-200 truncate">{p}</div>
            <div className="h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byPlayer[p]} margin={{ top: 2, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="centralized_elapsed_time" hide />
                  <YAxis hide domain={[0, 36]} />
                  <Line type="monotone" dot={false} dataKey="speed" stroke="#60a5fa" strokeWidth={1.25} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

