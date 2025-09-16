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
        const title = (typeof formatTooltip === 'function' ? formatTooltip(m) : (m.label || String(m.id)))
        const midY = trackTop + trackHeight / 2
        const topY = Math.max(0, trackTop - 20)
        const bottomY = trackTop + trackHeight -2
        const commonY = side === "middle" ? midY : side === "top" ? topY : bottomY
        const wrapperStyle: React.CSSProperties = {
          left: `${pct}%`,
          top: commonY,
          transform: side === "middle" ? "translate(-50%, -50%)" : "translateX(-30%)",
        }
        const tooltipStyle: React.CSSProperties = side === 'bottom'
          ? { top: '100%', marginTop: 6 }
          : side === 'middle'
          ? { bottom: '100%', marginBottom: 6 }
          : { bottom: '100%', marginBottom: 6 }

        if (type === "dot") {
          return (
            <div key={String(m.id ?? `m-${gi}`)} className="group absolute" style={wrapperStyle}>
              <button
                className="pointer-events-auto"
                onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); if (onMarkerClick) onMarkerClick(m) }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 9999,
                  background: color,
                  boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
                } as React.CSSProperties}
              />
              <span className="pointer-events-none absolute z-30 rounded bg-black/80 text-white text-[10px] px-1.5 py-0.5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-75 whitespace-nowrap" style={tooltipStyle}>{title}</span>
            </div>
          )
        }
        if (type === "emoji") {
          return (
            <div key={String(m.id ?? `m-${gi}`)} className="group absolute" style={wrapperStyle}>
              <button
                className="pointer-events-auto"
                onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); if (onMarkerClick) onMarkerClick(m) }}
                style={{
                  color: color || "#fff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                  fontSize: 14,
                } as React.CSSProperties}
              >
                {m.content || "•"}
              </button>
              <span className="pointer-events-none absolute z-30 rounded bg-black/80 text-white text-[10px] px-1.5 py-0.5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-75 whitespace-nowrap" style={tooltipStyle}>{title}</span>
            </div>
          )
        }
        if (type === "bar") {
          return (
            <div key={String(m.id ?? `m-${gi}`)} className="group absolute" style={wrapperStyle}>
              <button
                className="pointer-events-auto"
                onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); if (onMarkerClick) onMarkerClick(m) }}
                style={{
                  width: 2,
                  height: 14,
                  background: color,
                } as React.CSSProperties}
              />
              <span className="pointer-events-none absolute z-30 rounded bg-black/80 text-white text-[10px] px-1.5 py-0.5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-75 whitespace-nowrap" style={tooltipStyle}>{title}</span>
            </div>
          )
        }
        // default (including 'triangle') fallback to dot
        return (
          <div key={String(m.id ?? `m-${gi}`)} className="group absolute" style={wrapperStyle}>
            <button
              className="pointer-events-auto"
              onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); if (onMarkerClick) onMarkerClick(m) }}
              style={{
                width: 8,
                height: 8,
                borderRadius: 9999,
                background: color,
                boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
              } as React.CSSProperties}
            />
            <span className="pointer-events-none absolute z-30 rounded bg-black/80 text-white text-[10px] px-1.5 py-0.5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-75 whitespace-nowrap" style={tooltipStyle}>{title}</span>
          </div>
        )
      })}
    </div>
  )
}


