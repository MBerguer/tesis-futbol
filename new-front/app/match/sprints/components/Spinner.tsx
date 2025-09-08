"use client";

import React from "react";

export default function Spinner({ size = 32 }: { size?: number }) {
  const dim = `${size}px`;
  return (
      <span
        className="inline-block align-middle animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 ml-2"
        style={{ width: dim, height: dim }}
      />
  );
}





