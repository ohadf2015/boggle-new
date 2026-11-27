// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

const growthMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => growthMock(...args),
}));

vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn() },
}));

import {
  captureTeacherActivationStep,
  captureTeacherActivationStepAbandonedOnce,
  captureTeacherActivationStepCompletedOnce,
} from '../trialFirstSessionTelemetry';

describe('teacher_activation_step_completed', () => {
  beforeEach(() => {
    captureMock.mockClear();
    growthMock.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('fires the exact event with step on completion and on abandonment', () => {
    captureTeacherActivationStep({ step: 'create_assignment', outcome: 'completed', locale: 'de' });
    captureTeacherActivationStep({ step: 'first_live_game', outcome: 'abandoned' });

    expect(captureMock).toHaveBeenNthCalledWith(1, 'teacher_activation_step_completed', {
      step: 'create_assignment',
      step_index: 3,
      outcome: 'completed',
      plan: 'trial',
      locale: 'de',
    });
    expect(captureMock).toHaveBeenNthCalledWith(2, 'teacher_activation_step_completed', {
      step: 'first_live_game',
      step_index: 4,
      outcome: 'abandoned',
      plan: 'trial',
    });
    expect(growthMock).toHaveBeenCalledWith('teacher_activation_step_completed', expect.objectContaining({
      step: 'create_assignment',
      outcome: 'completed',
    }));
  });

  it('fires a completed step once per teacher, and an abandonment once per session', () => {
    expect(captureTeacherActivationStepCompletedOnce('t1', 'add_students', { locale: 'en' })).toBe(true);
    expect(captureTeacherActivationStepCompletedOnce('t1', 'add_students', { locale: 'en' })).toBe(false);
    expect(captureTeacherActivationStepAbandonedOnce('t1', 'add_students', {})).toBe(true);
    expect(captureTeacherActivationStepAbandonedOnce('t1', 'add_students', {})).toBe(false);

    expect(captureMock).toHaveBeenCalledTimes(2);
    expect(captureMock.mock.calls[0][1]).toMatchObject({ step: 'add_students', outcome: 'completed' });
    expect(captureMock.mock.calls[1][1]).toMatchObject({ step: 'add_students', outcome: 'abandoned' });
  });

  it('does not fire without a teacher id', () => {
    expect(captureTeacherActivationStepCompletedOnce(null, 'create_classroom', {})).toBe(false);
    expect(captureTeacherActivationStepAbandonedOnce(undefined, 'create_classroom', {})).toBe(false);
    expect(captureMock).not.toHaveBeenCalled();
  });
});
