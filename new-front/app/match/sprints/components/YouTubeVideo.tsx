"use client";
import React from "react";

type YouTubePlayer = any;

export default function YouTubeVideo({
  videoId,
  onSecondChange,
}: {
  videoId: string;
  onSecondChange?: (sec: number) => void;
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

  const seekTo = (t: number) => {
    const p = playerRef.current;
    if (!p) return;
    const clamped = Math.max(0, Math.min(t, duration || 0));
    try {
      p.seekTo(clamped, true);
    } catch {}
    setCurrentTime(clamped);
    if (onSecondChange) onSecondChange(clamped);
  };

  return (
    <>
      <div className="flex">
        <div className="w-full lg:w-2/6">
          <span>Second in Video: {formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        <div className="w-full lg:w-4/6 relative h-8 overflow-visible">
          <input
            className="w-full relative z-0 range-no-thumb"
            id="videoTime"
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e)=>seekTo(parseFloat(e.target.value))}
          />
          {duration > 0 && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <button
                type="button"
                aria-label="Jump to middle"
                onClick={() => seekTo(duration / 2)}
                className="absolute pointer-events-auto"
                style={{ left: `50%`, transform: "translateX(-50%)", top: 0, width: 2, height: 20, background: "#10b981" }}
              />
              {duration >= 2700 && (
                <button
                  type="button"
                  aria-label="Jump to 45:00"
                  onClick={() => seekTo(2700)}
                  className="absolute pointer-events-auto"
                  style={{ left: `${(2700 / duration) * 100}%`, transform: "translateX(-50%)", top: 0, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #2C5282" }}
                />
              )}
              {duration >= 2700 && (
                <button
                  type="button"
                  aria-label="Jump to 45:00 remaining"
                  onClick={() => seekTo(duration - 2700)}
                  className="absolute pointer-events-auto"
                  style={{ left: `${((duration - 2700) / duration) * 100}%`, transform: "translateX(-50%)", bottom: 10, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "8px solid #ef4444" }}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <div className="w-full aspect-video">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </>
  );
}



