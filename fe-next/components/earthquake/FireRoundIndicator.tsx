'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

interface FireRoundIndicatorProps {
  isActive: boolean;
  remainingSeconds: number;
}

/**
 * FireRoundIndicator - Shows fire round status with countdown
 *
 * Displays a pulsing badge with:
 * - Fire emoji decoration
 * - "FIRE ROUND - 2× POINTS" text
 * - Countdown timer
 * - Responsive positioning (adapts for mobile landscape)
 */
export const FireRoundIndicator: React.FC<FireRoundIndicatorProps> = ({
  isActive,
  remainingSeconds,
}) => {
  const { t } = useLanguage();
  const isLandscape = useMobileLandscape();

  // Determine position based on layout
  const positionClasses = isLandscape
    ? 'top-2 left-1/2 -translate-x-1/2' // Center top in landscape
    : 'top-4 right-4'; // Top-right in portrait/desktop

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`fixed z-[60] ${positionClasses}`}
          initial={{ scale: 0, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: -20 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          {/* Fire Round Badge */}
          <div
            className="relative bg-gradient-to-r from-neo-orange to-neo-red border-4 border-neo-black rounded-neo-lg px-4 py-2 shadow-hard-lg"
            style={{
              animation: 'fire-badge-pulse 1.5s ease-in-out infinite',
            }}
          >
            {/* Flame background decoration */}
            <div className="absolute inset-0 overflow-hidden rounded-neo opacity-20 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute bottom-0 w-8 h-12 bg-neo-yellow"
                  style={{
                    left: `${20 + i * 30}%`,
                    clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                  }}
                  animate={{
                    scaleY: [1, 1.2, 0.9, 1],
                    scaleX: [1, 0.9, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-center gap-2">
              {/* Fire emoji */}
              <motion.span
                className="text-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                🔥
              </motion.span>

              {/* Text */}
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-wide text-neo-cream leading-none">
                  {t('earthquake.fireRound') || 'Fire Round'}
                </span>
                <span className="text-xs font-bold text-neo-yellow leading-none mt-0.5">
                  {t('earthquake.multiplier') || '2× Multiplier'}
                </span>
              </div>

              {/* Countdown */}
              <div className="ml-2 bg-neo-black/20 rounded-neo px-2 py-1 border-2 border-neo-black/40">
                <motion.span
                  key={remainingSeconds}
                  className="text-xl font-black text-neo-cream tabular-nums"
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  {remainingSeconds}s
                </motion.span>
              </div>
            </div>

            {/* Sparkle effects */}
            {remainingSeconds > 0 && remainingSeconds <= 5 && (
              <>
                {[...Array(4)].map((_, i) => {
                  const angle = (i * 90 + 45) * (Math.PI / 180);
                  const distance = 40;
                  return (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-neo-yellow border border-neo-black"
                      style={{
                        left: '50%',
                        top: '50%',
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        x: [0, Math.cos(angle) * distance],
                        y: [0, Math.sin(angle) * distance],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </>
            )}
          </div>

          {/* Urgency indicator for last 5 seconds */}
          {remainingSeconds > 0 && remainingSeconds <= 5 && (
            <motion.div
              className="absolute -inset-1 border-2 border-neo-yellow rounded-neo-lg pointer-events-none"
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.98, 1.02, 0.98],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
