"use client";

import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

export type SkillsetSeries = {
  name: string;
  data: number[];
  color?: string;
  strokeDasharray?: string;
  fillOpacity?: number;
};

export type SkillsetComparatorProps = {
  categories: string[];
  series: SkillsetSeries[];
  max?: number;
  height?: number;
};

export function SkillsetComparator({ categories, series, max = 10, height = 280 }: SkillsetComparatorProps) {
  const data = React.useMemo(() => {
    return categories.map((category, index) => {
      const row: Record<string, number | string> = { category };
      series.forEach((s, sIdx) => {
        row[`s${sIdx}`] = s.data[index] ?? 0;
      });
      return row;
    });
  }, [categories, series]);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, max]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          {series.map((s, idx) => (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={`s${idx}`}
              stroke={s.color || (idx === 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))")}
              fill={s.color || (idx === 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))")}
              strokeDasharray={s.strokeDasharray}
              fillOpacity={s.fillOpacity ?? (idx === 0 ? 0.2 : 0.12)}
              dot
            />
          ))}
          <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SkillsetComparator;


