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
  const { selectedTable, reloadToken } = useMatchContext();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const data = useMatchData(API_BASE, selectedTable, reloadToken);

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

  // Details content moved into Overview in sprints page; keep page minimal or redirect
  return (
    <div className="text-sm text-gray-600">Use the sidebar tabs to view the Overview or Players.</div>
  );
}
