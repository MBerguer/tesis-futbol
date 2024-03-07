"use client";

import React, { useEffect, useState } from "react";

export default function Page() {
  const [selectedPlayer, setSelectedPlayer] = useState("");

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

  // This will return the entire overview of a match
  return (
    <div className="bg-gray-100 p-4">
      <button
        onClick={() => (window.location.href = "/dashboard")}
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Volver al Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-4">Detalles del Partido</h1>
      <div className="flex">
        <div className="w-1/2">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-lg font-semibold mb-2">
              {matchMetadata.teamA} vs {matchMetadata.teamB}
            </p>
            <p>Fecha: {matchMetadata.date}</p>
            <p>Ubicación: {matchMetadata.location}</p>
            <p>Árbitro: {matchMetadata.referee}</p>
            <p>Asistencia: {matchMetadata.attendance}</p>
          </div>
        </div>
        <div className="w-1/2">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-lg font-semibold mb-2">
              Resultado: {matchMetadata.teamA} {matchMetadata.result.teamAScore}{" "}
              - {matchMetadata.teamB} {matchMetadata.result.teamBScore}
            </p>
            <p>Goles:</p>
            <ul className="list-disc pl-4">
              {matchMetadata.goals.map((goal, index) => (
                <li key={index}>
                  {goal.player} ({goal.team}) - {goal.minute}'
                </li>
              ))}
            </ul>
            <p>Tarjetas Amarillas:</p>
            <ul className="list-disc pl-4">
              {matchMetadata.yellowCards.map((card, index) => (
                <li key={index}>
                  {card.player} ({card.team}) - {card.minute}'
                </li>
              ))}
            </ul>
            <p>Tarjetas Rojas:</p>
            <ul className="list-disc pl-4">
              {matchMetadata.redCards.map((card, index) => (
                <li key={index}>
                  {card.player} ({card.team}) - {card.minute}'
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Métricas del Jugador</h2>
        <select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Seleccionar Jugador</option>
          {players.map((player) => (
            <option key={player} value={player}>
              {player}
            </option>
          ))}
        </select>
        {selectedPlayer && (
          <div className="mt-2">
            <p>Métricas para {selectedPlayer}:</p>
            {/* Add the relevant metrics for the selected player */}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Video del Partido</h2>
        <video
          src="https://s3.amazonaws.com/azvideotagtesting/21012876/videos/139069/Nacional%205-1%20Juventud%20Clausura%202023.mp4"
          controls
          className="w-full"
        />
      </div>
      video time: <input type="text" id="videoTime" value="0" />
    </div>
  );
}
