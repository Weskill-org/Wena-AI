
import React from 'react';
import { motion } from 'motion/react';

interface AvatarProps {
  volume: number;
  isSpeaking: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ volume, isSpeaking }) => {
  // volume is 0 to 1
  const mouthScale = 0.2 + volume * 2;
  const glowIntensity = isSpeaking ? 0.5 + volume * 0.5 : 0.2;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer Glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl"
        animate={{
          scale: isSpeaking ? [1, 1.2, 1] : 1,
          opacity: glowIntensity,
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />

      {/* Main Head */}
      <div className="relative w-48 h-48 rounded-full bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
        {/* Eyes */}
        <div className="flex gap-12 mb-4">
          <motion.div 
            className="w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"
            animate={{
              scaleY: isSpeaking ? [1, 0.1, 1] : 1,
            }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
          <motion.div 
            className="w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"
            animate={{
              scaleY: isSpeaking ? [1, 0.1, 1] : 1,
            }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
        </div>

        {/* Mouth / Visualizer */}
        <motion.div
          className="w-12 h-2 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(96,165,250,0.6)]"
          animate={{
            height: isSpeaking ? mouthScale * 20 : 4,
            width: isSpeaking ? 48 + volume * 20 : 48,
            borderRadius: isSpeaking ? "50%" : "9999px",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />

        {/* Subtle inner details */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
      </div>

      {/* Floating particles */}
      {isSpeaking && Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400 rounded-full"
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 1 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};
