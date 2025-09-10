"use client";
import React from "react";
import YouTubeVideo from "./YouTubeVideo";
import VideoComponent from "../../videoComponent";

export default function UnifiedVideo({
  videoUrl,
  youtubeId,
  onSecondChange,
  seekTo,
}: {
  videoUrl?: string | null;
  youtubeId?: string | null;
  onSecondChange?: (sec: number) => void;
  seekTo?: number | null;
}) {
  const resolved = React.useMemo(() => {
    if (youtubeId && youtubeId.trim().length > 0) {
      return { kind: "yt" as const, id: youtubeId.trim() };
    }
    const url = (videoUrl || "").trim();
    if (!url) return { kind: "html5" as const };
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com/watch?v=") || lower.includes("youtu.be/") || lower.includes("youtube.com/embed/")) {
      // Try to parse id
      try {
        const u = new URL(url);
        const v = u.searchParams.get("v");
        if (v) return { kind: "yt" as const, id: v };
        const parts = u.pathname.split("/").filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) return { kind: "yt" as const, id: last };
      } catch {/* fallthrough */}
      return { kind: "yt" as const, id: "" };
    }
    return { kind: "html5" as const };
  }, [videoUrl, youtubeId]);

  if (resolved.kind === "yt") {
    if (!resolved.id) return <div className="text-sm text-gray-600">Invalid YouTube URL/ID.</div>;
    return <YouTubeVideo videoId={resolved.id} onSecondChange={onSecondChange} seekTo={seekTo ?? undefined} />;
  }
  return <VideoComponent onSecondChange={onSecondChange} seekTo={seekTo ?? undefined} />;
}


