"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoComponent from "./videoComponent";
import { useMatchContext } from "./context";
import { useMatchData } from "./sprints/hooks/useMatchData";
import PeriodsSummary from "./sprints/components/PeriodsSummary";
import Skeleton from "./sprints/components/Skeleton";

export default function Page() {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const searchParams = useSearchParams();
  const { selectedTable, reloadToken } = useMatchContext();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const data = useMatchData(API_BASE, selectedTable, reloadToken);
  const periods = data.periods;
  const baseTime = data.baseTime;
  const loadingPeriods = data.loadingDetect;

  // Add the relevant metrics for the selected player
  useEffect(() => {
    const videoTimeElement = document.getElementById("videoTime");
    if (videoTimeElement) {
      const updateVideoTime = () => {
        const currentTime = 1;
        // Update the relevant metrics for the selected player with the current time
        // Example: setMetricsForPlayer(selectedPlayer, currentTime);
      };

      // Add event listener to update the metrics when the video time changes
      videoTimeElement.addEventListener("input", updateVideoTime);

      // Clean up the event listener when the component unmounts
      return () => {
        videoTimeElement.removeEventListener("input", updateVideoTime);
      };
    }
  }, [selectedPlayer]);

  const players = ["Jugador A", "Jugador B", "Jugador C"]; // Add more players to the array if needed

  // Define the match metadata as a JSON object
  const matchMetadata = {
    teamA: "Equipo A",
    teamB: "Equipo B",
    date: "1 de enero de 2022",
    location: "Nombre del Estadio",
    referee: "Juan Pérez",
    attendance: "50,000",
    result: {
      teamAScore: 2,
      teamBScore: 1,
    },
    goals: [
      { player: "Jugador A", team: "Equipo A", minute: 10 },
      { player: "Jugador B", team: "Equipo B", minute: 20 },
      { player: "Jugador C", team: "Equipo A", minute: 30 },
    ],
    yellowCards: [
      { player: "Jugador D", team: "Equipo A", minute: 15 },
      { player: "Jugador E", team: "Equipo B", minute: 25 },
    ],
    redCards: [{ player: "Jugador F", team: "Equipo A", minute: 60 }],
  };

  // Details content moved into Overview in sprints page; keep page minimal or redirect
  return (
    <div className="text-sm text-gray-600">Use the sidebar tabs to view the Overview or Players.</div>
  );
}
