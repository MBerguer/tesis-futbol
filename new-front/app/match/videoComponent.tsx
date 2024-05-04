import React, { useRef, useState } from "react";

export default function VideoComponent(props) {
  const videoSource =
    "https://s3.amazonaws.com/azvideotagtesting/21012876/videos/139069/Nacional%205-1%20Juventud%20Clausura%202023.mp4";

  // add a thumbnail fo a playback button
  const heroImg = "https://nacional.uy/assets/images/logo.svg";

  const vidRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const handleToggleVideo = () => {
    if (!isPlaying) {
      vidRef.current.currentTime = currentTime;
      vidRef.current.play();
      setIsPlaying(true);
    } else {
      vidRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(vidRef.current.currentTime);
    }
  };

  const handleTimeChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    vidRef.current.currentTime = time;
  };

  const handleLoadedMetadata = () => {
    const duration = vidRef.current.duration;
    vidRef.current.max = duration;
  };

  return (
    <>
      <div className="flex">
        <div className="w-full lg:w-1/6">
          <button onClick={handleToggleVideo}>
            {isPlaying ? "Pause Video" : "Play Video"}
          </button>
        </div>
        <div className="w-full lg:w-1/6">
          <span>{currentTime}</span> {/* Display current time */}
        </div>
        <div className="w-full lg:w-4/6">
          <input
            className="w-full"
            id="videoTime"
            type="range"
            min="0"
            max={vidRef.current?.duration || 0}
            value={currentTime}
            onChange={handleTimeChange}
          />
        </div>
      </div>
      <video
        ref={vidRef}
        controls
        className="w-full"
        src={videoSource}
        // poster={heroImg}
        style={{
          backgroundImage: heroImg,
          maxWidth: "100%",
          maxHeight: "100vh",
          background: "#f2f2f2",
        }}
        onTimeUpdate={() => setCurrentTime(vidRef.current.currentTime)}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </>
  );
}
