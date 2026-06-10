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
 * Solo-host rescue card. Shown immediately (no silent dead-air) when a host is
 * alone in the lobby, telling them — explicitly — that they can start vs bots
 * right now instead of waiting for humans who may never come. This is the
 * direct countermeasure to the dominant MP pre-game drop (solo host abandons
 * the empty lobby). Neutral on private/public — every solo host gets the offer.
 */
export const SoloPlayPrompt = memo<SoloPlayPromptProps>(function SoloPlayPrompt({
  onPlayVsBots,
  t,
  className = '',
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        'bg-neo-pink/15 border-3 border-neo-pink rounded-neo shadow-hard p-4',
        className,
      )}
    >
      <div className="flex items-center gap-2 font-neo-display font-black text-lg text-neo-white">
        <Bot className="w-6 h-6 text-neo-pink" aria-hidden="true" />
        <span>{t('hostView.soloPrompt.title')}</span>
      </div>
      <p className="font-neo-body text-sm text-neo-cream/90 max-w-xs">
        {t('hostView.soloPrompt.subtitle')}
      </p>
      <m.button
        type="button"
        onClick={onPlayVsBots}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'w-full h-12 flex items-center justify-center gap-2',
          'font-neo-display font-black text-lg uppercase tracking-tight',
          'bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo shadow-hard-lg',
          'active:translate-y-0.5 active:shadow-hard-pressed transition-all',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        <Bot className="w-5 h-5" aria-hidden="true" />
        <span>{t('hostView.soloPrompt.cta')}</span>
      </m.button>
    </m.div>
  );
});

export default SoloPlayPrompt;
