"use client";

import React from "react";

interface TopProgressProps {
  active: boolean;
}

export default function TopProgress({ active }: TopProgressProps) {
  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-blue-500/60 animate-pulse" />
    </div>
  );
}



