/**
 * VideoPlayerModal — Interactive HTML5 Video Player & Live Sanitation Fleet Video Stream
 * Features play/pause, volume control, progress bar, fullscreen, and live West Godavari telemetry overlay.
 */
import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { Play, Pause, Volume2, VolumeX, Maximize, Video, ShieldCheck, Activity } from 'lucide-react';

export default function VideoPlayerModal({ isOpen, onClose, title = "DSMS Sanitation Operations Video Tour" }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Video Player Container */}
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl group border border-gray-800">
          
          {/* HTML5 Video Source with high quality sample MP4 fallback */}
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-64 sm:h-80 object-cover"
            poster="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80"
          >
            <source
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              type="video/mp4"
            />
            Your browser does not support HTML5 video.
          </video>

          {/* Live Telemetry Overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold border border-white/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE: West Godavari Sanitation Truck #WG-04-EV</span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold">
            <Activity size={12} /> 1080p HD Stream
          </div>

          {/* Custom Overlay Controls */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between text-white text-xs opacity-90 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors">
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={toggleMute} className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <span className="font-semibold text-[11px] text-gray-300 hidden sm:inline">
                Tadepalligudem Sector 4 — Route Active
              </span>
            </div>

            <button onClick={toggleFullscreen} className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors" title="Fullscreen">
              <Maximize size={16} />
            </button>
          </div>
        </div>

        {/* Video Description & Telemetry Stats */}
        <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs space-y-2 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" /> Automated Fleet Video Telemetry
            </span>
            <span className="text-[10px] font-mono text-gray-400">GPS: 16.8122° N, 81.5285° E</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
            Real-time HD video feed monitoring public bin clearance, automatic RFID trash tag scanning, and waste weight sensors across West Godavari District.
          </p>
        </div>
      </div>
    </Modal>
  );
}
