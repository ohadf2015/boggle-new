'use client';

import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import { sweepReached, type RoundEndStage } from '@/lib/education/roundEndStage';
import { WordCoverageGlance } from './WordCoverageGlance';
import { NoLessonWordsPanel } from './NoLessonWordsPanel';
import { classFoundWords } from './lessonTally';

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
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * The words still to teach. Sized to its content on the wall (no stretched
 * empty panel), and the one region allowed to shrink and scroll when a class
 * missed everything, so Play again below it never leaves the wall.
 */
export function TvCoveragePanel({ summary, players, neverPlaced, stage, pointsWithoutLesson, phone, maxChips = 12, t }: TvCoveragePanelProps) {
  const size = phone ? 'card' : 'projector';
  return (
    <section
      data-testid="tv-coverage-panel"
      className="flex flex-col lg:min-h-0 lg:flex-initial lg:overflow-hidden rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 pt-3 pb-0 lg:p-4 shadow-hard"
    >
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
          maxChips={phone ? 6 : maxChips}
          t={t}
        />
      ) : (
        <NoLessonWordsPanel
          words={classFoundWords(players, { exclude: [summary.teacherName], limit: phone ? 6 : 8 })}
          size={size}
          t={t}
        >
          <WordCoverageGlance
            summary={summary}
            username=""
            isTeacher
            neverPlaced={neverPlaced}
            size={size}
            missedOnly
            maxChips={phone ? 4 : 8}
            heading={t('eduLive.results.noLessonReteach')}
            t={t}
          />
        </NoLessonWordsPanel>
      )}
    </section>
  );
}

export default TvCoveragePanel;
