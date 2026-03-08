'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

interface BlastLevelClearOverlayProps {
  /** Final total score */
  totalScore: number;
  /** Bonus from remaining moves */
  moveBonus: number;
  /** Number of moves remaining at clear */
  movesRemaining: number;
  /** Total moves the level started with */
  totalMoves: number;
  /** Star rating (1-3) */
  stars: 1 | 2 | 3;
  /** Called when player taps to continue */
  onContinue: () => void;
  /** Whether the auto-trigger sequence has finished */
  isSequenceComplete: boolean;
}

/**
 * BlastLevelClearOverlay — celebration overlay on level clear.
 *
 * Shows "LEVEL COMPLETE!" banner, star rating, score, move bonus,
 * and a "Next Wave" button once the auto-trigger sequence finishes.
 * Auto-advances after 5s when sequence is complete.
 */
export function BlastLevelClearOverlay({
  totalScore,
  moveBonus,
  movesRemaining,
  stars,
  onContinue,
  isSequenceComplete,
}: BlastLevelClearOverlayProps) {
  const { t } = useLanguage();
  const hasAdvancedRef = useRef(false);

  const advance = useCallback(() => {
    if (hasAdvancedRef.current || !isSequenceComplete) return;
    hasAdvancedRef.current = true;
    onContinue();
  }, [onContinue, isSequenceComplete]);

  // Auto-advance after 5s once sequence completes
  useEffect(() => {
    if (!isSequenceComplete) return;
    const timer = setTimeout(advance, 5000);
    return () => clearTimeout(timer);
  }, [advance, isSequenceComplete]);

  return (
    <div
      data-testid="level-clear-overlay"
      onClick={advance}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-6',
        'bg-black/80 backdrop-blur-sm',
        isSequenceComplete ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {/* LEVEL COMPLETE! banner */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 60, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="text-center"
      >
        <div
          className={cn(
            'bg-neo-light border-4 border-black shadow-hard rounded-neo p-6',
            'flex flex-col items-center gap-3'
          )}
        >
          <div className="font-black text-5xl uppercase tracking-tight font-neo-display text-black">
            {t('blast.levelComplete')}
          </div>

          {/* Star rating */}
          <div className="flex gap-2 justify-center text-4xl" aria-label={`${stars} stars`}>
            {[1, 2, 3].map((i) => (
              <AdaptiveMotion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 15,
                  delay: 0.3 + i * 0.3,
                }}
              >
                <span className={i <= stars ? 'text-yellow-400' : 'text-white/20'}>
                  &#9733;
                </span>
              </AdaptiveMotion.div>
            ))}
          </div>
        </div>
      </AdaptiveMotion.div>

      {/* Score + bonus stats */}
      <div className="flex gap-3">
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 24 }}
          className={cn(
            'flex flex-col items-center px-5 py-3',
            'bg-gray-900 rounded-neo border border-gray-600 shadow-hard-sm',
            'min-w-[100px]'
          )}
        >
          <span className="font-black text-3xl text-white font-neo-display tabular-nums">
            {totalScore}
          </span>
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-0.5">
            {t('common.score')}
          </span>
        </AdaptiveMotion.div>

        {movesRemaining > 0 && moveBonus > 0 && (
          <AdaptiveMotion.div
            data-testid="level-clear-bonus"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 24 }}
            className={cn(
              'flex flex-col items-center px-5 py-3',
              'bg-gray-900 rounded-neo border border-cyan-600 shadow-hard-sm',
              'min-w-[100px]'
            )}
          >
            <span className="font-black text-3xl text-cyan-400 font-neo-display tabular-nums">
              +{moveBonus}
            </span>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-0.5">
              {t('blast.moveBonus')}
            </span>
          </AdaptiveMotion.div>
        )}
      </div>

      {/* Next Wave button — only after sequence completes */}
      {isSequenceComplete && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 24 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            data-testid="level-clear-continue-btn"
            onClick={e => {
              e.stopPropagation();
              advance();
            }}
            className={cn(
              'bg-lime-400 border-3 border-black shadow-hard-sm text-black',
              'font-black text-xl uppercase py-4 px-8 rounded-neo',
              'active:shadow-hard-pressed active:translate-y-0.5',
              'transition-transform duration-75'
            )}
          >
            {t('blast.nextWave')}
          </button>
        </AdaptiveMotion.div>
      )}
    </div>
  );
}
