"use client";

import React from "react";

interface Props {
  thresholds?: { match: number; halftime: number; kickoff: number } | null;
}

export default function ThresholdLegend({ thresholds }: Props) {
  if (!thresholds) return null;
  const Item = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
  return (
    <div className="mt-2 flex items-center gap-4">
      <Item color="#38ff48" label={`5.9 km/h`} />
      <Item color="#bb00b4" label={`11 km/h`} />
      <Item color="#E53E3E" label={`20 km/h`} />
    </div>
  );
}


