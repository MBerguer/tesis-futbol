"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoComponent from "./videoComponent";

export default function Page() {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const searchParams = useSearchParams();
  const selectedTable = searchParams.get('table');

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

  // Only render the details content. Sidebar/tabs are in layout.
  return (
    <div>
      <div className="flex gap-4">
        <div className="w-1/3">
          <div className="bg-white p-4 rounded shadow mb-4">
            <p className="text-lg font-semibold mb-2">
              Equipo A vs Equipo B
            </p>
            <p>Fecha: 1 de enero de 2022</p>
            <p>Ubicación: Nombre del Estadio</p>
            <p>Árbitro: Juan Pérez</p>
            <p>Asistencia: 50,000</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p className="text-lg font-semibold mb-2">
              Resultado: 2 - 1
            </p>
            <p>Goles:</p>
            <ul className="list-disc pl-4">
              <li>Jugador A (Equipo A) - 10'</li>
              <li>Jugador B (Equipo B) - 20'</li>
              <li>Jugador C (Equipo A) - 30'</li>
            </ul>
            <p>Tarjetas Amarillas:</p>
            <ul className="list-disc pl-4">
              <li>Jugador D (Equipo A) - 15'</li>
              <li>Jugador E (Equipo B) - 25'</li>
            </ul>
            <p>Tarjetas Rojas:</p>
            <ul className="list-disc pl-4">
              <li>Jugador F (Equipo A) - 60'</li>
            </ul>
          </div>
        </div>

        <div className="w-2/3">
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-2">Video del Partido</h2>
            <VideoComponent />
          </div>
        </div>
      </div>

      <div className="w-full">
        <h2 className="text-xl font-bold mb-2">Métricas del Jugador</h2>
        <select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Seleccionar Jugador</option>
          {['Jugador A','Jugador B','Jugador C'].map((player) => (
            <option key={player} value={player}>
              {player}
            </option>
          ))}
        </select>
        {selectedPlayer && (
          <div className="mt-2">
            <p>Métricas para {selectedPlayer}:</p>
          </div>
        )}
      </div>
    </div>
  );
}
