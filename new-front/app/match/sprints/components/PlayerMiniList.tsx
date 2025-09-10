"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceArea } from "recharts";

export interface MiniEntry { player_display_name: string; speed: number; centralized_elapsed_time: number }

interface Props {
  entries: MiniEntry[];
  highlightedPlayer?: string | null;
  onHover?: (player: string | null) => void;
  singleColumn?: boolean;
  highlights?: Record<string, Array<{ start: number; end: number }>>;
}

export default function PlayerMiniList({ entries, highlightedPlayer, onHover, singleColumn, highlights }: Props) {
  const byPlayer = React.useMemo(() => {
    const m: Record<string, MiniEntry[]> = {};
    for (const e of entries) {
      (m[e.player_display_name] ||= []).push(e);
    }
    Object.keys(m).forEach(k => m[k].sort((a,b)=>a.centralized_elapsed_time-b.centralized_elapsed_time));
    return m;
  }, [entries]);
  const players = Object.keys(byPlayer);
  React.useEffect(() => {
    try {
      console.log('[PlayerMiniList] players', players.length);
      console.log('[PlayerMiniList] highlight keys', Object.keys(highlights || {}));
    } catch {}
  }, [players.length, highlights]);
  if (players.length === 0) return <div className="text-sm text-zinc-500">No players</div>;
  const norm = (s: string) => (s||'').trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .toLowerCase();
  return (
    <div className={`grid gap-3 ${singleColumn ? '' : 'sm:grid-cols-2'}`}>
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
                  <XAxis type="number" dataKey="centralized_elapsed_time" domain={["dataMin","dataMax"]} allowDataOverflow hide />
                  <YAxis hide domain={[0, 36]} />
                  {(() => {
                    const arr = byPlayer[p];
                    const minX = arr.length ? arr[0].centralized_elapsed_time : undefined;
                    const maxX = arr.length ? arr[arr.length - 1].centralized_elapsed_time : undefined;
                    const hs = highlights?.[norm(p)] || [];
                    try { console.debug('mini-highlight-range', {p, norm: norm(p), minX, maxX, windows: hs}); } catch {}
                    if (minX === undefined || maxX === undefined || hs.length === 0) return null as any;
                    return hs
                      .map(w => ({ start: Math.max(minX, w.start), end: Math.min(maxX, w.end) }))
                      .filter(w => w.start < w.end)
                      .map((w, idx) => (
                        <ReferenceArea key={idx} x1={w.start} x2={w.end} fill="#FAF" ifOverflow="extendDomain"/>
                      ));
                  })()}
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

