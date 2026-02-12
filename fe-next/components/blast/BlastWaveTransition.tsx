'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BlastWaveTransitionProps {
  /** The upcoming wave number */
  waveNumber: number;
  /** Score from the wave that just ended */
  previousWaveScore: number;
  /** Words found in the wave that just ended */
  previousWaveWords: number;
  /** Clear percentage from the wave that just ended */
  previousClearPercentage: number;
  /** Called when transition ends (auto after 2.5s or on tap) */
  onAdvance: () => void;
}

/**
 * BlastWaveTransition — Full-screen overlay between waves.
 * Shows "WAVE N" with previous wave stats. Auto-advances or tap to skip.
 */
export function BlastWaveTransition({
  waveNumber,
  previousWaveScore,
  previousWaveWords,
  previousClearPercentage,
  onAdvance,
}: BlastWaveTransitionProps) {
  const hasAdvancedRef = useRef(false);

  const advance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  // Auto-advance after 2.5s
  useEffect(() => {
    const timer = setTimeout(advance, 2500);
    return () => clearTimeout(timer);
  }, [advance]);

  return (
    <div
      data-testid="wave-transition-overlay"
      onClick={advance}
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center',
        'bg-neo-black/60 backdrop-blur-sm cursor-pointer'
      )}
    >
      {/* Wave number */}
      <motion.div
        initial={{ scale: 0.3, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={cn(
          'px-8 py-4 rounded-neo border-3 border-neo-black shadow-hard-lg',
          'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700',
          'text-center mb-6'
        )}
      >
        <div className="font-black text-4xl uppercase text-white tracking-wider">
          WAVE {waveNumber}
        </div>
      </motion.div>

      {/* Previous wave stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className={cn(
          'flex gap-6 text-center',
          'bg-white/10 rounded-neo border-2 border-white/20 px-6 py-3'
        )}
      >
        <div>
          <div className="font-black text-xl text-white">{previousWaveScore}</div>
          <div className="text-[10px] font-bold text-white/50 uppercase">Score</div>
        </div>
        <div>
          <div className="font-black text-xl text-white">{previousWaveWords}</div>
          <div className="text-[10px] font-bold text-white/50 uppercase">Words</div>
        </div>
        <div>
          <div className="font-black text-xl text-white">{previousClearPercentage}%</div>
          <div className="text-[10px] font-bold text-white/50 uppercase">Cleared</div>
        </div>
      </motion.div>

      {/* Tap hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="mt-6 text-white/40 text-xs font-bold uppercase tracking-wider"
      >
        Tap to continue
      </motion.div>
    </div>
  );
}
