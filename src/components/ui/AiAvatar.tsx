import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import avatarImg from '@/assets/ai-avatar.png';

interface AiAvatarProps {
  isActive: boolean;
  volume: number;
  onClick: () => void;
  isLoading?: boolean;
}

/* ── Pulse Ring ─────────────────────────────────────────── */
function PulseRing({ delay, isActive, volume }: { delay: number; isActive: boolean; volume: number }) {
  const baseScale = isActive ? 1.05 + volume * 0.4 : 1;
  
  return (
    <motion.div
      className="absolute inset-0 rounded-full border border-accent/30"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: [baseScale, baseScale + 0.15, baseScale],
        opacity: [0.4, 0, 0.4],
      }}
      transition={{
        duration: isActive ? 1.5 : 3,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
}

/* ── Sleeping Overlay ──────────────────────────────────── */
function SleepingZzz() {
  return (
    <div className="absolute -top-2 -right-2 z-20">
      {[0, 0.8, 1.6].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute text-accent font-bold"
          style={{ fontSize: `${12 + i * 4}px` }}
          initial={{ opacity: 0, y: 0, x: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            y: [0, -30 - i * 15],
            x: [0, 8 + i * 4],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay,
            ease: 'easeOut',
          }}
        >
          Z
        </motion.span>
      ))}
    </div>
  );
}

const AiAvatar: React.FC<AiAvatarProps> = ({ isActive, volume, onClick, isLoading = false }) => {
  const isSleeping = !isActive && !isLoading;
  const glowIntensity = isActive ? 12 + volume * 30 : 4;
  const glowColor = 'hsl(var(--accent))';

  return (
    <div
      className="relative w-48 h-48 md:w-56 md:h-56 cursor-pointer select-none flex items-center justify-center"
      onClick={onClick}
      role="button"
      aria-label={isActive ? 'Stop voice session' : 'Start voice session'}
    >
      {/* Outer glow rings */}
      {isActive && (
        <>
          <PulseRing delay={0} isActive={isActive} volume={volume} />
          <PulseRing delay={0.5} isActive={isActive} volume={volume} />
          <PulseRing delay={1} isActive={isActive} volume={volume} />
        </>
      )}

      {/* Ambient glow behind avatar */}
      <motion.div
        className="absolute inset-4 rounded-full"
        animate={{
          boxShadow: `0 0 ${glowIntensity}px ${glowIntensity / 2}px ${glowColor}`,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Avatar image container */}
      <motion.div
        className="relative z-10 w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden"
        animate={
          isLoading
            ? { scale: [0.95, 1.0, 0.95] }
            : isSleeping
              ? { 
                  scale: [0.97, 0.99, 0.97],
                  y: [0, 3, 0],
                }
              : isActive
                ? { 
                    scale: [1, 1.02 + volume * 0.04, 1],
                    y: [0, -2, 0],
                  }
                : { 
                    scale: [0.98, 1.0, 0.98],
                    y: [0, -3, 0],
                  }
        }
        transition={
          isLoading
            ? { scale: { duration: 1.5, repeat: Infinity } }
            : { duration: isSleeping ? 4 : isActive ? 0.8 : 3, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {/* The avatar image with jaw movement */}
        <motion.img
          src={avatarImg}
          alt="AI Avatar"
          className="w-full h-full object-cover"
          draggable={false}
          style={{
            filter: isSleeping
              ? 'brightness(0.7) saturate(0.8)'
              : isActive
                ? `brightness(${1.05 + volume * 0.1}) saturate(${1.1 + volume * 0.2})`
                : 'brightness(0.95)',
          }}
        />

        {/* Lip sync mouth overlay */}
        <AnimatePresence>
          {isActive && volume > 0.02 && (
            <motion.div
              className="absolute z-10"
              style={{
                left: '50%',
                top: '68%',
                transform: 'translateX(-50%)',
                width: '18%',
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: Math.min(volume * 1.5, 0.85),
                scaleY: 0.3 + volume * 3.5,
                scaleX: 1 + volume * 0.5,
              }}
              exit={{ opacity: 0, scaleY: 0.1 }}
              transition={{ duration: 0.07, ease: 'easeOut' }}
            >
              <div
                className="w-full rounded-[50%]"
                style={{
                  height: `${6 + volume * 20}px`,
                  background: 'radial-gradient(ellipse at 50% 30%, hsl(0 10% 15% / 0.9), hsl(0 15% 25% / 0.7))',
                  boxShadow: '0 1px 3px hsl(0 0% 0% / 0.3), inset 0 -1px 2px hsl(0 20% 35% / 0.4)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active overlay glow on face */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: volume * 0.15 }}
              exit={{ opacity: 0 }}
              style={{
                background: `radial-gradient(circle at 50% 40%, ${glowColor} 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Sleeping indicator */}
      <AnimatePresence>
        {isSleeping && <SleepingZzz />}
      </AnimatePresence>

      {/* Loading spinner overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-full h-full rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiAvatar;
