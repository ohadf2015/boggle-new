/**
 * ClassPulseSection — the pulse card, wired to the surface it sits on.
 *
 * Kept out of `TeacherDashboard` (431 lines against a 500 ceiling, and a 300
 * component ceiling) so the dashboard mounts one element and this file owns
 * the fetch and the action routing. It is also what lets the same card appear
 * on another teacher surface with different wiring and identical behaviour.
 *
 * The routing is the point. Each state has exactly one next move, and this is
 * where that move becomes a real thing on THIS screen:
 *   invite  → the join code, which lives on the classes screen
 *   play    → the GO LIVE button already on this page, focused rather than
 *             duplicated (a second launch path is a second thing to keep true)
 *   review  → handled by the card, which hands the missed words straight to
 *             `onReviewWords`; deliberately NOT routed again here, or one tap
 *             would open two lessons
 *   retry   → re-run the read that failed
 */

'use client';

import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassPulse } from '@/hooks/useClassPulse';
import ClassPulseCard from '@/components/teacher/ClassPulseCard';
import type { ClassNextAction } from '@/lib/education/classPulse';

export interface ClassPulseSectionProps {
  classroomId: string;
  classroomName: string;
  /** Live enrolment from `classrooms[].member_count`. */
  rosterCount: number;
  /** Take the teacher to the fastest way to get students in. */
  onInvite: () => void;
  /** Put them on the launch control for this screen. */
  onPlay: () => void;
  /** Seed a review lesson from the words the class actually missed. */
  onReviewWords: (words: string[]) => void;
  /**
   * When true, suppresses the play/playAgain button because the primary
   * launch path is elsewhere (e.g., GO LIVE on the dashboard).
   * @default false — button is shown for all actions
   */
  hidePlayAction?: boolean;
  className?: string;
}

export function ClassPulseSection({
  classroomId,
  classroomName,
  rosterCount,
  onInvite,
  onPlay,
  onReviewWords,
  hidePlayAction = false,
  className,
}: ClassPulseSectionProps) {
  const { t } = useLanguage();
  const { pulse, isLoading, error, refresh } = useClassPulse({ classroomId, rosterCount });

  const handleAction = useCallback(
    (action: ClassNextAction) => {
      if (action === 'invite') return onInvite();
      if (action === 'play' || action === 'playAgain') return onPlay();
      if (action === 'retry') {
        void refresh();
      }
      // 'review' is intentionally absent: the card fires `onReviewWords`
      // alongside this callback, and routing it here too opens two lessons.
    },
    [onInvite, onPlay, refresh]
  );

  return (
    <section aria-label={t('teacher.pulse.regionLabel', { classroom: classroomName })} className={className}>
      <ClassPulseCard
        classroomName={classroomName}
        pulse={pulse}
        // A failed read must reach the card's `unknown` state, not sit under a
        // spinner. A spinner that never resolves is indistinguishable from
        // work still in progress — the silent-failure shape (pitfall class 4).
        isLoading={isLoading && !error}
        onAction={handleAction}
        onReviewWords={onReviewWords}
        hidePlayAction={hidePlayAction}
      />
    </section>
  );
}

export default ClassPulseSection;
