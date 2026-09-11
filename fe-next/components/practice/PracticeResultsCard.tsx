'use client';

/**
 * PracticeResultsCard — the adapter that hands a finished round to the shared
 * completion moment.
 *
 * Four practice modes (Matching, Spelling, Blitz, Vocab Focus) already imported
 * this component and rendered it at the end of a round, so keeping its prop
 * shape intact is what let every one of them gain stars, confetti, a stinger, a
 * reacting mascot and flying XP coins in a single change instead of four.
 *
 * Everything that used to live here — the trophy glyph, the percentage, the
 * encouragement lookup — now lives in PracticeCompletionMoment, which scores the
 * round through `lib/education/practiceJuice` so all seven modes are judged by
 * the same rules. This file only translates the old prop names into the new
 * ones and folds the three optional extras into the stats row.
 */

import { memo, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import PracticeCompletionMoment, {
  type CompletionStat,
} from '@/components/education/practice/PracticeCompletionMoment';

export interface PracticeResultsCardProps {
  /** Number of correct answers */
  correct: number;
  /** Total number of questions */
  total: number;
  /** XP earned in this session (optional) */
  xpEarned?: number;
  /** Custom mastery message (optional, shown under the headline) */
  masteryMessage?: string;
  /** Callback when the student replays this mode */
  onRestart: () => void;
  /** Callback when the student goes back to the picker */
  onBack: () => void;
  /** Custom className */
  className?: string;
  /** Total session time in seconds (optional) */
  timeSpent?: number;
  /** Best streak achieved (optional) */
  maxStreak?: number;
  /** Hints consumed during session (optional) */
  hintsUsed?: number;
  /** Jump straight into the next ready mode, when the lesson offers one. */
  onNext?: () => void;
  /** Human name of that next mode, for the button label. */
  nextLabel?: string;
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PracticeResultsCard = memo<PracticeResultsCardProps>(({
  correct,
  total,
  xpEarned,
  masteryMessage,
  onRestart,
  onBack,
  className,
  timeSpent,
  maxStreak,
  hintsUsed,
  onNext,
  nextLabel,
}) => {
  const { t } = useLanguage();

  const stats = useMemo<CompletionStat[]>(() => {
    const rows: CompletionStat[] = [];
    if (timeSpent !== undefined && timeSpent > 0) {
      rows.push({ key: 'time', label: t('education.practice.time'), value: formatClock(timeSpent) });
    }
    if (maxStreak !== undefined && maxStreak > 1) {
      rows.push({ key: 'streak', label: t('education.practice.maxStreak'), value: `${maxStreak}x` });
    }
    if (hintsUsed !== undefined && hintsUsed > 0) {
      rows.push({ key: 'hints', label: t('education.practice.hintsUsed'), value: `${hintsUsed}` });
    }
    return rows;
  }, [timeSpent, maxStreak, hintsUsed, t]);

  return (
    <div data-testid="practice-results-card" className={cn('w-full', className)}>
      <PracticeCompletionMoment
        correct={correct}
        total={total}
        xpEarned={xpEarned}
        masteryMessage={masteryMessage}
        stats={stats}
        onAgain={onRestart}
        onBack={onBack}
        onNext={onNext}
        nextLabel={nextLabel}
      />
    </div>
  );
});

PracticeResultsCard.displayName = 'PracticeResultsCard';

export default PracticeResultsCard;
