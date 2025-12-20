import React, { useEffect, useState } from 'react';

interface VoiceOrbProps {
  isActive: boolean;
  volume: number; // 0 to 1
  onClick: () => void;
}

const VoiceOrb: React.FC<VoiceOrbProps> = ({
  isActive,
  volume,
  onClick
}) => {
  const [visualVolume, setVisualVolume] = useState(0);

  // Smooth out volume for animation
  useEffect(() => {
    if (isActive) {
      setVisualVolume(prev => prev * 0.8 + volume * 0.2);
    } else {
      setVisualVolume(0.1);
    }
  }, [volume, isActive]);

  const outerScale = isActive ? 1 + visualVolume * 3 : 1;
  const middleScale = isActive ? 1 + visualVolume * 1.5 : 1;
  const barHeight1 = 8 + visualVolume * 30;
  const barHeight2 = 12 + visualVolume * 45;

  return (
    <div 
      className="relative flex items-center justify-center w-40 h-40 md:w-52 md:h-52 cursor-pointer" 
      onClick={onClick}
    >
      {/* Outer Glow Ring */}
      <div 
        className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full bg-cyan-500 blur-2xl transition-all duration-200"
        style={{
          transform: `scale(${outerScale})`,
          opacity: isActive ? 0.3 : 0.1
        }}
      />

      {/* Middle Ring */}
      <div 
        className={`absolute w-32 h-32 md:w-40 md:h-40 rounded-full border transition-all duration-200 ${
          isActive ? 'border-cyan-400/30 bg-cyan-900/10 border-2' : 'border-cyan-400/30'
        }`}
        style={{ transform: `scale(${middleScale})` }}
      />

      {/* Core Orb */}
      <div 
        className={`relative z-10 w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.4)] transition-colors duration-500
          ${isActive ? 'bg-gradient-to-br from-cyan-400 to-blue-600' : 'bg-slate-800 border-2 border-slate-700'}`}
      >
        {isActive ? (
          <div className="text-white text-2xl md:text-3xl font-bold animate-pulse">
            <div className="flex gap-1">
              <div 
                className="w-1 bg-white rounded-full transition-all duration-100" 
                style={{ height: barHeight1 }}
              />
              <div 
                className="w-1 bg-white rounded-full transition-all duration-100" 
                style={{ height: barHeight2 }}
              />
              <div 
                className="w-1 bg-white rounded-full transition-all duration-100" 
                style={{ height: barHeight1 }}
              />
            </div>
          </div>
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-slate-400 md:w-8 md:h-8"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        )}
      </div>

      {/* Status Text */}
      <div className="absolute -bottom-8 md:-bottom-10 text-center" />
    </div>
  );
};

export default VoiceOrb;
