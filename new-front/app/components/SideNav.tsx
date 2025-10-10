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
  matches: Array<{
    match_id: string;
    match_date: string;
    category?: string | null;
    home_team_id: string;
    away_team_id: string;
    result_home: number;
    result_away: number;
    home_team_name?: string | null;
    away_team_name?: string | null;
  }>;
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string) => void;
}

export default function SideNav({
  collapsed,
  onToggle,
  loadingTables,
  tables,
  selectedTable,
  onSelect,
  loadingMatches,
  matches,
  selectedMatchId,
  onSelectMatch,
}: SideNavProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query) return tables;
    const q = query.toLowerCase();
    return tables.filter((t) => t.toLowerCase().includes(q));
  }, [tables, query]);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-72"
      } sticky top-0 h-screen overflow-hidden transition-all duration-300 ease-in-out bg-card border-r border-border flex flex-col shadow-lg z-50`}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:border-ring text-foreground hover:bg-accent transition-all duration-200 hover:scale-105"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`${collapsed ? "" : "rotate-180"} transition-transform`}
          >
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 010 1.06L9.085 10l3.704 3.71a.75.75 0 11-1.06 1.06l-4.24-4.24a.75.75 0 010-1.06l4.24-4.24a.75.75 0 011.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {!collapsed && (
          <div className="text-sm font-semibold text-foreground">Dashboard</div>
        )}
      </div>

      <div className="px-3 py-3 border-b border-border flex flex-col gap-2">
        {collapsed ? (
          <nav className="flex flex-col gap-1">
            <Link
              href="/players"
              title="Active Players"
              className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
            >
              AP
            </Link>
            <Link
              href="/plantel"
              title="Full Plantel"
              className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
            >
              FP
            </Link>
            <Link
              href="/week-preparation"
              title="Week preparation"
              className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
            >
              WP
            </Link>
            <Link
              href="/upload"
              title="Upload PDF + CSV"
              className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
            >
              UP
            </Link>
            <Link
              href="/admin"
              title="Admin"
              className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
            >
              AD
            </Link>
          </nav>
        ) : (
          <>
            <div className="text-xs uppercase text-muted-foreground">
              Sections
            </div>
            <nav className="flex flex-col gap-1">
              <Link
                href="/players"
                className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
              >
                Active Players
              </Link>
              <Link
                href="/plantel"
                className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
              >
                Full Plantel
              </Link>
              <Link
                href="/week-preparation"
                className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
              >
                Week preparation
              </Link>
              <Link
                href="/upload"
                className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
              >
                Upload PDF + CSV
              </Link>
              <Link
                href="/admin"
                className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent border border-transparent hover:border-border transition-all duration-200 hover:scale-105"
              >
                Admin
              </Link>
            </nav>
          </>
        )}
      </div>

      <div className="px-3 py-3 flex-1 overflow-auto">
        {!collapsed && (
          <>
            <div className="text-xs uppercase text-muted-foreground mb-2">
              Matches
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-9 rounded-md bg-background border border-input px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </>
        )}

        <div className={`${collapsed ? "px-1" : "mt-2"} space-y-1`}>
          {loadingMatches ? (
            <>
              <div className="h-9 rounded-md bg-muted animate-pulse" />
              <div className="h-9 rounded-md bg-muted animate-pulse" />
              <div className="h-9 rounded-md bg-muted animate-pulse" />
            </>
          ) : (
            (matches || [])
              .filter((m) => {
                if (!query) return true;
                const q = query.toLowerCase();
                const home = (m.home_team_name || "").toLowerCase();
                const away = (m.away_team_name || "").toLowerCase();
                return (
                  (m.category || "").toLowerCase().includes(q) ||
                  m.match_date.toLowerCase().includes(q) ||
                  m.match_id.toLowerCase().includes(q) ||
                  home.includes(q) ||
                  away.includes(q)
                );
              })
              .sort(
                (a, b) =>
                  new Date(a.match_date).getTime() -
                  new Date(b.match_date).getTime()
              )
              .map((m) => {
                const dateStr = new Date(m.match_date).toLocaleDateString();
                const teams =
                  m.home_team_name && m.away_team_name
                    ? `${m.home_team_name} vs ${m.away_team_name}`
                    : `${m.home_team_id.slice(0, 4)}… vs ${m.away_team_id.slice(
                        0,
                        4
                      )}…`;
                return (
                  <button
                    key={m.match_id}
                    title={`${teams} · ${dateStr}${
                      m.category ? " · " + m.category : ""
                    }`}
                    onClick={() => onSelectMatch(m.match_id)}
                    className={`justify-center w-full inline-flex items-center gap-1 rounded-md border ${
                      selectedMatchId === m.match_id
                        ? "border-primary bg-primary/10 text-primary-foreground"
                        : "border-border text-foreground hover:border-ring hover:bg-accent"
                    } px-2 py-2 text-sm transition-colors`}
                  >
                    {collapsed ? (
                      teams
                        .replace(/nacional/gi, "")
                        .replace(/vs/gi, "")
                        .trim()
                        .slice(0, 2)
                    ) : (
                      <>
                        <div className="text-left w-2/3">
                          {teams}
                          {m.category && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {m.category}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground w-1/3">
                          {dateStr}
                        </div>
                      </>
                    )}
                  </button>
                );
              })
          )}
        </div>
      </div>
    </aside>
  );
}
