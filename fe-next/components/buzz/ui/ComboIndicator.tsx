'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Sparkles } from 'lucide-react';

interface ComboIndicatorProps {
  streak: number;
  showComboAnimation: boolean;
}

/**
 * ComboIndicator - Displays streak/combo status during Daily Buzz gameplay
 *
 * Shows:
 * - Current streak count with fire icon
 * - Multiplier badge when streak >= 2
 * - Animated "COMBO!" text when streak increases
 */
export default function ComboIndicator({
  streak,
  showComboAnimation,
}: ComboIndicatorProps) {
  // Calculate multiplier based on streak
  const getMultiplier = (s: number): number => {
    if (s >= 5) return 2.0;
    if (s >= 4) return 1.5;
    if (s >= 3) return 1.25;
    if (s >= 2) return 1.1;
    return 1.0;
  };

  const multiplier = getMultiplier(streak);
  const hasMultiplier = multiplier > 1.0;

  // Don't show anything if no streak
  if (streak === 0) return null;

  return (
    <div className="relative">
      {/* Streak Counter */}
      <motion.div
        key={streak}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-neo-orange/20 to-neo-pink/20 border-2 border-neo-orange rounded-neo"
      >
        <Flame
          className={`w-4 h-4 ${streak >= 3 ? 'text-neo-orange animate-pulse' : 'text-neo-orange/70'}`}
        />
        <span className="font-black text-neo-orange text-sm tabular-nums">
          {streak}
        </span>

        {/* Multiplier Badge */}
        <AnimatePresence>
          {hasMultiplier && (
            <motion.div
              initial={{ scale: 0, x: -10 }}
              animate={{ scale: 1, x: 0 }}
              exit={{ scale: 0, x: -10 }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-neo-yellow/20 border border-neo-yellow rounded text-[10px] font-black text-neo-yellow"
            >
              <Zap className="w-3 h-3" />
              x{multiplier.toFixed(1)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Combo Animation Popup */}
      <AnimatePresence>
        {showComboAnimation && streak >= 2 && (
          <motion.div
            initial={{ scale: 0, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className="flex items-center gap-1 px-3 py-1 bg-neo-pink border-2 border-neo-black rounded-neo shadow-hard-sm">
              <Sparkles className="w-4 h-4 text-neo-yellow" />
              <span className="font-black text-white text-sm uppercase tracking-wider">
                {streak >= 5
                  ? 'ON FIRE!'
                  : streak >= 3
                    ? 'COMBO!'
                    : 'NICE!'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
