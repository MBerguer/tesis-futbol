"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../dashboard/components/ui/card";
import { Button } from "../dashboard/components/ui/button";

interface MatchTable {
  tables: string[];
}

interface MatchPlayers {
  players: string[];
}

interface MatchEntry {
  player_display_name: string;
  time: string;
  speed: number;
  centralized_elapsed_time: number;
}

interface MatchEntries {
  entries: MatchEntry[];
}

export default function SprintsPage() {
  const [matchTables, setMatchTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [entries, setEntries] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatchTables = async () => {
      try {
        const response = await fetch("http://localhost:8000/match/tables");
        if (!response.ok) {
          throw new Error("Failed to fetch match tables");
        }
        const data: MatchTable = await response.json();
        setMatchTables(data.tables);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMatchTables();
  }, []);

  const handleTableClick = async (tableName: string) => {
    setSelectedTable(tableName);
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/match/table/${tableName}/players`);
      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }
      const data: MatchPlayers = await response.json();
      setPlayers(data.players);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleShowEntries = async () => {
    if (!selectedTable) return;
    
    setLoadingEntries(true);
    try {
      const response = await fetch(`http://localhost:8000/match/table/${selectedTable}/entries`);
      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }
      const data: MatchEntries = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  if (loading && !selectedTable) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <main className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Match Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {matchTables.map((table, index) => (
                <li 
                  key={index} 
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-100 ${
                    selectedTable === table ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleTableClick(table)}
                >
                  {table}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTable ? `Players in ${selectedTable}` : 'Select a match to view players'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading players...</div>
              ) : (
                <ul className="space-y-2">
                  {players.map((player, index) => (
                    <li key={index} className="p-2 border rounded">
                      {player}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle>Match Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleShowEntries}
                  className="mb-4"
                >
                  Show Player First Appearances
                </Button>
                {loadingEntries ? (
                  <div>Loading entries...</div>
                ) : entries && entries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-2">Player</th>
                          <th className="px-4 py-2">Time</th>
                          <th className="px-4 py-2">Speed</th>
                          <th className="px-4 py-2">Centralized Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, index) => (
                          console.log(entry),
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{entry.player_display_name}</td>
                            <td className="px-4 py-2">{entry.time}</td>
                            <td className="px-4 py-2">{entry.speed.toFixed(2)}</td>
                            <td className="px-4 py-2">{entry.centralized_elapsed_time.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div>No entries to show</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
} 