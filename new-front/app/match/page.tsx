"use client";

import React from "react";
import { useMatchContext } from "./context";
import SprintsPage from "./sprints/page";

export default function Page() {
  const { selectedTable } = useMatchContext();
  return <SprintsPage selectedTable={selectedTable} />;
}
