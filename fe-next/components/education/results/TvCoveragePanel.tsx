'use client';

import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import { sweepReached, type RoundEndStage } from '@/lib/education/roundEndStage';
import { WordCoverageGlance } from './WordCoverageGlance';
import { NoLessonWordsPanel } from './NoLessonWordsPanel';
import { classFoundWords } from './lessonTally';
import type { ReteachVerdictKind } from '@/components/education/live/eduReteachModel';

export interface TvCoveragePanelProps {
  summary: ClassroomSummary;
  players?: PlayerResult[];
  neverPlaced: Set<string>;
  stage: RoundEndStage;
  /** Points came in but no lesson word landed: show what the class really found instead of a 0/N meter. */
  pointsWithoutLesson: boolean;
  phone: boolean;
  /** Wall cap on printed chips; the rest are counted. */
  maxChips?: number;
  /** The shared reteach verdict: it decides the "all found" and "whole lesson" lines. */
  verdict?: ReteachVerdictKind;
  /** Shares the screen with the Teacher Pro card: drop the secondary lines so Play again and the card stay on screen. */
  compact?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * The words still to teach. Sized to its content on the wall (no stretched
 * empty panel), and the one region allowed to shrink and scroll when a class
 * missed everything, so Play again below it never leaves the wall.
 */
export function TvCoveragePanel({ summary, players, neverPlaced, stage, pointsWithoutLesson, phone, maxChips = 12, verdict, compact = false, t }: TvCoveragePanelProps) {
  const chips = phone ? Math.min(6, maxChips) : maxChips;
  const size = phone ? 'card' : 'projector';
  const allFoundLine = verdict === undefined || verdict === 'allFound';
  return (
    <section
      data-testid="tv-coverage-panel"
      className="flex flex-col @5xl/results:min-h-0 @5xl/results:flex-initial @5xl/results:overflow-hidden rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 pt-3 pb-0 @5xl/results:p-3 @[96rem]/results:p-4"
    >
      {verdict === 'wholeLesson' && !(compact && phone) && (
        <p
          data-testid="tv-reteach-whole-lesson"
          className={phone ? 'mb-1.5 font-neo-display font-bold text-sm text-neo-cream' : 'mb-2 font-neo-display font-bold text-base @[96rem]/results:text-xl text-neo-cream'}
        >
          {t('education.results.wholeLessonAgain')}
        </p>
      )}
      {!pointsWithoutLesson ? (
        <WordCoverageGlance
          summary={summary}
          username=""
          isTeacher
          neverPlaced={neverPlaced}
          size={size}
          fill={sweepReached(stage)}
          celebrate={sweepReached(stage)}
          missedOnly
          maxChips={chips}
          allFoundLine={allFoundLine}
          calm
          t={t}
        />
      ) : (
        <NoLessonWordsPanel
          words={classFoundWords(players, { exclude: [summary.teacherName], limit: phone ? 6 : 8 })}
          size={size}
          compact={compact}
          hideWords={compact && phone}
          t={t}
        >
          <WordCoverageGlance
            summary={summary}
            username=""
            isTeacher
            neverPlaced={neverPlaced}
            size={size}
            missedOnly
            maxChips={compact ? Math.min(2, chips) : Math.min(phone ? 4 : 8, chips)}
            heading={t('eduLive.results.noLessonReteach')}
            allFoundLine={allFoundLine}
            calm
            t={t}
          />
        </NoLessonWordsPanel>
      )}
    </section>
  );
}

export default TvCoveragePanel;
