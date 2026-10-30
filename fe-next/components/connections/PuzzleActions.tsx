'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ArrowRight, Flag, Check, Lightbulb, Eye, SkipForward } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useExperiment } from '@/hooks/useExperiment';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { freeHintsRemaining, consumeFreeHint } from '@/lib/connections/freeHints';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';

const SECONDARY_BTN =
  'inline-flex items-center gap-2 rounded-neo border-2 bg-transparent px-4 py-2 font-neo-body text-sm font-bold transition-colors';
const QUIET_BTN =
  'inline-flex items-center gap-1.5 px-2 py-1 font-neo-body text-xs text-neo-white/60 underline-offset-4 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60';

interface ActionsProps {
  puzzle: ConnectionPuzzle;
  state: GameState;
  isAdmin: boolean;
  isDisabled: boolean;
  onGiveUp: () => void;
  onRevealHint: () => void;
  skipAfterMisses?: number;
}

/**
 * Hint + reveal row, active play only. Admins get both free; players get
 * FREE_HINTS_PER_DAY free hints, then a rewarded-ad gate (and the A/B hint-gate
 * fallback after three misses). The reveal-answer button is ad-gated for all
 * non-admins.
 */
export function PuzzleActions({ puzzle, state, isAdmin, isDisabled, onGiveUp, onRevealHint, skipAfterMisses }: ActionsProps) {
  const { t } = useLanguage();
  const { variant, trackExposure } = useExperiment('exp-connections-hint-gate-v1');
  const showFallbackHint = variant === 'after-3-wrong' && state.wrongAttempts >= 3 && !isAdmin;
  useEffect(() => {
    if (showFallbackHint && puzzle.hint && !state.hintRevealed) trackExposure();
  }, [showFallbackHint, puzzle.hint, state.hintRevealed, trackExposure]);

  const revealAnswerAd = useRewardedFeatureUnlock({
    placement: 'connections_reveal_answer',
    surface: 'hint',
    onUnlock: onGiveUp,
    disabled: isAdmin || isDisabled,
    context: { puzzleId: puzzle.id, difficulty: puzzle.difficulty },
  });
  const revealHintAd = useRewardedFeatureUnlock({
    placement: 'connections_reveal_hint',
    surface: 'hint',
    onUnlock: onRevealHint,
    disabled: isAdmin || state.hintRevealed || isDisabled || !puzzle.hint,
    context: { puzzleId: puzzle.id },
  });

  const [freeHints, setFreeHints] = useState(() => freeHintsRemaining());
  const handleFreeHint = () => {
    setFreeHints(consumeFreeHint());
    onRevealHint();
  };

  if (state.status !== 'playing' && state.status !== 'wrong') return null;
  const adBusy = (s: string) => s === 'loading' || s === 'showing';

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      {puzzle.hint && !state.hintRevealed && (
        isAdmin || freeHints > 0 ? (
          <m.button
            type="button"
            onClick={isAdmin ? onRevealHint : handleFreeHint}
            whileTap={{ scale: 0.96 }}
            className={`${SECONDARY_BTN} border-neo-yellow text-neo-yellow hover:bg-neo-yellow/10`}
          >
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
            {isAdmin ? t('connections.revealHint') : t('connections.freeHint', { count: freeHints })}
          </m.button>
        ) : revealHintAd.canShowAd || showFallbackHint ? (
          <m.button
            type="button"
            onClick={revealHintAd.canShowAd ? revealHintAd.offer : onRevealHint}
            whileTap={{ scale: 0.96 }}
            disabled={revealHintAd.canShowAd && adBusy(revealHintAd.status)}
            className={`${QUIET_BTN} hover:text-neo-yellow`}
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            {t('connections.revealHintAd')}
          </m.button>
        ) : null
      )}

      {isAdmin ? (
        <m.button
          type="button"
          onClick={onGiveUp}
          whileTap={{ scale: 0.96 }}
          className={`${SECONDARY_BTN} border-neo-red text-neo-red hover:bg-neo-red/10`}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          {t('connections.adminGiveUp')}
        </m.button>
      ) : revealAnswerAd.canShowAd ? (
        <m.button
          type="button"
          onClick={revealAnswerAd.offer}
          whileTap={{ scale: 0.96 }}
          disabled={adBusy(revealAnswerAd.status)}
          className={`${QUIET_BTN} hover:text-neo-purple-light`}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {t('connections.revealAnswerAd')}
        </m.button>
      ) : skipAfterMisses != null && state.wrongAttempts >= skipAfterMisses ? (
        <m.button
          type="button"
          onClick={onGiveUp}
          whileTap={{ scale: 0.96 }}
          disabled={isDisabled}
          className={`${QUIET_BTN} hover:text-neo-cyan`}
        >
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          {t('connections.daily.skipStuck')}
        </m.button>
      ) : null}
    </div>
  );
}

interface ResolutionProps {
  hasRated: boolean;
  showRating: boolean;
  onRate: (rating: PuzzleRating) => void;
  onNext: () => void;
}

/** After a solve / give-up: rate the riddle, then the one primary "next" action. */
export function PuzzleResolution({ hasRated, showRating, onRate, onNext }: ResolutionProps) {
  const { t } = useLanguage();
  return (
    <m.div
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 22 }}
      className="mt-4 flex flex-col items-center gap-3"
    >
      <m.button
        onClick={onNext}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-cyan px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard active:shadow-hard-pressed"
      >
        {t('connections.next')}
        <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
      </m.button>

      {showRating &&
        (!hasRated ? (
          <div className="flex items-center gap-2">
            <span className="font-neo-body text-[0.7rem] text-neo-white/60">{t('connections.rateThis')}</span>
            <m.button
              onClick={() => onRate('like')}
              whileTap={{ scale: 0.9 }}
              aria-label={t('connections.like')}
              className="inline-flex items-center justify-center rounded-neo border-2 border-neo-lime bg-transparent p-1.5 text-neo-lime transition-colors hover:bg-neo-lime/10"
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            </m.button>
            <m.button
              onClick={() => onRate('dislike')}
              whileTap={{ scale: 0.9 }}
              aria-label={t('connections.dislike')}
              className="inline-flex items-center justify-center rounded-neo border-2 border-neo-red bg-transparent p-1.5 text-neo-red transition-colors hover:bg-neo-red/10"
            >
              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            </m.button>
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-neo-cyan">
            <Check className="h-4 w-4" aria-hidden="true" />
            {t('connections.thanks')}
          </p>
        ))}
    </m.div>
  );
}
