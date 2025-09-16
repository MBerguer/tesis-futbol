"use client";
import React from "react";
import { Slider } from "@/components/ui/slider";
import { TimelineMarkers, TimelineMarker } from "@/components/ui/timeline-markers";

type YouTubePlayer = any;

export default function YouTubeVideo({
  videoId,
  onSecondChange,
  seekTo,
  markers,
}: {
  videoId: string;
  onSecondChange?: (sec: number) => void;
  seekTo?: number;
  markers?: TimelineMarker[];
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const playerRef = React.useRef<YouTubePlayer | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const onSecondChangeRef = React.useRef<typeof onSecondChange | undefined>(onSecondChange);

  React.useEffect(() => {
    onSecondChangeRef.current = onSecondChange;
  }, [onSecondChange]);

  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);

  const formatTime = (sec: number) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  const ensureApi = React.useCallback((): Promise<any> => {
    return new Promise((resolve) => {
      const w = window as any;
      if (w.YT && w.YT.Player) return resolve(w.YT);
      const onReady = () => resolve(w.YT);
      if (!w.onYouTubeIframeAPIReady) {
        w.onYouTubeIframeAPIReady = onReady;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      } else {
        // If script already injected but YT not yet ready, wait
        const id = window.setInterval(() => {
          if (w.YT && w.YT.Player) {
            window.clearInterval(id);
            resolve(w.YT);
          }
        }, 50);
      }
    });
  }, []);

  const tick = React.useCallback(() => {
    const p = playerRef.current;
    if (p && typeof p.getCurrentTime === "function") {
      const t = p.getCurrentTime();
      setCurrentTime(t);
      const cb = onSecondChangeRef.current;
      if (cb) cb(t);
    }
    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const stopTick = () => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  React.useEffect(() => {
    let destroyed = false;
    (async () => {
      const YT = await ensureApi();
      if (destroyed) return;
      if (!containerRef.current) return;
      const player = new YT.Player(containerRef.current, {
        videoId,
        host: "https://www.youtube.com",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          // controls: 0, // keep native controls if desired
        },
        events: {
          onReady: () => {
            try {
              const d = player.getDuration();
              if (d && isFinite(d)) setDuration(d);
              if (typeof seekTo === 'number') {
                // Apply initial seek once ready
                try { player.seekTo(seekTo, true); } catch {}
                setCurrentTime(seekTo || 0);
                const cb = onSecondChangeRef.current; if (cb) cb(seekTo || 0);
              }
            } catch {}
          },
          onStateChange: (e: any) => {
            const state = e?.data;
            // 1 = playing, 2 = paused per IFrame API
            if (state === 1) {
              stopTick();
              rafRef.current = window.requestAnimationFrame(tick);
            } else if (state === 2) {
              stopTick();
              // do a final update
              try {
                const t = player.getCurrentTime();
                setCurrentTime(t);
                const cb = onSecondChangeRef.current;
                if (cb) cb(t);
              } catch {}
            }
          },
        },
      });
      playerRef.current = player;
    })();
    return () => {
      destroyed = true;
      stopTick();
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
    };
  }, [ensureApi, videoId]);

  const seekToFn = (t: number) => {
    const p = playerRef.current;
    if (!p) return;
    const clamped = Math.max(0, Number.isFinite(t) ? t : 0);
    try {
      p.seekTo(clamped, true);
    } catch {}
    setCurrentTime(clamped);
    if (onSecondChange) onSecondChange(clamped);
  };

  React.useEffect(() => {
    if (seekTo === undefined) return;
    const target = seekTo || 0;
    // apply once, then clear to avoid re-seeking on progress updates
    const id = requestAnimationFrame(()=> seekToFn(target));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo]);

  return (
    <>
      <div className="flex">
        <div className="sticky h-[38px] w-full h top-0 z-20 bg-zinc-900/80 backdrop-blur rounded-md px-3 mb-2 shadow-sm border border-zinc-800 flex items-center justify-between">        
          <div className="w-full mt-2 relative h-8 overflow-visible">
            <Slider
              min={0}
              max={Math.max(0, duration || 0)}
              step={1}
              value={[Math.min(Math.max(0, Math.floor(currentTime || 0)), Math.max(0, Math.floor(duration || 0)))]}
              onValueChange={(v)=>seekToFn((v?.[0] ?? 0))}
              className="relative z-0"
            />
            {duration > 0 && (
              <TimelineMarkers
                min={0}
                max={duration}
                markers={markers || []}
                onMarkerClick={(m)=>{
                  if (typeof m.at === 'number') seekToFn(m.at)
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-2 py-1 w-1/4 justify-end">
            <label className="text-xs text-zinc-400">{formatTime(currentTime)} / {formatTime(duration)}</label>                                  
          </div>
        </div>
      </div>
      <div className="w-full aspect-video">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </>
  );
}




