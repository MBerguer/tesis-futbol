"use client";

import React from "react";

export default function Spinner({ size = 32 }: { size?: number }) {
  const dim = `${size}px`;
  return (
    <span
      className="inline-block align-middle animate-spin rounded-full border-4 border-muted border-t-primary ml-2"
      style={{ width: dim, height: dim }}
    />
  );
}
