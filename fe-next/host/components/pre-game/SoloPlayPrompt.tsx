'use client';

import { memo } from 'react';
import { m } from 'framer-motion';
import { Bot } from 'lucide-react';
import { cn } from '../../../lib/utils';

// ==================== Props ====================

interface SoloPlayPromptProps {
  /** Start the game right now, filling the empty seats with bots. */
  onPlayVsBots: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ==================== Component ====================

/**
 * Solo-host rescue bar. Shown immediately (no silent dead-air) when a host is
 * alone in the lobby, telling them — explicitly — that they can start vs bots
 * right now instead of waiting for humans who may never come. This is the
 * direct countermeasure to the dominant MP pre-game drop (solo host abandons
 * the empty lobby). Neutral on private/public — every solo host gets the offer.
 *
 * Compact single-row layout (icon + headline/subtitle + inline CTA) so it
 * nudges without dominating the lobby — the roster and battle modes stay above
 * the fold on a phone.
 */
export const SoloPlayPrompt = memo<SoloPlayPromptProps>(function SoloPlayPrompt({
  onPlayVsBots,
  t,
  className = '',
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-3 text-start',
        'bg-neo-pink/15 border-2 border-neo-pink rounded-neo shadow-hard-sm px-3 py-2',
        className,
      )}
    >
      <Bot className="w-5 h-5 text-neo-pink shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-neo-display font-black text-sm leading-tight text-neo-white truncate">
          {t('hostView.soloPrompt.title')}
        </p>
        <p className="font-neo-body text-[11px] leading-tight text-neo-cream/80 truncate">
          {t('hostView.soloPrompt.subtitle')}
        </p>
      </div>
      <m.button
        type="button"
        onClick={onPlayVsBots}
        whileTap={{ scale: 0.96 }}
        className={cn(
          'shrink-0 h-9 px-3 flex items-center justify-center gap-1.5',
          'font-neo-display font-black text-sm uppercase tracking-tight',
          'bg-neo-lime text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm',
          'active:translate-y-0.5 active:shadow-none transition-all',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        <Bot className="w-4 h-4" aria-hidden="true" />
        <span>{t('hostView.soloPrompt.cta')}</span>
      </m.button>
    </m.div>
  );
});

export default SoloPlayPrompt;
