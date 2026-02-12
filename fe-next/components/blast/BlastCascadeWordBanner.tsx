'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CascadeHighlightData } from './types';

interface BlastCascadeWordBannerProps {
  highlightData: CascadeHighlightData | null;
}

/** Gradient class by chain level — intensity scales with chain depth */
function getBannerGradient(chainLevel: number): string {
  if (chainLevel >= 4) return 'bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-purple-500';
  if (chainLevel >= 2) return 'bg-gradient-to-r from-fuchsia-500 to-purple-600';
  return 'bg-gradient-to-r from-fuchsia-400 to-purple-500';
}

/**
 * BlastCascadeWordBanner — Floating banner(s) showing cascade word details.
 * Displays word text (uppercase), CHAIN x{level} badge, and +{score}.
 * Multiple banners stack vertically for simultaneous cascade words.
 */
export function BlastCascadeWordBanner({ highlightData }: BlastCascadeWordBannerProps) {
  if (!highlightData) return null;

  return (
    <AnimatePresence>
      {highlightData.words.map((wordData, idx) => (
        <motion.div
          key={`banner-${idx}`}
          data-testid={`cascade-word-banner-${idx}`}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.3, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: idx * 0.1 }}
          className={cn(
            'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard',
            'flex items-center gap-3 text-white',
            getBannerGradient(wordData.chainLevel),
            idx > 0 ? 'mt-2' : '',
          )}
        >
          {/* Word text */}
          <span className="font-black text-xl uppercase tracking-wider">
            {wordData.word.toUpperCase()}
          </span>

          {/* Chain level badge */}
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            CHAIN x{wordData.chainLevel}
          </span>

          {/* Score */}
          <span className="font-black text-lg tabular-nums">
            +{wordData.score}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
