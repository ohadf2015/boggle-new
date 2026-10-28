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
}: DailyHeaderProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  return (
    <header className="flex flex-col gap-3 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 shadow-hard-sm">
      <div className="flex items-center justify-between gap-2">
        <DailyQuestHeading />
        <div className="flex shrink-0 items-center gap-3">
          <m.span
            key={score}
            initial={reducedMotion ? undefined : { scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            data-testid="daily-score"
            aria-label={`${t('connections.daily.scoreLabel')} ${score}`}
            className="font-mono text-sm font-bold tabular-nums text-neo-yellow"
          >
            {score}
          </m.span>
          <span data-testid="daily-progress" className="font-mono text-sm font-bold tabular-nums text-neo-cyan">
            {currentIndex + 1} / {total}
          </span>
        </div>
      </div>

      <RankBadge standing={standing} rankUpId={rankUpId} onRankUpShown={onRankUpShown} />

      <div
        data-testid="daily-attempts"
        data-remaining={attemptsLeft}
        className="flex items-center justify-end gap-1.5"
        aria-label={t('connections.daily.triesLeft', { count: attemptsLeft })}
      >
        {attemptsLeft === 1 && (
          <span className="font-neo-body text-[0.7rem] font-bold uppercase tracking-wider text-neo-red">
            {t('connections.daily.lastTry')}
          </span>
        )}
        {Array.from({ length: DAILY_ATTEMPTS_PER_PUZZLE }, (_, i) => (
          <Heart
            key={i}
            aria-hidden="true"
            className={`h-4 w-4 transition-colors duration-200 ${
              i < attemptsLeft ? 'fill-neo-red text-neo-red' : 'text-neo-white/30'
            }`}
            strokeWidth={2.5}
          />
        ))}
      </div>

      <ConnectionsProgressTrack
        total={total}
        currentIndex={currentIndex}
        solvedIndices={solvedIndices}
        difficulties={difficulties}
      />
    </header>
  );
}
