"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import PlayerAccelComparisonChart from "../components/PlayerAccelComparisonChart";

interface AccelerationRow {
  id: number;
  player_display_name: string;
  values: number[];
}

interface ApiResponse {
  accelerations: AccelerationRow[];
  params?: {
    accel_threshold: number;
    decel_threshold: number;
    min_duration: number;
    filter_column: string;
  };
  error?: string;
}

const FILTER_COLUMNS = [
  { value: "player_acceleration_final_smooth", label: "Final Smooth" },
  { value: "accel_original", label: "Original" },
  { value: "accel_sma", label: "SMA" },
  { value: "accel_ema", label: "EMA" },
  { value: "accel_butterworth", label: "Butterworth" },
  { value: "accel_stddev_window", label: "StdDev Window" },
  { value: "instantaneous_acceleration", label: "Instantaneous" },
];

const accelColumns = [
  "Total Accels",
  "Accel Low",
  "Accel Med",
  "Accel High",
  "Total Decels",
  "Decel Low",
  "Decel Med",
  "Decel High",
  "Distance (m)",
  "Time (s)",
];

const formatAccelValue = (v: number, colIdx: number) => {
  if (colIdx === 8 || colIdx === 9) {
    return typeof v === "number" && !isNaN(v) ? v.toFixed(2) : "0.00";
  }
  return typeof v === "number" && !isNaN(v) ? Math.round(v) : 0;
};

export default function AccelerationsAnalysisPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingAccelerations, setLoadingAccelerations] = useState(false);
  const [accelerations, setAccelerations] = useState<AccelerationRow[]>([]);
  const [error, setError] = useState<string>("");

  const [accelThreshold, setAccelThreshold] = useState<string>("3");
  const [decelThreshold, setDecelThreshold] = useState<string>("-3");
  const [minDuration, setMinDuration] = useState<string>("0.5");
  const [filterColumn, setFilterColumn] = useState<string>(
    "player_acceleration_final_smooth"
  );

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/match/gps-tables`
      );
      const data = await res.json();
      setTables(data.tables || []);
    } catch (e) {
      console.error("Error fetching GPS tables:", e);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchAccelerations = async () => {
    if (!selectedTable) {
      setError("Please select a match table");
      return;
    }

    setLoadingAccelerations(true);
    setError("");

    try {
      const params = new URLSearchParams({
        accel_threshold: accelThreshold,
        decel_threshold: decelThreshold,
        min_duration: minDuration,
        filter_column: filterColumn,
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/match/table/${selectedTable}/accelerations-filtered?${params}`
      );
      const data: ApiResponse = await res.json();

      if (data.error) {
        setError(data.error);
        setAccelerations([]);
      } else {
        setAccelerations(data.accelerations || []);
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
      setAccelerations([]);
    } finally {
      setLoadingAccelerations(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Acceleration Analysis (Filtered)
          </h1>
          <p className="text-muted-foreground">
            Configure acceleration thresholds and filtering to analyze player
            performance dynamically.
          </p>
        </div>

        {/* Controls Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Match Table Selection */}
            <div>
              <Label htmlFor="match-table">Match Table</Label>
              <Select
                value={selectedTable}
                onValueChange={(v) => setSelectedTable(v)}
              >
                <SelectTrigger id="match-table">
                  <SelectValue placeholder="Select a match table..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingTables ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    tables.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="accel-threshold">Accel Threshold (m/s²)</Label>
                <Input
                  id="accel-threshold"
                  type="number"
                  step="0.1"
                  value={accelThreshold}
                  onChange={(e) => setAccelThreshold(e.target.value)}
                  placeholder="3"
                />
              </div>

              <div>
                <Label htmlFor="decel-threshold">Decel Threshold (m/s²)</Label>
                <Input
                  id="decel-threshold"
                  type="number"
                  step="0.1"
                  value={decelThreshold}
                  onChange={(e) => setDecelThreshold(e.target.value)}
                  placeholder="-3"
                />
              </div>

              <div>
                <Label htmlFor="min-duration">Min Duration (seconds)</Label>
                <Input
                  id="min-duration"
                  type="number"
                  step="0.1"
                  value={minDuration}
                  onChange={(e) => setMinDuration(e.target.value)}
                  placeholder="0.5"
                />
              </div>

              <div>
                <Label htmlFor="filter-column">Filter Column</Label>
                <Select value={filterColumn} onValueChange={setFilterColumn}>
                  <SelectTrigger id="filter-column">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_COLUMNS.map((col) => (
                      <SelectItem key={col.value} value={col.value}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={fetchAccelerations}
              disabled={loadingAccelerations || !selectedTable}
              className="w-full md:w-auto"
            >
              {loadingAccelerations && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Analyze Accelerations
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results Card */}
        {accelerations.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Results
                {loadingAccelerations && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Table */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                  <thead className="text-foreground">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3">Player</th>
                      {Array.from({
                        length: Math.max(
                          0,
                          Math.min(10, accelerations[0]?.values?.length || 0)
                        ),
                      }).map((_, idx) => (
                        <th key={idx} className="text-right py-2 px-2">
                          {accelColumns[idx] ?? `V${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accelerations.map((row, idx) => (
                      <tr
                        key={`accsum-${row.id}-${row.player_display_name}-${idx}`}
                        className="border-b border-border hover:bg-accent"
                      >
                        <td className="py-2 pr-3 align-top text-foreground">
                          {row.player_display_name}
                        </td>
                        {row.values.slice(0, 10).map((v, i) => (
                          <td
                            key={i}
                            className="py-2 px-2 text-right tabular-nums text-foreground"
                          >
                            {formatAccelValue(v, i)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chart */}
              <div className="w-full">
                <PlayerAccelComparisonChart rows={accelerations} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!loadingAccelerations && accelerations.length === 0 && !error && (
          <Card className="bg-card border-border">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Configure parameters and click "Analyze Accelerations" to view
              results.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
