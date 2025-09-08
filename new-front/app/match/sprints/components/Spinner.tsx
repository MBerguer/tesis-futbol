"use client";

import React from "react";

export default function Spinner({ size = 32 }: { size?: number }) {
  const dim = `${size}px`;
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        className="animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"
        style={{ width: dim, height: dim }}
      />
    </div>
  );
}





