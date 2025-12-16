import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface VoiceOrbProps {
    isActive: boolean;
    volume: number; // 0 to 1
    onClick: () => void;
}

const VoiceOrb: React.FC<VoiceOrbProps> = ({ isActive, volume, onClick }) => {
    const [visualVolume, setVisualVolume] = useState(0);

    // Smooth out volume for animation
    useEffect(() => {
        if (isActive) {
            setVisualVolume(prev => prev * 0.8 + volume * 0.2);
        } else {
            setVisualVolume(0.1);
        }
    }, [volume, isActive]);

    return (
        <div className="relative flex items-center justify-center w-40 h-40 md:w-52 md:h-52 cursor-pointer" onClick={onClick}>
            {/* Outer Glow Ring */}
            <motion.div
                animate={{
                    scale: isActive ? 1 + visualVolume * 3 : 1,
                    opacity: isActive ? 0.3 : 0.1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full bg-cyan-500 blur-2xl"
            />

            {/* Middle Ring */}
            <motion.div
                animate={{
                    scale: isActive ? 1 + visualVolume * 1.5 : 1,
                    borderWidth: isActive ? 2 : 1,
                }}
                className={`absolute w-32 h-32 md:w-40 md:h-40 rounded-full border border-cyan-400/30 ${isActive ? 'bg-cyan-900/10' : ''}`}
            />

            {/* Core Orb */}
            <motion.div
                animate={{
                    scale: isActive ? [1, 1.05, 1] : 1,
                }}
                transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut"
                }}
                className={`relative z-10 w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.4)] transition-colors duration-500
            ${isActive
                        ? 'bg-gradient-to-br from-cyan-400 to-blue-600'
                        : 'bg-slate-800 border-2 border-slate-700'
                    }`}
            >
                {isActive ? (
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-white text-2xl md:text-3xl font-bold"
                    >
                        <div className="flex gap-1">
                            <motion.div animate={{ height: 8 + visualVolume * 30 }} className="w-1 bg-white rounded-full" />
                            <motion.div animate={{ height: 12 + visualVolume * 45 }} className="w-1 bg-white rounded-full" />
                            <motion.div animate={{ height: 8 + visualVolume * 30 }} className="w-1 bg-white rounded-full" />
                        </div>
                    </motion.div>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 md:w-8 md:h-8">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                )}
            </motion.div>

            {/* Status Text */}
            <div className="absolute -bottom-8 md:-bottom-10 text-center">
                <p className={`text-xs md:text-sm font-medium tracking-wider ${isActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`}>
                    {isActive ? 'LISTENING...' : 'TAP TO START'}
                </p>
            </div>
        </div>
    );
};

export default VoiceOrb;