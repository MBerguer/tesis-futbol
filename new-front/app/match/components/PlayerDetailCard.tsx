"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceArea } from "recharts";

export interface MiniEntry { player_display_name: string; speed: number; seconds_since_midnight: number }
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

function PlayerDetailCardBase({
  name,
  entries,
  windows,
  sprints,
  onOpenAnalysisAt,
}: {
  name: string;
  entries: MiniEntry[];
  windows?: Array<{ start: number; end: number; distance?: number; start_abs?: number; end_abs?: number; start_adj?: number; end_adj?: number }>;
  sprints?: SprintItem[];
  onOpenAnalysisAt?: (absoluteSecond?: number | null) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = React.useState<boolean>(false);
  const [expanded, setExpanded] = React.useState<boolean>(true);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { setIsVisible(true); } else { setIsVisible(false); }
      }
    }, { root: null, rootMargin: '200px', threshold: 0.01 });
    io.observe(el);
    return () => { try { io.disconnect(); } catch {} };
  }, []);

  const initials = React.useMemo(() => name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(), [name]);
  const normWindows = React.useMemo(() => {
    if (!isVisible || !entries || entries.length === 0) return [] as Array<{start:number; end:number; distance?: number}>;
    const minX = entries[0].seconds_since_midnight;
    const maxX = entries[entries.length-1].seconds_since_midnight;
    return (windows || [])
      .map(w=>{
        const startRaw = (typeof w.start_adj === 'number') ? w.start_adj : w.start;
        const endRaw = (typeof w.end_adj === 'number') ? w.end_adj : w.end;
        return ({ start: Math.max(minX, startRaw), end: Math.min(maxX, endRaw), distance: w.distance });
      })
      .filter(w=>w.start < w.end);
  }, [isVisible, entries, windows]);

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

  const wcsList = React.useMemo(() => {
    if (!expanded || !isVisible) return null;
    return (
      <div className="text-xs text-zinc-300 mb-3">
        <div className="text-zinc-200 text-base mb-1">Worst Cases (≥19.8)</div>
        <div className="flex flex-wrap gap-1.5">
          {normWindows.map((w, i)=> (
            <React.Fragment key={i}>
              <span className="inline-flex items-center rounded-md font-bold text-base bg-pink-900/50 px-1.5 py-0.5">
                Time: {formatSoccer(w.start)} – {formatSoccer(w.end)}
              </span>
              <span className="inline-flex items-center rounded-md font-bold text-base bg-green-900/50 px-1.5 py-0.5">
                {typeof w.distance === 'number' ? <> Distance: {w.distance.toFixed(2)} m</> : null}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }, [expanded, isVisible, normWindows]);

  const sprintsList = React.useMemo(() => {
    if (!expanded || !isVisible || !sprints || sprints.length === 0) return null;
    return (
      <div className="text-xs text-zinc-300">
        <div className="text-zinc-200 text-base mt-3 mb-1">Sprints in Worst Cases (≥25.2 km/h)</div>
        <div className="space-y-1">
          {sprints.map((sp)=> (
            <div key={sp.sprint_id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1">
              <div className="text-zinc-300">
                <button className="underline decoration-dotted hover:text-zinc-100" onClick={()=>{
                  if (!onOpenAnalysisAt) return;
                  const sprintStartAbs = parseHmsToSec(sp.sprint_start_time);
                  const w = (windows||[]).find(wc => typeof wc.start_abs === 'number' && typeof wc.end_abs === 'number' && sprintStartAbs >= (wc.start_abs as number) && sprintStartAbs <= (wc.end_abs as number));
                  const centralStart = (w && typeof w.start_adj === 'number') ? (w.start_adj as number) : undefined;
                  onOpenAnalysisAt(centralStart ?? 0);
                }}>
                  Sprint #{sp.sprint_id}
                </button>
              </div>
              <div className="text-zinc-400">Duration: {parseHmsToSec(sp.sprint_end_time) - parseHmsToSec(sp.sprint_start_time)} s</div>
              <div className="text-zinc-400">Max: {sp.max_speed_reached_within_sprint.toFixed(2)} km/h</div>
              <div className="text-zinc-400">Dist: {sp.total_sprint_distance.toFixed(2)} m</div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [expanded, isVisible, sprints, windows, onOpenAnalysisAt]);

  return (
    <div
      ref={containerRef}
      className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3"
      style={{ contentVisibility: 'auto' as any, containIntrinsicSize: '220px' as any }}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
        {/* Left column: name + Chart (2/5) */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 text-zinc-300 grid place-items-center text-xs font-medium">{initials}</div>
            <div className="text-sm font-medium text-zinc-200 truncate" title={name}>{name}</div>
            <button className="ml-auto text-xs text-zinc-400 hover:text-zinc-200" onClick={()=>setExpanded(v=>!v)}>{expanded ? 'Hide' : 'Show'} details</button>
          </div>
          {isVisible ? (
            <div className="h-28 rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={entries} margin={{ top: 2, right: 0, left: -20, bottom: 0 }}>
                  <XAxis type="number" dataKey="seconds_since_midnight" domain={["dataMin","dataMax"]} allowDataOverflow hide />
                  <YAxis hide domain={[0, 36]} />
                  {normWindows.map((w, idx)=> (
                    <ReferenceArea key={idx} x1={w.start} x2={w.end} fill="rgb(131 24 67)" ifOverflow="extendDomain" />
                  ))}
                  <Line type="monotone" dot={false} dataKey="speed" stroke="#3b82f6" strokeWidth={1.5} isAnimationActive={false} animationDuration={0} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-28 rounded-md border border-zinc-800 bg-zinc-900/60" />
          )}
        </div>
        {/* Right column: WCS + Sprints (3/5) */}
        <div className="md:col-span-2 mt-3">
          {wcsList}
          {sprintsList}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PlayerDetailCardBase);



