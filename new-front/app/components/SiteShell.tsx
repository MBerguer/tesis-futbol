"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SideNav from "./SideNav";
import { MatchProvider } from "../match/context";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [matchTables, setMatchTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [matches, setMatches] = useState<Array<{ match_id: string; match_date: string; category?: string | null; home_team_id: string; away_team_id: string; result_home: number; result_away: number }>>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [fullWidth, setFullWidth] = useState<boolean>(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const selectedTable = useMemo(() => searchParams.get('table'), [searchParams]);
  const selectedMatchId = useMemo(() => searchParams.get('match'), [searchParams]);

  useEffect(() => {
    try {
      const v = localStorage.getItem('sidenav_collapsed');
      if (v === '1') setCollapsed(true);
    } catch {}
    try {
      const fw = localStorage.getItem('content_fullwidth');
      if (fw === '1') setFullWidth(true);
    } catch {}
    const fetchMatchTables = async () => {
      try {
        const res = await fetch(`${API_BASE}/match/tables`);
        if (!res.ok) throw new Error("Failed to fetch match tables");
        const data: { tables: string[] } = await res.json();
        setMatchTables(data.tables);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTables(false);
      }
    };
    const fetchMatches = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/matches`);
        if (!res.ok) throw new Error("Failed to fetch matches");
        const data = await res.json();
        setMatches(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchMatchTables();
    fetchMatches();
  }, [API_BASE]);

  const handleTableSelect = (tableName: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('table', tableName);
    router.replace(`${pathname}?${url.searchParams.toString()}`);
    try { localStorage.setItem('lastTable', tableName); } catch {}
    setReloadToken(x => x + 1);
  };

  const handleMatchSelect = (matchId: string) => {
    router.replace(`/match?match=${matchId}`);
    try { localStorage.setItem('lastMatchId', matchId); } catch {}
    setReloadToken(x => x + 1);
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <SideNav
        collapsed={collapsed}
        onToggle={()=>{ setCollapsed(v=>{ const nv = !v; try { localStorage.setItem('sidenav_collapsed', nv ? '1' : '0'); } catch {} return nv; }); }}
        loadingTables={loadingTables}
        tables={matchTables}
        selectedTable={selectedTable}
        onSelect={handleTableSelect}
        loadingMatches={loadingMatches}
        matches={matches}
        selectedMatchId={selectedMatchId}
        onSelectMatch={handleMatchSelect}
      />
      <div className="flex-1 min-w-0">
        <MatchProvider value={{
          selectedTable,
          setSelectedTable: (t: string | null) => {
            const url = new URL(window.location.href);
            if (t) url.searchParams.set('table', t); else url.searchParams.delete('table');
            router.replace(`${pathname}?${url.searchParams.toString()}`);
            try { if (t) localStorage.setItem('lastTable', t); } catch {}
            setReloadToken((x)=>x+1);
          },
          selectedMatchId,
          setSelectedMatchId: (id: string | null) => {
            const url = new URL(window.location.href);
            if (id) url.searchParams.set('match', id); else url.searchParams.delete('match');
            router.replace(`${pathname}?${url.searchParams.toString()}`);
            try { if (id) localStorage.setItem('lastMatchId', id); } catch {}
            setReloadToken((x)=>x+1);
          },
          reloadToken,
          reload: () => setReloadToken((x)=>x+1),
          fullWidth
        }}>
          <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} p-4 md:p-6`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullWidth(v => { const nv = !v; try { localStorage.setItem('content_fullwidth', nv ? '1' : '0'); } catch {} return nv; })}
                  className={`${fullWidth ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-900/50 text-zinc-300 border-zinc-800 hover:border-zinc-700'} border px-3 py-1.5 rounded-md text-sm`}
                  title={fullWidth ? 'Switch to centered width' : 'Expand to full width'}
                >
                  {fullWidth ? 'Centered' : 'Full width'}
                </button>
              </div>
            </div>
          </div>
          <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-4 md:px-6`}>{children}</div>
        </MatchProvider>
      </div>
    </div>
  );
}


