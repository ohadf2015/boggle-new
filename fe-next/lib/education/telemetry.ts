/**
 * Education telemetry — thin wrapper over PostHog `capture` for the
 * education tree. Stable `edu_*` event names + snake_case property keys.
 *
 * Why a wrapper:
 * - Single grep target (`trackEdu*`) for compliance audits.
 * - Guarantees property naming convention without each caller needing to
 *   remember it.
 * - Never throws — analytics must not break gameplay.
 */

import posthog from 'posthog-js';
import logger from '@/utils/logger';

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[eduTelemetry] capture failed', { event, err });
    }
  }
};

export type PracticeType =
  | 'flashcard'
  | 'solo_board'
  | 'matching'
  | 'spelling'
  | 'blitz'
  | 'lesson_completion';

export interface EduPracticeStartArgs {
  lessonId: string;
  practiceType: PracticeType;
}

export function trackEduPracticeStart(args: EduPracticeStartArgs): void {
  safeCapture('edu_practice_start', {
    lesson_id: args.lessonId,
    practice_type: args.practiceType,
  });
}

export interface EduPracticeCompleteArgs {
  lessonId: string;
  practiceType: PracticeType;
  cardsReviewed?: number;
  cardsCorrect?: number;
  timeSpentSeconds?: number;
}

export function trackEduPracticeComplete(args: EduPracticeCompleteArgs): void {
  const accuracy =
    args.cardsReviewed && args.cardsReviewed > 0 && args.cardsCorrect !== undefined
      ? args.cardsCorrect / args.cardsReviewed
      : undefined;

  const props: Record<string, unknown> = {
    lesson_id: args.lessonId,
    practice_type: args.practiceType,
  };
  if (args.cardsReviewed !== undefined) props.cards_reviewed = args.cardsReviewed;
  if (args.cardsCorrect !== undefined) props.cards_correct = args.cardsCorrect;
  if (accuracy !== undefined) props.accuracy = accuracy;
  if (args.timeSpentSeconds !== undefined) props.time_spent_seconds = args.timeSpentSeconds;

  safeCapture('edu_practice_complete', props);
}

export type XpSource =
  | 'flashcard'
  | 'solo_board'
  | 'lesson_completion'
  | 'matching'
  | 'spelling'
  | 'blitz'
  | 'duel_async'
  | 'duel_realtime'
  | 'daily_challenge'
  | 'classroom_game'
  | 'achievement';

export interface EduXpAwardedArgs {
  source: XpSource;
  amount: number;
  newTotalXp: number;
  newLevel: number;
}

export function trackEduXpAwarded(args: EduXpAwardedArgs): void {
  safeCapture('edu_xp_awarded', {
    source: args.source,
    amount: args.amount,
    new_total_xp: args.newTotalXp,
    new_level: args.newLevel,
  });
}

export type ClassroomJoinResult = 'success' | 'invalid_code' | 'not_found' | 'error';

export interface EduClassroomJoinArgs {
  result: ClassroomJoinResult;
  classroomId?: string;
}

export function trackEduClassroomJoin(args: EduClassroomJoinArgs): void {
  const props: Record<string, unknown> = { result: args.result };
  if (args.classroomId) props.classroom_id = args.classroomId;
  safeCapture('edu_classroom_join', props);
}

export interface EduTeacherOnboardingStepArgs {
  step: number;
  totalSteps: number;
  action: 'next' | 'skip' | 'complete' | 'back';
}

export function trackEduTeacherOnboardingStep(args: EduTeacherOnboardingStepArgs): void {
  safeCapture('edu_teacher_onboarding_step', {
    step: args.step,
    total_steps: args.totalSteps,
    action: args.action,
  });
}

export interface EduStudentJoinClassroomArgs {
  classroomId: string;
  isFirst: boolean;
}

export function trackEduStudentJoinClassroom(args: EduStudentJoinClassroomArgs): void {
  safeCapture('edu_student_join_classroom', {
    classroom_id: args.classroomId,
    is_first: args.isFirst,
  });
}

export interface EduAchievementUnlockArgs {
  achievementId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export function trackEduAchievementUnlock(args: EduAchievementUnlockArgs): void {
  safeCapture('edu_achievement_unlock', {
    achievement_id: args.achievementId,
    tier: args.tier,
  });
}

export type EduErrorSurface =
  | 'record_xp'
  | 'practice_session'
  | 'classroom_game'
  | 'lesson_load'
  | 'spaced_repetition';

export interface EduErrorArgs {
  surface: EduErrorSurface;
  code: string;
}

export function trackEduError(args: EduErrorArgs): void {
  safeCapture('edu_error', {
    surface: args.surface,
    code: args.code,
  });
}
