"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";

interface TopProgressProps {
  active: boolean;
}

export default function TopProgress({ active }: TopProgressProps) {
  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={70} className="h-1" />
    </div>
  );
}



