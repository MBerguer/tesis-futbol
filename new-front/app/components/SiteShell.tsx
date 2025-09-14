"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SideNav from "./SideNav";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [matchTables, setMatchTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const selectedTable = useMemo(() => searchParams.get('table'), [searchParams]);

  useEffect(() => {
    try {
      const v = localStorage.getItem('sidenav_collapsed');
      if (v === '1') setCollapsed(true);
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
      />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}


