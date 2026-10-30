'use client';

import { m } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DAILY_ATTEMPTS_PER_PUZZLE } from '@/lib/connections/daily';
import type { RankId, RankStanding } from '@/lib/connections/progress';
import ConnectionsProgressTrack from './ConnectionsProgressTrack';
import RankBadge from './RankBadge';
import DailyQuestHeading from './DailyQuestHeading';

interface DailyHeaderProps {
  score: number;
  currentIndex: number;
  total: number;
  attemptsLeft: number;
  solvedIndices: ReadonlySet<number>;
  difficulties: readonly string[];
  standing: RankStanding;
  rankUpId: RankId | null;
  onRankUpShown: () => void;
  /** 'bar' = compact phone header above the card; 'rail' = desktop side panel. */
  variant?: 'bar' | 'rail';
}

/** The run's dashboard: rank, score, tries left and the easy-to-hard journey track. */
export default function DailyHeader({
  score,
  currentIndex,
  total,
  attemptsLeft,
  solvedIndices,
  difficulties,
  standing,
  rankUpId,
  onRankUpShown,
  variant = 'bar',
}: DailyHeaderProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const hearts = (
    <div
      data-testid="daily-attempts"
      data-remaining={attemptsLeft}
      className="flex shrink-0 items-center justify-end gap-1"
      aria-label={t('connections.daily.triesLeft', { count: attemptsLeft })}
    >
      {attemptsLeft === 1 && (
        <span className="font-neo-body text-[0.7rem] font-bold uppercase tracking-wider text-neo-red rtl:tracking-normal">
          {t('connections.daily.lastTry')}
        </span>
      )}
      {Array.from({ length: DAILY_ATTEMPTS_PER_PUZZLE }, (_, i) => {
        const alive = i < attemptsLeft;
        return (
          <m.span
            key={i}
            initial={false}
            animate={
              reducedMotion
                ? undefined
                : alive
                  ? attemptsLeft === 1 ? { scale: [1, 1.18, 1] } : { scale: 1, y: 0, rotate: 0 }
                  : { scale: [1.4, 0.75], y: [0, 3], rotate: [0, -18] }
            }
            transition={
              alive && attemptsLeft === 1
                ? { duration: 0.9, repeat: 2, ease: 'easeInOut' }
                : { duration: 0.35, ease: 'easeOut' }
            }
            className="inline-flex"
          >
            <Heart
              aria-hidden="true"
              className={`h-4 w-4 transition-colors duration-200 ${alive ? 'fill-neo-red text-neo-red' : 'text-neo-white/30'}`}
              strokeWidth={2.5}
            />
          </m.span>
        );
      })}
    </div>
  );

  return (
    <header
      className={
        variant === 'rail'
          ? 'flex flex-col gap-4 px-3 pb-4'
          : 'flex shrink-0 flex-col gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2.5 shadow-hard-sm'
      }
    >
      {/* pe-10 in the bar: the global in-game mute button floats over the inline-end corner. */}
      <div className={`flex items-center justify-between gap-2 ${variant === 'bar' ? 'pe-10' : ''}`}>
        <DailyQuestHeading />
        <div className="flex shrink-0 items-center gap-3" dir="ltr">
          <m.span
            key={score}
            initial={reducedMotion ? undefined : { scale: 1.6, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
            data-testid="daily-score"
            aria-label={`${t('connections.daily.scoreLabel')} ${score}`}
            className="inline-block font-mono text-base font-bold tabular-nums text-neo-yellow"
          >
            {score}
          </m.span>
          <span data-testid="daily-progress" className="font-mono text-sm font-bold tabular-nums text-neo-cyan">
            {currentIndex + 1} / {total}
          </span>
        </div>
      </div>

      {variant === 'rail' ? (
        <>
          <RankBadge standing={standing} rankUpId={rankUpId} onRankUpShown={onRankUpShown} />
          {hearts}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <RankBadge compact standing={standing} rankUpId={rankUpId} onRankUpShown={onRankUpShown} />
          </div>
          {hearts}
        </div>
      )}

      <ConnectionsProgressTrack
        total={total}
        currentIndex={currentIndex}
        solvedIndices={solvedIndices}
        difficulties={difficulties}
      />
    </header>
  );
}
