'use client';

import { useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ArrowRight, Flag, Check, Eye, SkipForward } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';
import HintButton from './HintButton';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';

const QUIET_BTN =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 font-neo-body text-xs font-bold text-neo-white/70 transition-colors hover:bg-neo-white/5 disabled:cursor-not-allowed disabled:opacity-60';

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
 * Hint + way-out row, active play only. Hints: one free a day, then a short
 * rewarded ad (HintButton). The way out is the ad-gated answer reveal, or the
 * daily's free skip after enough misses when no ad is available.
 */
export function PuzzleActions({ puzzle, state, isAdmin, isDisabled, onGiveUp, onRevealHint, skipAfterMisses }: ActionsProps) {
  const { t } = useLanguage();
  const revealAnswerAd = useRewardedFeatureUnlock({
    placement: 'connections_reveal_answer',
    surface: 'hint',
    onUnlock: onGiveUp,
    disabled: isAdmin || isDisabled,
    context: { puzzleId: puzzle.id, difficulty: puzzle.difficulty },
  });

  if (state.status !== 'playing' && state.status !== 'wrong') return null;
  const answerAdBusy = revealAnswerAd.status === 'loading' || revealAnswerAd.status === 'showing';

  return (
    <div className="flex items-center justify-end gap-1">
      {isAdmin ? (
        <m.button type="button" onClick={onGiveUp} whileTap={{ scale: 0.96 }} className={`${QUIET_BTN} text-neo-red`}>
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          {t('connections.adminGiveUp')}
        </m.button>
      ) : revealAnswerAd.canShowAd ? (
        <m.button
          type="button"
          onClick={revealAnswerAd.offer}
          whileTap={{ scale: 0.96 }}
          disabled={answerAdBusy}
          aria-label={t('connections.revealAnswerAd')}
          title={t('connections.revealAnswerAd')}
          className={QUIET_BTN}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          <span className="hidden min-[430px]:inline">{t('connections.revealAnswerAd')}</span>
        </m.button>
      ) : skipAfterMisses != null && state.wrongAttempts >= skipAfterMisses ? (
        <m.button type="button" onClick={onGiveUp} whileTap={{ scale: 0.96 }} disabled={isDisabled} className={QUIET_BTN}>
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          {t('connections.daily.skipStuck')}
        </m.button>
      ) : null}
      <HintButton
        hasHint={!!puzzle.hint}
        hintRevealed={state.hintRevealed}
        isAdmin={isAdmin}
        disabled={isDisabled}
        wrongAttempts={state.wrongAttempts}
        onRevealHint={onRevealHint}
        adContext={{ puzzleId: puzzle.id }}
      />
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
  // Desktop: Enter moves on, same as the key that submitted the guess.
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || isTypingTarget(e)) return;
      e.preventDefault();
      onNextRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return (
    <m.div
      initial={{ y: 12 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 20 }}
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
    >
      <m.button
        onClick={onNext}
        data-testid="puzzle-next"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 500, damping: 12 }}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex min-w-[10rem] flex-1 basis-[12rem] max-w-xs items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-cyan px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard active:shadow-hard-pressed"
      >
        {t('connections.next')}
        <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
      </m.button>

      {showRating &&
        (!hasRated ? (
          <div className="flex items-center gap-2">
            <span className="hidden font-neo-body text-[0.7rem] text-neo-white/60 min-[480px]:inline">{t('connections.rateThis')}</span>
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
