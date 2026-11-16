/**
 * Teacher onboarding gate — open/complete must land in PostHog under names a
 * funnel can query, with the ids that stitch a teacher to a class.
 *
 * The checklist helper `trackTeacherOnboardingStep` had zero production call
 * sites, so `edu_teacher_onboarding_step` stayed at 0. These events are the
 * replacement that the real gate mounts fire.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  TEACHER_ONBOARDING_GATE_EVENTS,
  captureTeacherOnboardingCompleted,
  captureTeacherOnboardingCompletedIfOpened,
  captureTeacherOnboardingOpened,
} from '../teacherOnboardingGate';

describe('teacher onboarding gate telemetry', () => {
  beforeEach(() => {
    captureMock.mockClear();
    localStorage.clear();
  });

  it('opened fires teacher_onboarding_opened with teacher_id and classroom_id', () => {
    captureTeacherOnboardingOpened({
      teacherId: 'teacher-1',
      classroomId: 'class-9',
      step: 'createClass',
      surface: 'home',
      locale: 'en',
    });

    expect(TEACHER_ONBOARDING_GATE_EVENTS.opened).toBe('teacher_onboarding_opened');
    expect(captureMock).toHaveBeenCalledWith('teacher_onboarding_opened', {
      teacher_id: 'teacher-1',
      classroom_id: 'class-9',
      step: 'createClass',
      surface: 'home',
      locale: 'en',
    });
  });

  it('opened omits classroom_id when the teacher has no class yet', () => {
    captureTeacherOnboardingOpened({
      teacherId: 'teacher-1',
      classroomId: null,
      step: 'createClass',
      surface: 'home',
      locale: 'he',
    });

    expect(captureMock).toHaveBeenCalledWith('teacher_onboarding_opened', {
      teacher_id: 'teacher-1',
      step: 'createClass',
      surface: 'home',
      locale: 'he',
    });
  });

  it('completed fires once per teacher id and carries the class', () => {
    const props = {
      teacherId: 'teacher-1',
      classroomId: 'class-9',
      step: 'day0_bridge',
      surface: 'class_ready' as const,
      locale: 'en',
    };

    expect(captureTeacherOnboardingCompleted(props)).toBe(true);
    expect(captureTeacherOnboardingCompleted(props)).toBe(false);

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('teacher_onboarding_completed', {
      teacher_id: 'teacher-1',
      classroom_id: 'class-9',
      step: 'day0_bridge',
      surface: 'class_ready',
      locale: 'en',
    });
  });

  it('dashboard completion does not fire unless this browser already opened the gate', () => {
    const props = {
      teacherId: 'teacher-2',
      classroomId: null,
      step: 'createClass',
      surface: 'home' as const,
      locale: 'en',
    };
    expect(captureTeacherOnboardingCompletedIfOpened(props)).toBe(false);
    expect(captureMock).not.toHaveBeenCalled();

    captureTeacherOnboardingOpened(props);
    captureMock.mockClear();
    expect(captureTeacherOnboardingCompletedIfOpened(props)).toBe(true);
    expect(captureMock).toHaveBeenCalledWith('teacher_onboarding_completed', {
      teacher_id: 'teacher-2',
      step: 'createClass',
      surface: 'home',
      locale: 'en',
    });
  });
});
