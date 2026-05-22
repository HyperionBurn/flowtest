import React, { useEffect } from 'react';
import { useAppStore, type PinnTrainingSnapshot } from '../store/useAppStore';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';

export default function PinnController() {
  const {
    pinnHistory,
    currentPlaybackEpoch,
    isPlaybackPlaying,
    playbackSpeed,
    setCurrentPlaybackEpoch,
    setIsPlaybackPlaying,
    setPlaybackSpeed
  } = useAppStore();

  // Handle automatic playback loop
  useEffect(() => {
    if (!isPlaybackPlaying || !pinnHistory || pinnHistory.length === 0) return;

    const interval = setInterval(() => {
      const currentIndex = pinnHistory.findIndex((h: PinnTrainingSnapshot) => h.epoch === currentPlaybackEpoch);
      let nextIndex = currentIndex + 1;
      if (nextIndex >= pinnHistory.length) {
        nextIndex = 0;
      }
      setCurrentPlaybackEpoch(pinnHistory[nextIndex].epoch);
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaybackPlaying, pinnHistory, currentPlaybackEpoch, playbackSpeed, setCurrentPlaybackEpoch]);

  if (!pinnHistory || pinnHistory.length === 0) {
    return (
      <div className="absolute bottom-6 left-6 right-6 z-10 p-4 bg-panel-dark/85 backdrop-blur-md border border-border-dark rounded-xl flex items-center justify-center">
        <span className="text-xs text-gray-500 font-mono tracking-widest uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Awaiting PINN History Compile...
        </span>
      </div>
    );
  }

  const currentIndex = pinnHistory.findIndex((h: PinnTrainingSnapshot) => h.epoch === currentPlaybackEpoch);
  const safeIndex = currentIndex !== -1 ? currentIndex : pinnHistory.length - 1;
  const progressPercent = (safeIndex / (pinnHistory.length - 1)) * 100;

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    if (pinnHistory[idx]) {
      setCurrentPlaybackEpoch(pinnHistory[idx].epoch);
    }
  };

  const handleReset = () => {
    setIsPlaybackPlaying(false);
    setCurrentPlaybackEpoch(pinnHistory[0].epoch);
  };

  const speeds = [
    { label: '0.5x', value: 120 },
    { label: '1x', value: 60 },
    { label: '2x', value: 30 },
    { label: '4x', value: 15 }
  ];

  return (
    <div className="absolute bottom-6 left-6 right-6 z-10 p-5 bg-[#111113]/90 backdrop-blur-md border border-[#232326] rounded-xl shadow-2xl flex flex-col gap-4 select-none">
      
      {/* Upper Timeline Row */}
      <div className="flex items-center gap-4">
        
        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaybackPlaying(!isPlaybackPlaying)}
          className={`p-2.5 rounded-lg border flex items-center justify-center transition-all duration-300 ${
            isPlaybackPlaying
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
              : 'bg-panel-dark border-border-dark text-gray-400 hover:text-white hover:border-gray-600'
          }`}
        >
          {isPlaybackPlaying ? (
            <Pause className="w-4 h-4 fill-cyan-400 text-cyan-400" />
          ) : (
            <Play className="w-4 h-4 fill-gray-400 text-gray-400 hover:fill-white" />
          )}
        </button>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="p-2.5 rounded-lg border bg-panel-dark border-border-dark text-gray-450 hover:text-white hover:border-gray-600 transition-all duration-300"
          title="Reset to Epoch 0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Timeline Range Input Wrapper */}
        <div className="flex-1 flex items-center gap-3 relative">
          <input
            type="range"
            min="0"
            max={pinnHistory.length - 1}
            value={safeIndex}
            onChange={handleScrubberChange}
            className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-cyan-500 border border-[#232326] focus:outline-none"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${progressPercent}%, #1b1b1e ${progressPercent}%, #1b1b1e 100%)`
            }}
          />
        </div>

        {/* Epoch Telemetry Info */}
        <div className="px-4 py-1.5 bg-[#09090a] border border-[#1c1c1f] rounded-lg shrink-0 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
          <span className="text-[10px] font-mono tracking-wider uppercase text-gray-500">Epoch:</span>
          <span className="text-xs font-mono font-light text-white w-8 text-right">
            {String(currentPlaybackEpoch).padStart(3, '0')}
          </span>
        </div>

      </div>

      {/* Lower Speed & Status Row */}
      <div className="flex justify-between items-center border-t border-[#1b1b1e] pt-3 text-[10px] font-mono">
        <div className="flex items-center gap-2 text-gray-500 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          PINN Training Frame Playback
        </div>
        
        {/* Speed selectors */}
        <div className="flex items-center gap-1.5 bg-[#0c0c0e] p-1 border border-[#1b1b1e] rounded-lg">
          {speeds.map((speed) => (
            <button
              key={speed.label}
              onClick={() => setPlaybackSpeed(speed.value)}
              className={`px-2.5 py-1 rounded text-[9px] font-mono tracking-tighter transition-all duration-300 ${
                playbackSpeed === speed.value
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {speed.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
