"use client";

import React, { createContext, useContext } from "react";

export interface MatchContextValue {
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;
  selectedMatchId?: string | null;
  setSelectedMatchId?: (id: string | null) => void;
  reloadToken: number;
  reload: () => void;
  fullWidth?: boolean;
}

const MatchContext = createContext<MatchContextValue | undefined>(undefined);

export function useMatchContext(): MatchContextValue {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatchContext must be used within MatchProvider");
  return ctx;
}

export function MatchProvider({ value, children }: { value: MatchContextValue; children: React.ReactNode }) {
  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}


