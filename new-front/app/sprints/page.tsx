"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../dashboard/components/ui/card";
import { Button } from "../dashboard/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const [showTable, setShowTable] = useState(false);

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

  // Group entries by player for the chart
  const playerData = React.useMemo(() => {
    const dataByPlayer: { [key: string]: MatchEntry[] } = {};
    entries.forEach(entry => {
      if (!dataByPlayer[entry.player_display_name]) {
        dataByPlayer[entry.player_display_name] = [];
      }
      dataByPlayer[entry.player_display_name].push(entry);
    });
    // Ordenar por tiempo para cada jugador
    Object.keys(dataByPlayer).forEach(player => {
      dataByPlayer[player].sort((a, b) => a.centralized_elapsed_time - b.centralized_elapsed_time);
    });
    return dataByPlayer;
  }, [entries]);

  // Construir una lista de todos los tiempos únicos
  const allTimes = React.useMemo(() => {
    return Array.from(new Set(entries.map(e => e.centralized_elapsed_time))).sort((a, b) => a - b);
  }, [entries]);

  // Construir la tabla cruzada (pivot) para el gráfico
  const chartData = React.useMemo(() => {
    return allTimes.map(time => {
      const row: any = { centralized_elapsed_time: time };
      Object.keys(playerData).forEach(player => {
        const found = playerData[player].find(e => e.centralized_elapsed_time === time);
        row[player] = found ? found.speed : null;
      });
      return row;
    });
  }, [allTimes, playerData]);

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

          {selectedTable && entries.length > 0 && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Player Speeds Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="centralized_elapsed_time" 
                        label={{ value: 'Elapsed_time (seconds)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Speed (m/s)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      {Object.keys(playerData).map((player, index) => (
                        <Line
                          key={player}
                          type="monotone"
                          dataKey={player}
                          name={player}
                          stroke={`hsl(${index * 137.5}, 70%, 50%)`}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={true}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

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
                  Load Player First Appearances
                </Button>
                {loadingEntries ? (
                  <div>Loading entries...</div>
                ) : entries && entries.length > 0 ? (
                  <div>
                    <Button
                      onClick={() => setShowTable(!showTable)}
                      className="mb-4"
                    >
                      {showTable ? 'Hide Table Details' : 'Show Table Details'}
                    </Button>
                    {showTable && (
                      <div className="overflow-x-auto max-h-[400px]">
                        <table className="min-w-full">
                          <thead className="sticky top-0 bg-white">
                            <tr>
                              <th className="px-4 py-2">Player</th>
                              <th className="px-4 py-2">Time</th>
                              <th className="px-4 py-2">Speed</th>
                              <th className="px-4 py-2">Centralized Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((entry, index) => (
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
                    )}
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