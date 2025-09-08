"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../players/components/ui/card";
import Skeleton from "./sprints/components/Skeleton";
import MatchSelector from "./sprints/components/MatchSelector";
import { MatchProvider } from "./context";

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [matchTables, setMatchTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const selectedTable = useMemo(() => searchParams.get('table'), [searchParams]);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
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
      reload: () => setReloadToken((x)=>x+1)
    }}>
    <div className="bg-gray-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Match Tables</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTables ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : (
                <MatchSelector tables={matchTables} selected={selectedTable} onSelect={handleTableSelect} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl font-bold">Partido</div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Link href={makeHref('overview')} className={`${section==='overview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} border px-3 py-1 rounded`}>Overview</Link>
              <Link href={makeHref('players')} className={`${section==='players' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} border px-3 py-1 rounded`}>Players</Link>
            </div>
          </div>

          <div className="bg-transparent">{children}</div>
        </div>
      </div>
    </div>
    </MatchProvider>
  );
}


