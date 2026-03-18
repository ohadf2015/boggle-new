'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

interface BlastMoveCounterProps {
  movesRemaining: number;
  totalMoves: number;
  t: (key: string) => string | undefined;
  /** When set, shows a "+N Move!" popup animation */
  bonusMoveAwarded?: number;
}

/**
 * BlastMoveCounter — Prominent move counter for blast mode.
 * Shows moves remaining with color-coded urgency and bonus move popups.
 */
export function BlastMoveCounter({
  movesRemaining,
  totalMoves,
  t,
  bonusMoveAwarded,
}: BlastMoveCounterProps) {
  // Don't render in unlimited mode
  if (!isFinite(totalMoves)) return null;

  const urgency = movesRemaining <= 1 ? 'red shake' :
    movesRemaining <= 2 ? 'red' :
    movesRemaining <= 5 ? 'yellow' :
    'green';

  const bgClass = urgency.includes('red')
    ? 'from-red-500 to-red-700'
    : urgency === 'yellow'
    ? 'from-amber-400 to-amber-600'
    : 'from-emerald-400 to-emerald-600';

  const bonusText = bonusMoveAwarded === 1
    ? t('blast.bonusMove')
    : bonusMoveAwarded && bonusMoveAwarded > 1
    ? (t('blast.bonusMoves') || '').replace('{count}', String(bonusMoveAwarded))
    : null;

  return (
    <div className="relative">
      <AdaptiveMotion.div
        data-testid="move-counter"
        className={cn(
          'border-3 border-neo-black rounded-neo shadow-hard px-3 py-1.5 min-w-[70px]',
          `bg-gradient-to-br ${bgClass}`,
          urgency,
          urgency.includes('shake') && 'animate-neo-shake',
        )}
        key={movesRemaining}
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        aria-label={`${movesRemaining} ${t('blast.movesLeft')}`}
      >
        <div className="text-center">
          <div className="font-black text-neo-black text-xl sm:text-2xl leading-tight tabular-nums">
            {movesRemaining}
          </div>
          <div className="font-bold uppercase tracking-wider text-neo-black/60 text-[10px] sm:text-xs">
            {t('blast.movesLeft')}
          </div>
        </div>
      </AdaptiveMotion.div>

      {/* Bonus move popup */}
      <AdaptiveAnimatePresence>
        {bonusText && (
          <AdaptiveMotion.span
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: -18, scale: 1 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-black text-sm text-neo-lime drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none z-10"
          >
            {bonusText}
          </AdaptiveMotion.span>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
