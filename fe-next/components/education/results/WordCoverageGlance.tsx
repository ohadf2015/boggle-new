/**
 * The class's word coverage in one glance.
 *
 * A teacher standing at the back of the room gets one number and one bar; the
 * chips underneath answer "which ones" without a second screen. For the
 * teacher "found" means the class found it; for a student it means they did —
 * same list, different question.
 *
 * A word the board generator never embedded is drawn as an outline chip, not a
 * miss. It is a fact about the board, not about the class.
 */

'use client';

import { Check, X, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassroomSummary } from '@/shared/types/classroom';

export interface WordCoverageGlanceProps {
  summary: ClassroomSummary;
  username: string;
  isTeacher: boolean;
  /** Lower-cased set of words the board never carried. */
  neverPlaced: Set<string>;
  /** `projector` scales the type for the back of a classroom. */
  size?: 'card' | 'projector';
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function WordCoverageGlance({
  summary,
  username,
  isTeacher,
  neverPlaced,
  size = 'card',
  t,
}: WordCoverageGlanceProps) {
  const projector = size === 'projector';
  // A late joiner has no mastery row; treat them as having found nothing rather
  // than crashing or hiding the card.
  const mine = summary.masteryByPlayer[username] ?? { found: 0, total: summary.totalWords };
  const found = isTeacher ? summary.classFoundCount : mine.found;
  const total = isTeacher ? summary.totalWords : mine.total;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;

  const foundByMe = (word: { foundBy: string[] }) =>
    word.foundBy.some((n) => n.toLowerCase() === username.toLowerCase());

  return (
    <section className={projector ? '' : 'mb-4'}>
      <div className="flex items-end gap-3 mb-2">
        <span
          className={cn(
            'font-neo-display font-black text-neo-lime leading-none tabular-nums',
            projector ? 'text-7xl' : 'text-4xl'
          )}
        >
          {found}
          <span className={cn('text-neo-white/50', projector ? 'text-4xl' : 'text-2xl')}>
            /{total}
          </span>
        </span>
        <p
          className={cn(
            'flex-1 text-neo-white font-neo-body font-bold leading-tight pb-1',
            projector ? 'text-2xl' : 'text-sm'
          )}
        >
          {isTeacher
            ? t('education.results.classCoverage', { found, total })
            : t('education.results.yourMastery', { found, total })}
        </p>
      </div>

      <div
        data-testid="coverage-meter"
        role="progressbar"
        aria-valuenow={found}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t('education.results.coverageMeterLabel', { percent: pct })}
        className={cn(
          'w-full rounded-neo border-neo border-neo-black bg-neo-navy-elevated overflow-hidden mb-3',
          projector ? 'h-8' : 'h-4'
        )}
      >
        <div
          className="h-full bg-neo-lime transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="flex flex-wrap gap-2">
        {summary.coverage.map((entry) => {
          const hit = isTeacher ? entry.foundBy.length > 0 : foundByMe(entry);
          const unplaced = !hit && neverPlaced.has(entry.word.toLowerCase());
          return (
            <li
              key={entry.word}
              data-testid={`lesson-word-${entry.word}`}
              data-found={String(hit)}
              data-placed={unplaced ? 'false' : 'true'}
              className={cn(
                'flex items-center gap-1.5 rounded-neo font-bold',
                projector ? 'px-4 py-2.5 text-2xl' : 'px-3 py-1.5 text-sm',
                hit && 'border-neo border-neo-black bg-neo-lime text-neo-black shadow-hard-sm',
                !hit && !unplaced && 'border-neo border-neo-black bg-neo-navy-light text-neo-white/60',
                unplaced && 'border-2 border-dashed border-neo-white/40 text-neo-white/50'
              )}
            >
              {hit ? (
                <Check className={projector ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
              ) : unplaced ? (
                <EyeOff className={projector ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
              ) : (
                <X className={projector ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
              )}
              <span>{entry.word}</span>
              {isTeacher && entry.foundBy.length > 0 && (
                <span className={cn('ms-1 opacity-70', projector ? 'text-lg' : 'text-xs')}>
                  {entry.foundBy.length}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default WordCoverageGlance;
