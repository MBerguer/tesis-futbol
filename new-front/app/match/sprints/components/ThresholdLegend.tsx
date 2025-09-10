"use client";

import React from "react";

interface Props {
  thresholds?: { match: number; halftime: number; kickoff: number } | null;
  vertical?: boolean;
  inChart?: boolean;
  className?: string;
}

export default function ThresholdLegend({ thresholds, vertical, inChart, className }: Props) {
  if (!thresholds) return null;
  const textClass = inChart ? 'text-zinc-300' : 'text-gray-600';
  const Item = ({ color, label }: { color: string; label: string }) => (
    <div className={`flex items-center gap-2 text-sm ${textClass}`}>
      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
  return (
    <div className={`mt-10 ${vertical ? 'flex flex-col gap-1.5' : 'flex items-center gap-4'} ${inChart ? 'rounded-md bg-zinc-600 border border-zinc-800 px-3 py-2 min-w-[160px]' : ''} ${className || ''}`}>
      
      <Item color="#38bdf8" label={`25.2 km/h`} />
      <Item color="#ef4444" label={`19.8 km/h`} />
      <Item color="#bb00b4" label={`11 km/h`} />
      <Item color="#38ff48" label={`5.9 km/h`} />
    </div>
  );
}


