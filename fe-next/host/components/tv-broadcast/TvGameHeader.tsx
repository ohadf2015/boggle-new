'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Radio } from 'lucide-react';
import CircularTimer from '../../../components/CircularTimer';

interface TvGameHeaderProps {
  remainingTime: number | null;
  timerValue: number; // in minutes
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
}

/**
 * TvGameHeader - Game header for TV broadcast mode
 * Shows LIVE badge, large timer, and fire round indicator
 */
const TvGameHeader = memo<TvGameHeaderProps>(({
  remainingTime,
  timerValue,
  fireRoundActive = false,
  fireRoundRemaining = 0,
  earthquakeState = 'idle',
}) => {
  const totalTimeSeconds = timerValue * 60;

  return (
    <div className="w-full px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: LIVE badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2"
        >
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-2 bg-neo-red text-neo-cream px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
          >
            <Radio className="w-5 h-5" />
            <span className="font-black text-lg uppercase tracking-wider">LIVE</span>
          </motion.div>
        </motion.div>

        {/* Center: Timer (extra large for TV) */}
        <div className="flex-1 flex justify-center">
          {remainingTime !== null && (
            <CircularTimer
              remainingTime={remainingTime}
              totalTime={totalTimeSeconds}
              size="lg"
            />
          )}
        </div>

        {/* Right: Fire Round / Earthquake indicator */}
        <div className="flex items-center gap-3">
          {/* Earthquake Warning */}
          <AnimatePresence>
            {earthquakeState === 'warning' && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 10 }}
                className="bg-neo-orange text-neo-black px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
              >
                <motion.span
                  animate={{ x: [-2, 2, -2] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                  className="font-black text-lg uppercase"
                >
                  EARTHQUAKE!
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fire Round Badge */}
          <AnimatePresence>
            {fireRoundActive && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 3 }}
                exit={{ scale: 0, rotate: 10 }}
                className="flex items-center gap-2 bg-gradient-to-r from-neo-orange to-neo-red text-neo-cream px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard-sm"
                style={{
                  animation: 'fire-glow 1s ease-in-out infinite',
                }}
              >
                <Flame className="w-6 h-6 animate-bounce" />
                <div className="text-center">
                  <span className="font-black text-lg uppercase block">FIRE ROUND</span>
                  <span className="text-xs font-bold">2X POINTS • {fireRoundRemaining}s</span>
                </div>
                <Flame className="w-6 h-6 animate-bounce" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

TvGameHeader.displayName = 'TvGameHeader';

export default TvGameHeader;
