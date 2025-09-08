"use client";

import React from "react";
import { formatMatchTime, toAbsoluteTime, formatDuration } from "../utils/time";

export interface PeriodsSummaryProps {
  baseTime: string | null;
  detected_first_half_start?: number;
  detected_first_half_end?: number;
  detected_second_half_start?: number;
  detected_second_half_end?: number;
  detected_halftime_start?: number;
  detected_halftime_end?: number;
}

export default function PeriodsSummary(props: PeriodsSummaryProps) {
  const bt = props.baseTime;
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-2">Primer Tiempo:</h4>
        <div className="ml-4 space-y-1 text-sm md:text-base">
          <div>[Inicio] segundos centralized elapsed: {Math.floor(props.detected_first_half_start ?? 0)} minuto: {formatMatchTime(props.detected_first_half_start)} (hora: {toAbsoluteTime(bt, props.detected_first_half_start)})</div>
          <div>[Fin] segundo: {Math.floor(props.detected_first_half_end ?? 0)} minuto: {formatMatchTime(props.detected_first_half_end)} (hora: {toAbsoluteTime(bt, props.detected_first_half_end)})</div>
          <div>Duración: {formatDuration(props.detected_first_half_start, props.detected_first_half_end)} minutos</div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Segundo Tiempo:</h4>
        <div className="ml-4 space-y-1 text-sm md:text-base">
          <div>[Inicio] segundo: {Math.floor(props.detected_second_half_start ?? 0)} minuto: {formatMatchTime(props.detected_second_half_start)} (hora: {toAbsoluteTime(bt, props.detected_second_half_start)})</div>
          <div>[Fin] segundo: {Math.floor(props.detected_second_half_end ?? 0)} minuto: {formatMatchTime(props.detected_second_half_end)} (hora: {toAbsoluteTime(bt, props.detected_second_half_end)})</div>
          <div>Duración: {formatDuration(props.detected_second_half_start, props.detected_second_half_end)} minutos</div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Entretiempo:</h4>
        <div className="ml-4 space-y-1 text-sm md:text-base">
          <div>[Inicio] segundo: {Math.floor(props.detected_halftime_start ?? 0)} minuto: {formatMatchTime(props.detected_halftime_start)} (hora: {toAbsoluteTime(bt, props.detected_halftime_start)})</div>
          <div>[Fin] segundo: {Math.floor(props.detected_halftime_end ?? 0)} minuto: {formatMatchTime(props.detected_halftime_end)} (hora: {toAbsoluteTime(bt, props.detected_halftime_end)})</div>
          <div>Duración: {formatDuration(props.detected_halftime_start, props.detected_halftime_end)} minutos</div>
        </div>
      </div>
    </div>
  );
}


