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
  clusterRadius = 12,
  maxPreviewItems = 3,
}: {
  min?: number
  max: number
  markers: TimelineMarker[]
  className?: string
  onMarkerClick?: (marker: TimelineMarker) => void
  clusterRadius?: number
  maxPreviewItems?: number
}) {
  const range = Math.max(1, max - min)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = React.useState<number>(1000)
  React.useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.contentRect?.width) setContainerWidth(e.contentRect.width)
      }
    })
    try { ro.observe(el) } catch {}
    setContainerWidth(el.getBoundingClientRect().width || 1000)
    return () => { try { ro.disconnect() } catch {} }
  }, [])

  // cluster markers that are within clusterRadius px to avoid overlap
  const clusters = React.useMemo(() => {
    const items = markers
      .map((m) => ({ m, pct: Math.min(100, Math.max(0, ((m.at - min) / range) * 100)) }))
      .sort((a, b) => a.pct - b.pct)
    const groups: Array<{ pct: number; items: typeof items }> = []
    for (const it of items) {
      const px = it.pct
      const last = groups[groups.length - 1]
      if (!last) { groups.push({ pct: px, items: [it] }); continue }
      // Convert px threshold to percentage based on measured container width
      const thresholdPct = (clusterRadius / Math.max(1, containerWidth)) * 100
      if (Math.abs(px - last.pct) <= thresholdPct) {
        last.items.push(it)
        last.pct = (last.pct + px) / 2
      } else {
        groups.push({ pct: px, items: [it] })
      }
    }
    return groups
  }, [markers, min, range, clusterRadius, containerWidth])

  return (
    <div ref={containerRef} className={cn("absolute inset-0 z-20 pointer-events-none", className)}>
      {clusters.map((group, gi) => {
        const pct = group.pct
        const items = group.items.map((it) => it.m)
        if (items.length > 1) {
          // Show a compact preview of up to N items and a subtle caret with count
          return (
            <div key={`g-${gi}`} className="absolute" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
              <div className="relative pointer-events-none" style={{ height: 18 }}>
                <div className="absolute left-1/2 -translate-x-1/2 top-0 flex items-center gap-1">
                  {items.slice(0, Math.max(1, maxPreviewItems)).map((m, idx) => {
                    const offset = (idx - Math.min(items.length, maxPreviewItems) / 2 + 0.5) * 10
                    const side = m.side || "top"
                    const color = m.color || "#60a5fa"
                    if (m.type === "emoji") {
                      return (
                        <span key={`gp-${gi}-${idx}`} className="pointer-events-auto" style={{ transform: `translateX(${offset}px)`, position: 'relative', top: side === 'top' ? 2 : 0, fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }} title={m.label}>
                          {m.content || '•'}
                        </span>
                      )
                    }
                    if (m.type === "bar") {
                      return (
                        <span key={`gp-${gi}-${idx}`} className="pointer-events-auto" title={m.label} style={{ transform: `translateX(${offset}px)`, width: 2, height: 12, background: color, display: 'inline-block', boxShadow: '0 1px 2px rgba(0,0,0,0.6)' }} />
                      )
                    }
                    // triangle/dot fallback rendered small
                    return (
                      <span key={`gp-${gi}-${idx}`} className="pointer-events-auto" title={m.label} style={{ transform: `translateX(${offset}px)` }}>
                        <span style={{ display: 'inline-block', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${color}`, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                      </span>
                    )
                  })}
                  {items.length > maxPreviewItems && (
                    <span className="ml-1 text-[10px] text-foreground/80 px-1 rounded bg-background/60 border border-border/60 pointer-events-none" title={`${items.length} events`}>+{items.length - maxPreviewItems}</span>
                  )}
                </div>
                <button
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 pointer-events-auto"
                  title={`${items.length} events`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onMarkerClick) onMarkerClick(items[0]) }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-8" style={{ borderBottomColor: '#94a3b8', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                </button>
              </div>
            </div>
          )
        }
        const m = items[0]
        const type = m.type || "triangle"
        const side = m.side || "top"
        const color = m.color || "#60a5fa"
        const baseProps = {
          key: String(m.id ?? `m-${gi}`),
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
                [side === "top" ? "top" : "bottom"]: 14,
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
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
              }
            : {
                bottom: 0,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderBottom: `8px solid ${color}`,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
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


