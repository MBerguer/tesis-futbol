"use client";

import React from "react";
import Link from "next/link";

interface SideNavProps {
  collapsed: boolean;
  onToggle: () => void;
  loadingTables: boolean;
  tables: string[];
  selectedTable: string | null;
  onSelect: (table: string) => void;
  loadingMatches: boolean;
  matches: Array<{ match_id: string; match_date: string; category?: string | null; home_team_id: string; away_team_id: string; result_home: number; result_away: number }>;
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string) => void;
}

export default function SideNav({ collapsed, onToggle, loadingTables, tables, selectedTable, onSelect, loadingMatches, matches, selectedMatchId, onSelectMatch }: SideNavProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query) return tables;
    const q = query.toLowerCase();
    return tables.filter(t => t.toLowerCase().includes(q));
  }, [tables, query]);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-72'} transition-all duration-200 ease-in-out bg-zinc-900/60 border-r border-zinc-800 min-h-screen flex flex-col`}>      
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-800">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-200"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className={`${collapsed ? '' : 'rotate-180'} transition-transform`}>
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.085 10l3.704 3.71a.75.75 0 11-1.06 1.06l-4.24-4.24a.75.75 0 010-1.06l4.24-4.24a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </button>
        {!collapsed && <div className="text-sm font-semibold">Navigation</div>}
      </div>

      {!collapsed && (
        <div className="px-3 py-3 border-b border-zinc-800 flex flex-col gap-2">
          <div className="text-xs uppercase text-zinc-500">Sections</div>
          <nav className="flex flex-col gap-1">
            <Link href="/" className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700">Home</Link>
            <Link href="/mockup" className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700">Mockup</Link>
            <Link href="/players" className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700">Players</Link>
            <Link href="/week-preparation" className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700">Week preparation</Link>
            <Link href="/match" className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700">Match</Link>
          </nav>
        </div>
      )}

      <div className="px-3 py-3 flex-1 overflow-auto">
        {!collapsed && (
          <>
            <div className="text-xs uppercase text-zinc-500 mb-2">Matches</div>
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              className="w-full h-9 rounded-md bg-zinc-900/50 border border-zinc-800 px-2 text-sm text-zinc-200 placeholder:text-zinc-500"
            />
          </>
        )}

        <div className={`${collapsed ? 'px-1' : 'mt-2'} space-y-1`}>
          {loadingMatches ? (
            <>
              <div className="h-9 rounded-md bg-zinc-800/60 animate-pulse" />
              <div className="h-9 rounded-md bg-zinc-800/60 animate-pulse" />
              <div className="h-9 rounded-md bg-zinc-800/60 animate-pulse" />
            </>
          ) : (
            (matches || []).filter(m => {
              if (!query) return true;
              const q = query.toLowerCase();
              return (m.category || '').toLowerCase().includes(q) || m.match_date.toLowerCase().includes(q) || m.match_id.toLowerCase().includes(q);
            }).map((m) => {
              const label = collapsed ? (new Date(m.match_date).toLocaleDateString()) : `${new Date(m.match_date).toLocaleDateString()}${m.category ? ' · ' + m.category : ''}`;
              return (
                <button
                  key={m.match_id}
                  title={label}
                  onClick={() => onSelectMatch(m.match_id)}
                  className={`${collapsed ? 'justify-center' : 'justify-start'} w-full inline-flex items-center gap-2 rounded-md border ${selectedMatchId === m.match_id ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'} px-2 py-2 text-sm transition-colors`}
                >
                  {collapsed ? label : label}
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}



