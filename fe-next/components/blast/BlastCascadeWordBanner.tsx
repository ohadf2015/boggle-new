'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import type { CascadeHighlightData } from './types';

interface BlastCascadeWordBannerProps {
  highlightData: CascadeHighlightData | null;
}

/** Chain color escalation: green → blue → purple → gold+sparkle */
function getBannerGradient(chainLevel: number): string {
  if (chainLevel >= 5) return 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500';
  if (chainLevel >= 4) return 'bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-purple-500';
  if (chainLevel >= 3) return 'bg-gradient-to-r from-blue-500 to-indigo-600';
  if (chainLevel >= 2) return 'bg-gradient-to-r from-fuchsia-500 to-purple-600';
  return 'bg-gradient-to-r from-emerald-500 to-green-600';
}

/** Chain badge color by level */
function getChainBadgeStyle(chainLevel: number): string {
  if (chainLevel >= 5) return 'bg-yellow-900/50 text-yellow-200 border-yellow-400/50';
  if (chainLevel >= 4) return 'bg-purple-900/50 text-purple-200 border-purple-400/50';
  if (chainLevel >= 3) return 'bg-blue-900/50 text-blue-200 border-blue-400/50';
  if (chainLevel >= 2) return 'bg-fuchsia-900/50 text-fuchsia-200 border-fuchsia-400/50';
  return 'bg-emerald-900/50 text-emerald-200 border-emerald-400/50';
}

/**
 * BlastCascadeWordBanner — Floating banner(s) showing cascade word details.
 * Displays word text (uppercase), CHAIN x{level} badge, and +{score}.
 * Multiple banners stack vertically for simultaneous cascade words.
 */
export function BlastCascadeWordBanner({ highlightData }: BlastCascadeWordBannerProps) {
  if (!highlightData) return null;

  return (
    <AdaptiveAnimatePresence>
      {highlightData.words.map((wordData, idx) => (
        <AdaptiveMotion.div
          key={`banner-${idx}`}
          data-testid={`cascade-word-banner-${idx}`}
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: idx * 0.06 }}
          className={cn(
            'px-5 py-2.5 rounded-neo border-3 border-neo-black shadow-hard-lg',
            'flex items-center gap-3 text-white',
            getBannerGradient(wordData.chainLevel),
            idx > 0 ? 'mt-2' : '',
          )}
        >
          {/* Word text */}
          <span className="font-black text-xl uppercase tracking-wider drop-shadow-md">
            {wordData.word.toUpperCase()}
          </span>

          {/* Chain level badge — escalating color */}
          <span className={cn(
            'px-2.5 py-1 rounded-neo border-2 text-xs font-black uppercase tracking-wider whitespace-nowrap',
            getChainBadgeStyle(wordData.chainLevel),
          )}>
            x{wordData.chainLevel}
          </span>

          {/* Score */}
          <span className="font-black text-lg tabular-nums drop-shadow-md">
            +{wordData.score}
          </span>
        </AdaptiveMotion.div>
      ))}
    </AdaptiveAnimatePresence>
  );
}
