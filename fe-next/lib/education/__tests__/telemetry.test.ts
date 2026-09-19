/**
 * Education telemetry helper tests
 *
 * Wraps PostHog capture for the education tree so events share a stable
 * `edu_*` prefix and a common property shape. No-ops gracefully if PostHog
 * isn't initialized so tests / SSR don't fail.
 *
 * The event set here is deliberately SMALL. Four declarations
 * (`edu_practice_start`, `edu_xp_awarded`, `edu_student_join_classroom`,
 * `edu_achievement_unlock`) were deleted on 2026-09-15: they had no call site
 * anywhere in the codebase and had never emitted a single event. A declaration
 * nothing emits reads as "we measure this" on every audit and measures nothing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
const registerMock = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    register: (...args: unknown[]) => registerMock(...args),
    __loaded: true,
  },
}));

// Module under test imports posthog-js — load AFTER mock is registered
import {
  trackEduPracticeComplete,
  trackEduClassroomJoin,
  trackEduClassroomCreated,
  trackEduTeacherOnboardingStep,
  trackEduError,
  trackEduTeacherDashboardViewed,
  trackEduTeacherToolsOpened,
  trackEduProgressDigestViewed,
  trackEduTeacherActionFailed,
  setEduClassroomContext,
  setEduTestAccountFlag,
  isTestAccountEmail,
} from '../telemetry';

describe('education telemetry', () => {
  beforeEach(() => {
    captureMock.mockClear();
    registerMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('practice complete event keeps stable name + derived accuracy', () => {
    trackEduPracticeComplete({
      lessonId: 'lesson-1',
      practiceType: 'flashcard',
      cardsReviewed: 4,
      cardsCorrect: 3,
    });

    expect(captureMock).toHaveBeenCalledWith('edu_practice_complete', {
      lesson_id: 'lesson-1',
      practice_type: 'flashcard',
      cards_reviewed: 4,
      cards_correct: 3,
      accuracy: 0.75,
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

  it('error event tags the surface that failed', () => {
    trackEduError({ surface: 'record_xp', code: 'rpc_error' });
    expect(captureMock).toHaveBeenCalledWith('edu_error', {
      surface: 'record_xp',
      code: 'rpc_error',
    });
  });

  describe('classroom join — failure shape', () => {
    it('Given a successful roster-code join, When tracked, Then it records WHICH code system resolved', () => {
      trackEduClassroomJoin({
        result: 'success',
        classroomId: 'cls-1',
        matchedCodeType: 'roster_code',
        attemptedCode: 'UHMKL4',
      });

      expect(captureMock).toHaveBeenLastCalledWith('edu_classroom_join', {
        result: 'success',
        classroom_id: 'cls-1',
        matched_code_type: 'roster_code',
        code_length: 6,
        code_charset: 'alphanumeric',
      });
    });

    it('Given a join that resolved to a LIVE GAME code, When tracked, Then matched_code_type says so', () => {
      // The two six-character systems are shape-identical in production
      // (roster UHMKL4 vs game 5L7UCD), so only the resolution can tell them
      // apart. This property is what makes the "students type the projector
      // code" hypothesis falsifiable in data.
      trackEduClassroomJoin({
        result: 'success',
        classroomId: 'cls-1',
        matchedCodeType: 'game_code',
        attemptedCode: '5L7UCD',
      });

      expect(captureMock).toHaveBeenLastCalledWith(
        'edu_classroom_join',
        expect.objectContaining({ matched_code_type: 'game_code' })
      );
    });

    it('Given a not_found, When tracked, Then the code SHAPE is recorded but never the code itself', () => {
      trackEduClassroomJoin({ result: 'not_found', attemptedCode: 'ABC123' });

      const [, props] = captureMock.mock.calls.at(-1)!;
      expect(props).toEqual({
        result: 'not_found',
        code_length: 6,
        code_charset: 'alphanumeric',
      });
      // A join code is a shared secret — it must never reach analytics.
      expect(JSON.stringify(props)).not.toContain('ABC123');
    });

    it('Given a letters-only code, When tracked, Then charset is letters', () => {
      trackEduClassroomJoin({ result: 'not_found', attemptedCode: 'CFJHFB' });
      expect(captureMock).toHaveBeenLastCalledWith(
        'edu_classroom_join',
        expect.objectContaining({ code_charset: 'letters' })
      );
    });

    it('Given a digits-only code, When tracked, Then charset is digits', () => {
      trackEduClassroomJoin({ result: 'not_found', attemptedCode: '123456' });
      expect(captureMock).toHaveBeenLastCalledWith(
        'edu_classroom_join',
        expect.objectContaining({ code_charset: 'digits' })
      );
    });

    it('Given a too-short code, When tracked, Then code_length shows the truncation', () => {
      trackEduClassroomJoin({ result: 'invalid_code', attemptedCode: 'AB1' });
      expect(captureMock).toHaveBeenLastCalledWith('edu_classroom_join', {
        result: 'invalid_code',
        code_length: 3,
        code_charset: 'alphanumeric',
      });
    });

    it('Given no code at all, When tracked, Then shape props are omitted rather than faked', () => {
      trackEduClassroomJoin({ result: 'error' });
      expect(captureMock).toHaveBeenLastCalledWith('edu_classroom_join', {
        result: 'error',
      });
    });
  });

  describe('classroom created', () => {
    it('Given a teacher creating a classroom, When tracked, Then classroom_id and origin ride the event', () => {
      trackEduClassroomCreated({ classroomId: 'cls-9', createdVia: 'dashboard' });
      expect(captureMock).toHaveBeenCalledWith('edu_classroom_created', {
        classroom_id: 'cls-9',
        created_via: 'dashboard',
      });
    });
  });

  describe('classroom context super property', () => {
    it('Given a student entering a classroom game, When set, Then classroom_id registers on EVERY later event', () => {
      setEduClassroomContext('cls-7');
      expect(registerMock).toHaveBeenCalledWith({ classroom_id: 'cls-7' });
    });

    it('Given the student leaving the classroom, When cleared, Then classroom_id is nulled, not left stale', () => {
      // Super properties persist in localStorage. Leaving this set would tag
      // every later SOLO game as classroom play — the stale-state pitfall
      // (rules class 2) applied to analytics.
      setEduClassroomContext(null);
      expect(registerMock).toHaveBeenCalledWith({ classroom_id: null });
    });
  });

  describe('test-account detection', () => {
    it.each([
      ['gauntlet@lexiclash.test', true],
      ['QA-Rig@LexiClash.Test', true],
      ['teacher@gmail.com', false],
      ['teacher+qa@gmail.com', false],
      ['someone@lexiclash.live', false],
      // A guest student has no email at all — the DB trigger is what flags
      // those, per .claude/rules/70-test-accounts.md.
      [null, false],
      [undefined, false],
    ])('Given %s, When classified, Then isTestAccountEmail is %s', (email, expected) => {
      expect(isTestAccountEmail(email as string | null | undefined)).toBe(expected);
    });

    it('Given a +qa alias on a real domain, When classified, Then it is NOT flagged', () => {
      // The rule is explicit: a +qa alias on a personal Gmail is not
      // auto-flagged, and pretending otherwise would hide real users.
      expect(isTestAccountEmail('ohad+qa@gmail.com')).toBe(false);
    });
  });

  describe('test-account flag', () => {
    it('Given a QA account, When flagged, Then is_test_account rides every event so funnels can exclude it', () => {
      setEduTestAccountFlag(true);
      expect(registerMock).toHaveBeenCalledWith({ is_test_account: true });
    });

    it('Given a real account, When flagged, Then is_test_account is explicitly false, not absent', () => {
      setEduTestAccountFlag(false);
      expect(registerMock).toHaveBeenCalledWith({ is_test_account: false });
    });
  });

  describe('teacher dashboard', () => {
    it('Given a loaded dashboard, When viewed, Then the teacher state snapshot rides the event', () => {
      trackEduTeacherDashboardViewed({ classroomCount: 2, studentCount: 7, hasPro: false });
      expect(captureMock).toHaveBeenCalledWith('edu_teacher_dashboard_viewed', {
        classroom_count: 2,
        student_count: 7,
        has_pro: false,
      });
    });

    it('Given the tools drawer, When opened, Then the same snapshot is sent under its own name', () => {
      trackEduTeacherToolsOpened({ classroomCount: 0, studentCount: 0, hasPro: true });
      expect(captureMock).toHaveBeenCalledWith('edu_teacher_tools_opened', {
        classroom_count: 0,
        student_count: 0,
        has_pro: true,
      });
    });

    it('Given the progress digest, When viewed, Then has_pro and pulse_state ride the event without student names', () => {
      trackEduProgressDigestViewed({ hasPro: false, state: 'needsReview' });
      expect(captureMock).toHaveBeenCalledWith('edu_progress_digest_viewed', {
        has_pro: false,
        pulse_state: 'needsReview',
      });
    });
  });

  describe('teacher action failed', () => {
    it('Given a failed create, When tracked, Then action + reason are sent', () => {
      trackEduTeacherActionFailed({ action: 'create_lesson', reason: 'permission denied' });
      expect(captureMock).toHaveBeenCalledWith('edu_teacher_action_failed', {
        action: 'create_lesson',
        reason: 'permission denied',
      });
    });

    it('Given a long server message, When tracked, Then reason is capped at 120 chars', () => {
      trackEduTeacherActionFailed({ action: 'create_classroom', reason: 'x'.repeat(500) });
      const props = captureMock.mock.calls[0][1] as { reason: string };
      expect(props.reason).toHaveLength(120);
    });
  });

  it('never throws if posthog.capture itself throws', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(() =>
      trackEduError({ surface: 'record_xp', code: 'boom' }),
    ).not.toThrow();
  });

  it('never throws if posthog.register itself throws', () => {
    registerMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => setEduClassroomContext('cls-1')).not.toThrow();
  });
});
