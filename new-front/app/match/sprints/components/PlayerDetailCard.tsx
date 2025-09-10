"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceArea } from "recharts";

export interface MiniEntry { player_display_name: string; speed: number; centralized_elapsed_time: number }
export interface SprintItem {
  player_display_name: string;
  sprint_id: number;
  start_second: number;
  end_second: number;
  sprint_start_time: string;
  sprint_end_time: string;
  total_sprint_distance: number;
  min_speed_reached_within_sprint: number;
  max_speed_reached_within_sprint: number;
}

export default function PlayerDetailCard({
  name,
  entries,
  windows,
  sprints,
}: {
  name: string;
  entries: MiniEntry[];
  windows?: Array<{ start: number; end: number; distance?: number, start_adj: number, end_adj: number }>;
  sprints?: SprintItem[];
}) {
  const initials = React.useMemo(() => name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(), [name]);
  const normWindows = React.useMemo(() => {
    if (!entries || entries.length === 0) return [] as Array<{start:number; end:number; distance?: number}>;
    const minX = entries[0].centralized_elapsed_time;
    const maxX = entries[entries.length-1].centralized_elapsed_time;
    return (windows || [])
      .map(w=>({ start: Math.max(minX, w.start), end: Math.min(maxX, w.end), start_adj: Math.max(minX, w.start_adj), end_adj: Math.min(maxX, w.end_adj), distance: w.distance }))
      .filter(w=>w.start < w.end);
  }, [entries, windows]);

  const formatSoccer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const mm = String(m).padStart(2,'0');
    const ss = String(s).padStart(2,'0');
    return `${mm}:${ss}`;
  };

  const parseHmsToSec = (t?: string) => {
    if (!t) return 0;
    const m = t.match(/^(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return 0;
    const h = parseInt(m[1]||'0',10), mi = parseInt(m[2]||'0',10), s = parseInt(m[3]||'0',10);
    return h*3600 + mi*60 + s;
  };

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
        {/* Left column: name + Chart (2/5) */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 text-zinc-300 grid place-items-center text-xs font-medium">{initials}</div>
            <div className="text-sm font-medium text-zinc-200 truncate" title={name}>{name}</div>
          </div>
          <div className="h-28 rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={entries} margin={{ top: 2, right: 0, left: -20, bottom: 0 }}>
                <XAxis type="number" dataKey="centralized_elapsed_time" domain={["dataMin","dataMax"]} allowDataOverflow hide />
                <YAxis hide domain={[0, 36]} />
                {normWindows.map((w, idx)=> (
                  <ReferenceArea key={idx} x1={w.start} x2={w.end} fill="rgb(131 24 67)" ifOverflow="extendDomain" />
                ))}
                <Line type="monotone" dot={false} dataKey="speed" stroke="#3b82f6" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Right column: WCS + Sprints (3/5) */}
        <div className="md:col-span-2 mt-3">
          {normWindows.length > 0 && (
            <div className="text-xs text-zinc-300 mb-3">
              <div className="text-zinc-200 text-base mb-1">Worst Cases (≥19.8)</div>
              <div className="flex flex-wrap gap-1.5">
                {normWindows.map((w, i)=> (
                  <>
                  <span key={i} className="inline-flex items-center rounded-md font-bold text-base bg-pink-900/50 px-1.5 py-0.5">
                    Time: {formatSoccer(w.start_adj)} – {formatSoccer(w.end_adj)}
                    </span>
                  <span key={i} className="inline-flex items-center rounded-md font-bold text-base bg-green-900/50 px-1.5 py-0.5">                  
                  {typeof w.distance === 'number' ? (
                    <> Distance: {w.distance.toFixed(2)} m</>
                  ) : null}
                </span></>
                ))}
              </div>
            </div>
          )}

          {sprints && sprints.length > 0 && (
            <div className="text-xs text-zinc-300">
              <div className="text-zinc-200 text-base mt-3 mb-1">Sprints in Worst Cases (≥25.2 km/h)</div>
              <div className="space-y-1">
                {sprints.map((sp)=> {                  
                  return (
                    <div key={sp.sprint_id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                      <div className="text-zinc-300">
                        Sprint #
                        {sp.sprint_id}
                        </div>
                      <div className="text-zinc-400">Duration: {parseHmsToSec(sp.sprint_end_time) - parseHmsToSec(sp.sprint_start_time)} s</div>
                      <div className="text-zinc-400">Max: {sp.max_speed_reached_within_sprint.toFixed(2)} km/h</div>
                      <div className="text-zinc-400">Dist: {sp.total_sprint_distance.toFixed(2)} m</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


