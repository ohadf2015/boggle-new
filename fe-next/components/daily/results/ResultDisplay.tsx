/**
 * ResultDisplay — the Word Hunt body under the shared DailyResultsHero:
 * the answer (with a spoiler toggle for screenshots), its meaning, how the
 * score was earned, and when the next puzzle drops. Score, outcome, puzzle
 * number and streak live in the hero, so none of them repeat here.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Clock, Eye, EyeOff, Zap, Target, BookOpen, Sparkles, PartyPopper } from 'lucide-react';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import { isRonPrankUser, RON_PRANK_BONUS_POINTS } from '@/utils/dailyChallenge/ronPrank';
import { isMeaningDisplayableForLanguage } from '@/lib/dailyChallenge/wordMeaningPolicy';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { fireConfetti } from '@/utils/confettiUtils';
import { cn } from '@/lib/utils';
import { getScoreTier } from './scoreFeedbackTiers';
import type { Language } from '@/types';

export interface ResultDisplayProps {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  streakDays: number;
  language: Language;
  countdown: string;
  lifeRemaining?: number;
  wordsDiscovered?: number;
  /** Current player's id — drives the display-only Ron bonus easter egg. */
  currentUserId?: string | null;
  meaning?: string | null;
  t: (key: string) => string;
}

/** Max attainable daily score — the tier percentage is relative to this. */
const MAX_SCORE = 1000;

const CHIPS = [
  { id: 'speed', cls: 'bg-neo-cyan/10 border-neo-cyan/30 text-neo-cyan', Icon: Zap },
  { id: 'accuracy', cls: 'bg-neo-lime/10 border-neo-lime/30 text-neo-lime', Icon: Target },
  { id: 'exploration', cls: 'bg-neo-pink/10 border-neo-pink/30 text-neo-pink', Icon: BookOpen },
] as const;

const enter = (delay: number) => ({
  initial: { y: 10, scale: 0.9 },
  animate: { y: 0, scale: 1 },
  transition: { ...SPRING_PRESETS.balanced, delay },
});

function TomorrowLine({ streakDays, testId, countdown, t }: { streakDays: number; testId: string; countdown: string; t: ResultDisplayProps['t'] }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div data-testid={testId} className="text-sm font-bold text-neo-lime uppercase tracking-widest leading-tight text-center">
        {streakDays > 0
          ? t('wordHunt.results.extendStreak').replace('{days}', String(streakDays + 1))
          : t('wordHunt.results.startStreak')}
      </div>
      <div
        data-testid="countdown-secondary"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neo-navy rounded-neo border-2 border-neo-black text-neo-white/60"
      >
        <Clock className="w-3 h-3" aria-hidden />
        <span className="text-[10px] font-bold uppercase tabular-nums">{countdown}</span>
      </div>
    </div>
  );
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  solved,
  attemptsUsed,
  targetWord,
  streakDays,
  language,
  countdown,
  lifeRemaining = 0,
  wordsDiscovered = 0,
  currentUserId,
  meaning,
  t,
}) => {
  const [wordHidden, setWordHidden] = useState(false);
  const showRonBonus = solved && isRonPrankUser(currentUserId);

  const breakdown = useMemo(
    () => getScoreBreakdown(lifeRemaining, attemptsUsed, wordsDiscovered, solved),
    [lifeRemaining, attemptsUsed, wordsDiscovered, solved],
  );
  const tier = getScoreTier(breakdown.total, MAX_SCORE);
  const word = language === 'he' ? applyHebrewFinalLetters(targetWord ?? '') : (targetWord ?? '').toUpperCase();

  if (!solved) {
    return (
      <div className="w-full rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard p-4">
        <TomorrowLine streakDays={streakDays} testId="tomorrow-promise-loss" countdown={countdown} t={t} />
      </div>
    );
  }

  return (
    <div className="w-full rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard p-4 flex flex-col items-center gap-4">
      <m.div {...enter(0.5)} className="relative">
        <div
          data-testid={`score-tier-${tier.id}`}
          className={cn('inline-flex items-center gap-2 px-4 py-1.5 bg-linear-to-r rounded-neo border-3 border-neo-black shadow-hard', tier.gradient)}
        >
          {tier.id === 'legendary' && <Sparkles className="w-4 h-4 text-neo-black" aria-hidden />}
          <span className="font-black text-neo-black text-base uppercase tracking-wider">{t(tier.key)}</span>
          {tier.id === 'legendary' && <Sparkles className="w-4 h-4 text-neo-black" aria-hidden />}
        </div>
      </m.div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-[10px] text-neo-white/60 uppercase font-bold tracking-widest">{t('wordHunt.results.targetWord')}</div>
        <div className="flex items-center gap-2 select-none">
          <button
            type="button"
            data-testid="result-answer"
            onClick={() => fireConfetti({ particleCount: 50, spread: 100, origin: { y: 0.4 } })}
            aria-label={t('wordHunt.results.tapToCelebrate')}
            className="flex gap-1 justify-center flex-wrap cursor-pointer"
          >
            {Array.from(word).map((letter, i) => (
              <m.span
                key={`${wordHidden ? 'blank' : 'letter'}-${i}`}
                data-testid={wordHidden ? undefined : `letter-${letter}`}
                {...enter(0.6 + i * 0.05)}
                className={cn(
                  'inline-flex items-center justify-center w-8 h-10 rounded-neo border-2 font-black text-lg',
                  wordHidden ? 'bg-neo-navy border-neo-white/20 text-neo-white/40' : 'bg-neo-lime/20 border-neo-lime/50 text-neo-lime',
                )}
              >
                {wordHidden ? '?' : letter}
              </m.span>
            ))}
          </button>
          <button
            type="button"
            data-testid="word-visibility-toggle"
            onClick={() => setWordHidden(h => !h)}
            className="p-1.5 rounded-lg text-neo-white/60 hover:text-neo-white hover:bg-neo-navy transition-colors"
            aria-label={wordHidden ? 'Show word' : 'Hide word'}
          >
            {wordHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* A stale gloss in another script (e.g. English on a Hebrew target) is never shown. */}
      {isMeaningDisplayableForLanguage(language, meaning) && (
        <m.div {...enter(0.75)} className="w-full max-w-xs">
          <div className="flex items-start gap-3 rounded-neo border-3 border-neo-black bg-neo-cyan/15 px-4 py-3 shadow-hard text-start">
            <BookOpen className="w-5 h-5 text-neo-cyan shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-neo-cyan">{t('wordHunt.results.meaning')}</span>
              <span className="text-base font-bold text-neo-cream leading-snug">{meaning}</span>
            </div>
          </div>
        </m.div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {CHIPS.map(({ id, cls, Icon }, i) => (
          <m.span
            key={id}
            {...enter(0.85 + i * 0.08)}
            className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 text-xs font-bold shadow-hard-sm', cls)}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden /> +{breakdown[id]}
          </m.span>
        ))}
        {showRonBonus && (
          <m.span
            data-testid="ron-bonus-chip"
            {...enter(1.1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 text-xs font-black bg-neo-yellow/15 border-neo-yellow/40 text-neo-yellow shadow-hard-sm"
          >
            <PartyPopper className="w-3.5 h-3.5" aria-hidden />
            +{RON_PRANK_BONUS_POINTS.toLocaleString('en-US')}
          </m.span>
        )}
      </div>

      <TomorrowLine streakDays={streakDays} testId="tomorrow-promise" countdown={countdown} t={t} />
    </div>
  );
};

export default ResultDisplay;
