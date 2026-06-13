/**
 * Education telemetry helper tests
 *
 * Wraps PostHog capture for the education tree so events share a stable
 * `edu_*` prefix and a common property shape (locale, user role, classroom
 * scope when relevant). No-ops gracefully if PostHog isn't initialized so
 * tests / SSR don't fail.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
const isFeatureEnabledMock = vi.fn().mockReturnValue(true);

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    isFeatureEnabled: (...args: unknown[]) => isFeatureEnabledMock(...args),
    __loaded: true,
  },
}));

// Module under test imports posthog-js — load AFTER mock is registered
import {
  trackEduPracticeStart,
  trackEduPracticeComplete,
  trackEduXpAwarded,
  trackEduClassroomJoin,
  trackEduAchievementUnlock,
  trackEduTeacherOnboardingStep,
  trackEduStudentJoinClassroom,
  trackEduError,
} from '../telemetry';

describe('education telemetry', () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('practice start event has stable name + props', () => {
    trackEduPracticeStart({ lessonId: 'lesson-1', practiceType: 'flashcard' });

    expect(captureMock).toHaveBeenCalledWith('edu_practice_start', {
      lesson_id: 'lesson-1',
      practice_type: 'flashcard',
    });
  });

  it('practice complete includes outcome metrics', () => {
    trackEduPracticeComplete({
      lessonId: 'lesson-1',
      practiceType: 'flashcard',
      cardsReviewed: 10,
      cardsCorrect: 8,
      timeSpentSeconds: 120,
    });

    expect(captureMock).toHaveBeenCalledWith('edu_practice_complete', {
      lesson_id: 'lesson-1',
      practice_type: 'flashcard',
      cards_reviewed: 10,
      cards_correct: 8,
      accuracy: 0.8,
      time_spent_seconds: 120,
    });
  });

  it('xp awarded event tags the source so we can split education vs main XP', () => {
    trackEduXpAwarded({
      source: 'duel_realtime',
      amount: 250,
      newTotalXp: 5000,
      newLevel: 12,
    });

    expect(captureMock).toHaveBeenCalledWith('edu_xp_awarded', {
      source: 'duel_realtime',
      amount: 250,
      new_total_xp: 5000,
      new_level: 12,
    });
  });

  it('classroom join event captures whether lookup succeeded', () => {
    trackEduClassroomJoin({ result: 'success', classroomId: 'cls-1' });
    expect(captureMock).toHaveBeenLastCalledWith('edu_classroom_join', {
      result: 'success',
      classroom_id: 'cls-1',
    });

    trackEduClassroomJoin({ result: 'invalid_code' });
    expect(captureMock).toHaveBeenLastCalledWith('edu_classroom_join', {
      result: 'invalid_code',
    });
  });

  it('teacher onboarding step records funnel position', () => {
    trackEduTeacherOnboardingStep({ step: 2, totalSteps: 4, action: 'next' });
    expect(captureMock).toHaveBeenCalledWith('edu_teacher_onboarding_step', {
      step: 2,
      total_steps: 4,
      action: 'next',
    });
  });

  it('student first-classroom join is logged separately for D1/D7 funnel', () => {
    trackEduStudentJoinClassroom({ classroomId: 'cls-2', isFirst: true });
    expect(captureMock).toHaveBeenCalledWith('edu_student_join_classroom', {
      classroom_id: 'cls-2',
      is_first: true,
    });
  });

  it('achievement unlock keeps tier + id', () => {
    trackEduAchievementUnlock({
      achievementId: 'first-lesson',
      tier: 'bronze',
    });
    expect(captureMock).toHaveBeenCalledWith('edu_achievement_unlock', {
      achievement_id: 'first-lesson',
      tier: 'bronze',
    });
  });

  it('error event tags the surface that failed', () => {
    trackEduError({ surface: 'record_xp', code: 'rpc_error' });
    expect(captureMock).toHaveBeenCalledWith('edu_error', {
      surface: 'record_xp',
      code: 'rpc_error',
    });
  });

  it('never throws if posthog.capture itself throws', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(() =>
      trackEduPracticeStart({ lessonId: 'l', practiceType: 'flashcard' }),
    ).not.toThrow();
  });
});
