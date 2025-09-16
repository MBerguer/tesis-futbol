"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type TimelineMarker = {
  id: string | number
  at: number
  type?: "triangle" | "dot" | "bar" | "emoji"
  side?: "top" | "bottom"
  color?: string
  label?: string
  data?: any
  content?: string
}

export function TimelineMarkers({
  min = 0,
  max,
  markers,
  className,
  onMarkerClick,
}: {
  min?: number
  max: number
  markers: TimelineMarker[]
  className?: string
  onMarkerClick?: (marker: TimelineMarker) => void
}) {
  const range = Math.max(1, max - min)
  return (
    <div className={cn("absolute inset-0 z-20 pointer-events-none", className)}>
      {markers.map((m) => {
        const pct = Math.min(100, Math.max(0, ((m.at - min) / range) * 100))
        const type = m.type || "triangle"
        const side = m.side || "top"
        const color = m.color || "#60a5fa"
        const baseProps = {
          key: String(m.id),
          title: m.label || String(m.id),
          onClick: (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (onMarkerClick) onMarkerClick(m)
          },
        }
        if (type === "dot") {
          return (
            <button
              {...baseProps}
              className="absolute pointer-events-auto"
              style={{
                left: `${pct}%`,
                transform: "translateX(-50%)",
                [side === "top" ? "top" : "bottom"]: 2,
                width: 8,
                height: 8,
                borderRadius: 9999,
                background: color,
                boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
              } as React.CSSProperties}
            />
          )
        }
        if (type === "emoji") {
          return (
            <button
              {...baseProps}
              className="absolute pointer-events-auto text-xs"
              style={{
                left: `${pct}%`,
                transform: "translateX(-50%)",
                [side === "top" ? "top" : "bottom"]: 12,
                color: color,
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
              } as React.CSSProperties}
            >
              {m.content || "•"}
            </button>
          )
        }
        if (type === "bar") {
          return (
            <button
              {...baseProps}
              className="absolute pointer-events-auto"
              style={{
                left: `${pct}%`,
                transform: "translateX(-50%)",
                [side === "top" ? "top" : "bottom"]: 0,
                width: 2,
                height: 14,
                background: color,
              } as React.CSSProperties}
            />
          )
        }
        // triangle
        const triangleStyles: React.CSSProperties =
          side === "top"
            ? {
                top: 0,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: `8px solid ${color}`,
              }
            : {
                bottom: 0,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderBottom: `8px solid ${color}`,
              }
        return (
          <button
            {...baseProps}
            className="absolute pointer-events-auto"
            style={{ left: `${pct}%`, transform: "translateX(-50%)", ...triangleStyles }}
          />
        )
      })}
    </div>
  )
}


