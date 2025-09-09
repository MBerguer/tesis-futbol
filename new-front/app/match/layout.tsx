"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Skeleton from "./sprints/components/Skeleton";
import SideNav from "./components/SideNav";
import { MatchProvider } from "./context";

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [matchTables, setMatchTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [fullWidth, setFullWidth] = useState<boolean>(false);

  const selectedTable = useMemo(() => searchParams.get('table'), [searchParams]);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    // restore sidebar state
    try {
      const v = localStorage.getItem('sidenav_collapsed');
      if (v === '1') setCollapsed(true);
    } catch {}
    try {
      const w = localStorage.getItem('content_fullwidth');
      if (w === '1') setFullWidth(true);
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
    fetchMatchTables();
  }, [API_BASE]);

  const handleTableSelect = (tableName: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('table', tableName);
    router.replace(`${pathname}?${url.searchParams.toString()}`);
    try { localStorage.setItem('lastTable', tableName); } catch {}
    setReloadToken((x)=>x+1);
  };

  const section = useMemo(() => {
    const s = searchParams.get('section');
    if (s === 'overview' || s === 'players') return s;
    return 'overview';
  }, [searchParams]);

  const makeHref = (targetSection: 'overview' | 'players') => {
    const qp = new URLSearchParams(searchParams.toString());
    qp.set('section', targetSection);
    const query = Object.fromEntries(qp.entries());
    const path = '/match/sprints';
    return { pathname: path, query } as any;
  };

  return (
    <MatchProvider value={{
      selectedTable,
      setSelectedTable: (t: string | null) => {
        const url = new URL(window.location.href);
        if (t) url.searchParams.set('table', t); else url.searchParams.delete('table');
        router.replace(`${pathname}?${url.searchParams.toString()}`);
        try { if (t) localStorage.setItem('lastTable', t); } catch {}
        setReloadToken((x)=>x+1);
      },
      reloadToken,
      reload: () => setReloadToken((x)=>x+1),
      fullWidth
    }}>
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <SideNav
        collapsed={collapsed}
        onToggle={()=>{ setCollapsed(v=>{ const nv = !v; try { localStorage.setItem('sidenav_collapsed', nv ? '1' : '0'); } catch {} return nv; }); }}
        loadingTables={loadingTables}
        tables={matchTables}
        selectedTable={selectedTable}
        onSelect={handleTableSelect}
      />
      <div className="flex-1 min-w-0">
        <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} p-4 md:p-6`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xl font-semibold">Partido</div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFullWidth(v => { const nv = !v; try { localStorage.setItem('content_fullwidth', nv ? '1' : '0'); } catch {} return nv; })}
                className={`${fullWidth ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-900/50 text-zinc-300 border-zinc-800 hover:border-zinc-700'} border px-3 py-1.5 rounded-md text-sm`}
                title={fullWidth ? 'Switch to centered width' : 'Expand to full width'}
              >
                {fullWidth ? 'Centered' : 'Full width'}
              </button>
              <Link href={makeHref('overview')} className={`${section==='overview' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-900/50 text-zinc-300 border-zinc-800 hover:border-zinc-700'} border px-3 py-1.5 rounded-md text-sm`}>Overview</Link>
              <Link href={makeHref('players')} className={`${section==='players' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-900/50 text-zinc-300 border-zinc-800 hover:border-zinc-700'} border px-3 py-1.5 rounded-md text-sm`}>Players</Link>
            </div>
          </div>
        </div>
        <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-4 md:px-6`}>{children}</div>
      </div>
    </div>
    </MatchProvider>
  );
}


