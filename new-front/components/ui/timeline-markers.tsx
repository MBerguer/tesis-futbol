"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type TimelineMarker = {
  id: string | number
  at: number
  type?: "triangle" | "dot" | "bar" | "emoji"
  side?: "top" | "bottom" | "middle"
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
  trackTop = 0,
  trackHeight = 16,
  formatTooltip,
}: {
  min?: number
  max: number
  markers: TimelineMarker[]
  className?: string
  onMarkerClick?: (marker: TimelineMarker) => void
  trackTop?: number
  trackHeight?: number
  formatTooltip?: (marker: TimelineMarker) => string
}) {
  const range = Math.max(1, max - min)

  return (
    <div className={cn("absolute inset-0 z-20 pointer-events-none", className)}>
      {markers.map((m, gi) => {
        const pct = Math.min(100, Math.max(0, ((m.at - min) / range) * 100))
        const type = m.type || "triangle"
        const side = m.side || "top"
        const color = m.color || "#60a5fa"
        const baseProps = {
          key: String(m.id ?? `m-${gi}`),
          title: (typeof formatTooltip === 'function' ? formatTooltip(m) : (m.label || String(m.id))),
          onClick: (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (onMarkerClick) onMarkerClick(m)
          },
        }
        const midY = trackTop + trackHeight / 2
        const topY = Math.max(0, trackTop - 14)
        const bottomY = trackTop + trackHeight + 8
        const commonY = side === "middle" ? midY : side === "top" ? topY : bottomY
        if (type === "dot") {
          return (
            <button
              {...baseProps}
              className="absolute pointer-events-auto"
              style={{
                left: `${pct}%`,
                transform: side === "middle" ? "translate(-50%, -50%)" : "translateX(-50%)",
                top: commonY,
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
                transform: side === "middle" ? "translate(-50%, -50%)" : "translateX(-50%)",
                top: commonY,
                color: color || "#fff",
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
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
                transform: side === "middle" ? "translate(-50%, -50%)" : "translateX(-50%)",
                top: commonY,
                width: 2,
                height: 14,
                background: color,
              } as React.CSSProperties}
            />
          )
        }
        // default (including 'triangle') fallback to dot
        return (
          <button
            {...baseProps}
            className="absolute pointer-events-auto"
            style={{
              left: `${pct}%`,
              transform: side === "middle" ? "translate(-50%, -50%)" : "translateX(-50%)",
              top: commonY,
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: color,
              boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}


