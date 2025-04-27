"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../dashboard/components/ui/card";

interface MatchTable {
  tables: string[];
}

interface MatchPlayers {
  players: string[];
}

export default function SprintsPage() {
  const [matchTables, setMatchTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
      </div>
    </main>
  );
} 