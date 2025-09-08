import React, { useRef, useState } from "react";

export default function VideoComponent(_: {}) {
  const videoSource =
    "https://s3.amazonaws.com/azvideotagtesting/21012876/videos/139069/Nacional%205-1%20Juventud%20Clausura%202023.mp4";

  // add a thumbnail fo a playback button
  const heroImg = "https://nacional.uy/assets/images/logo.svg";

  const vidRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (sec: number) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  const seekTo = (t: number) => {
    const v = vidRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(t, duration || v.duration || 0));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleToggleVideo = () => {
    const v = vidRef.current;
    if (!v) return;
    if (!isPlaying) {
      v.currentTime = currentTime;
      void v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
      setCurrentTime(v.currentTime || 0);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (vidRef.current) vidRef.current.currentTime = time;
  };

  const handleLoadedMetadata = () => {
    const v = vidRef.current;
    const d = v?.duration ?? 0;
    setDuration(isNaN(d) ? 0 : d);
  };

  // Robustly derive duration: listen to multiple events and add a short retry loop
  React.useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    const update = () => {
      const d = v.duration;
      if (d && isFinite(d) && d > 0) setDuration(d);
    };
    const handlers: Array<[keyof HTMLVideoElementEventMap, any]> = [
      ["loadedmetadata", update],
      ["durationchange", update],
      ["loadeddata", update],
      ["canplay", update],
      ["canplaythrough", update],
      ["timeupdate", update],
    ];
    handlers.forEach(([evt, fn]) => v.addEventListener(evt, fn as EventListener));
    // Poll for a short while in case events are flaky due to caching/CORS
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      update();
      if (duration > 0 || tries > 25) window.clearInterval(id);
    }, 200);
    return () => {
      window.clearInterval(id);
      handlers.forEach(([evt, fn]) => v.removeEventListener(evt, fn as EventListener));
    };
  }, [videoSource]);

  return (
    <>
      <div className="flex">
        {/* <div className="w-full lg:w-1/6">
          <button onClick={handleToggleVideo}>
            {isPlaying ? "Pause Video" : "Play Video"}
          </button>
        </div> */}
        
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
            onChange={handleTimeChange}
          />
          {duration > 0 && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Midpoint mark (vertical line) */}
              <button
                type="button"
                aria-label="Jump to middle"
                onClick={() => seekTo(duration / 2)}
                className="absolute pointer-events-auto"
                style={{
                  left: `50%`,
                  transform: "translateX(-50%)",
                  top: 0,
                  width: 2,
                  height: 20,
                  background: "#10b981",
                }}
              />
              {/* 45:00 mark (triangle from top, pointing down) - fix orientation */}
              {duration >= 2700 && (
                <button
                  type="button"
                  aria-label="Jump to 45:00"
                  onClick={() => seekTo(2700)}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${(2700 / duration) * 100}%`,
                    transform: "translateX(-50%)",
                    top: 0,
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "8px solid #2C5282",
                  }}
                />
              )}              
              {/* 45:00 remaining mark (triangle from bottom, pointing up) - fix orientation */}
              {duration >= 2700 && (
                <button
                  type="button"
                  aria-label="Jump to 45:00 remaining"
                  onClick={() => seekTo(duration - 2700)}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${((duration - 2700) / duration) * 100}%`,
                    transform: "translateX(-50%)",
                    bottom: 10,
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderBottom: "8px solid #ef4444",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <video
        ref={vidRef}
        controls
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full"
        src={videoSource}
        // poster={heroImg}
        style={{
          backgroundImage: heroImg,
          maxWidth: "100%",
          maxHeight: "100vh",
          background: "#f2f2f2",
        }}
        onTimeUpdate={() => setCurrentTime(vidRef.current?.currentTime || 0)}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </>
  );
}
