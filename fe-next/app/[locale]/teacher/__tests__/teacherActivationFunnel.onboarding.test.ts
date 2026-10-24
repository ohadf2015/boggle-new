/**
 * Teacher activation funnel — the onboarding step's once-per-TEACHER latch.
 * Needs DOM storage (happy-dom): the same teacher must not fire twice, a
 * different teacher on the same browser must fire again, and the dashboard
 * page must keep calling it.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

const growthMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => growthMock(...args),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  captureTeacherActivationOnboardingOnce,
  teacherActivationOnboardingStorageKey,
} from '@/lib/education/teacherActivationFunnel';

const props = { locale: 'en', plan: 'free' } as const;

describe('teacher activation onboarding step — once per teacher id', () => {
  beforeEach(() => {
    captureMock.mockClear();
    growthMock.mockClear();
    window.localStorage.clear();
  });

  it('fires teacher_activation_funnel_step with step=onboarding, step_index=1 exactly once per teacher id', () => {
    expect(captureTeacherActivationOnboardingOnce('teacher-1', props)).toBe(true);
    expect(captureTeacherActivationOnboardingOnce('teacher-1', props)).toBe(false);

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('teacher_activation_funnel_step', {
      step: 'onboarding',
      step_index: 1,
      locale: 'en',
      plan: 'free',
    });
    expect(growthMock).toHaveBeenCalledTimes(1);
    expect(growthMock).toHaveBeenCalledWith('teacher_activation_funnel_step', {
      step: 'onboarding',
      step_index: 1,
      locale: 'en',
      plan: 'free',
    });
    expect(window.localStorage.getItem(teacherActivationOnboardingStorageKey('teacher-1'))).toBeTruthy();
  });

  it('a different teacher on the same browser fires again', () => {
    expect(captureTeacherActivationOnboardingOnce('teacher-1', props)).toBe(true);
    expect(captureTeacherActivationOnboardingOnce('teacher-2', props)).toBe(true);

    expect(captureMock).toHaveBeenCalledTimes(2);
    expect(growthMock).toHaveBeenCalledTimes(2);
    for (const call of captureMock.mock.calls) {
      expect(call[0]).toBe('teacher_activation_funnel_step');
      expect((call[1] as { step: string }).step).toBe('onboarding');
    }
    // Each teacher got their own latch key.
    expect(window.localStorage.getItem(teacherActivationOnboardingStorageKey('teacher-1'))).toBeTruthy();
    expect(window.localStorage.getItem(teacherActivationOnboardingStorageKey('teacher-2'))).toBeTruthy();
  });

  it('uses a per-teacher storage key, not the once-per-browser onboarding_viewed key', () => {
    captureTeacherActivationOnboardingOnce('teacher-1', props);
    expect(window.localStorage.getItem('lexi_edu_teacher_onboarding_viewed_at')).toBeNull();
    expect(window.localStorage.getItem(teacherActivationOnboardingStorageKey('teacher-1'))).toBeTruthy();
    expect(window.localStorage.getItem(teacherActivationOnboardingStorageKey('teacher-2'))).toBeNull();
  });

  it('blocked storage still fires once rather than zero', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(captureTeacherActivationOnboardingOnce('teacher-1', props)).toBe(true);
    expect(captureMock).toHaveBeenCalledTimes(1);
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('the teacher dashboard page calls the onboarding step emitter', () => {
    const src = readFileSync(path.join(process.cwd(), 'app/[locale]/teacher/PageClient.tsx'), 'utf8');
    expect(src).toContain('captureTeacherActivationOnboardingOnce');
  });
});
