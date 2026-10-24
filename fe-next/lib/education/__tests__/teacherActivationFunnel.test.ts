/**
 * Teacher activation funnel — pins the exact PostHog event names, the ordered
 * step indices (1/2/3), the growth:* twins Growth Radar runs on, and the
 * server-side builder for the first_classroom step.
 *
 * The once-per-teacher-id storage dedupe for the onboarding step needs DOM
 * storage and is pinned in
 * app/[locale]/teacher/__tests__/teacherActivationFunnel.onboarding.test.ts.
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

const checkTeacherSubscriptionMock = vi.fn();
vi.mock('@/lib/subscriptions', () => ({
  checkTeacherSubscription: (...args: unknown[]) => checkTeacherSubscriptionMock(...args),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  TEACHER_ACTIVATION_FUNNEL_EVENTS,
  TEACHER_ACTIVATION_STEP_INDEX,
  TEACHER_ACTIVATION_ONBOARDING_KEY_PREFIX,
  captureTeacherActivationFunnelStep,
  captureTeacherActivationFunnelCompleted,
  captureTeacherActivationOnboardingOnce,
  teacherActivationOnboardingStorageKey,
} from '../teacherActivationFunnel';
import {
  buildTeacherActivationFunnelStepEvent,
  resolveTeacherActivationPlan,
} from '../teacherActivationFunnelServer';

describe('teacher activation funnel — pinned event names and step indices', () => {
  it('pins the exact event strings', () => {
    expect(TEACHER_ACTIVATION_FUNNEL_EVENTS).toEqual({
      step: 'teacher_activation_funnel_step',
      completed: 'teacher_activation_funnel_completed',
    });
  });

  it('pins step_index 1, 2, 3 in funnel order', () => {
    expect(TEACHER_ACTIVATION_STEP_INDEX).toEqual({
      onboarding: 1,
      first_classroom: 2,
      first_assignment: 3,
    });
  });

  it('onboarding storage key includes the teacher id and is not the onboarding_viewed key', () => {
    expect(teacherActivationOnboardingStorageKey('t-9')).toBe(`${TEACHER_ACTIVATION_ONBOARDING_KEY_PREFIX}t-9`);
    expect(teacherActivationOnboardingStorageKey('t-9')).not.toBe('lexi_edu_teacher_onboarding_viewed_at');
    expect(teacherActivationOnboardingStorageKey('t-9')).not.toBe(teacherActivationOnboardingStorageKey('t-10'));
  });
});

describe('teacher activation funnel — client emission (bare name + growth twin)', () => {
  beforeEach(() => {
    captureMock.mockClear();
    growthMock.mockClear();
  });

  it.each([
    ['onboarding', 1],
    ['first_classroom', 2],
    ['first_assignment', 3],
  ] as const)('step %s emits step_index %d under the bare name and its growth twin', (step, index) => {
    captureTeacherActivationFunnelStep(step, { locale: 'he', plan: 'trial' });

    const props = { step, step_index: index, locale: 'he', plan: 'trial' };
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('teacher_activation_funnel_step', props);
    expect(growthMock).toHaveBeenCalledTimes(1);
    expect(growthMock).toHaveBeenCalledWith('teacher_activation_funnel_step', props);
  });

  it('completed emits the bare name and its growth twin with locale + plan', () => {
    captureTeacherActivationFunnelCompleted({ locale: 'en', plan: 'pro' });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('teacher_activation_funnel_completed', { locale: 'en', plan: 'pro' });
    expect(growthMock).toHaveBeenCalledTimes(1);
    expect(growthMock).toHaveBeenCalledWith('teacher_activation_funnel_completed', { locale: 'en', plan: 'pro' });
  });

  it('omits locale/plan keys rather than faking them when the caller has no read', () => {
    captureTeacherActivationFunnelStep('first_assignment', {});
    expect(captureMock).toHaveBeenCalledWith('teacher_activation_funnel_step', {
      step: 'first_assignment',
      step_index: 3,
    });
  });

  it('fires nothing without a teacher id (onboarding once-gate)', () => {
    expect(captureTeacherActivationOnboardingOnce(null, { locale: 'en', plan: 'free' })).toBe(false);
    expect(captureTeacherActivationOnboardingOnce(undefined, { locale: 'en', plan: 'free' })).toBe(false);
    expect(captureMock).not.toHaveBeenCalled();
    expect(growthMock).not.toHaveBeenCalled();
  });
});

describe('teacher activation funnel — server builder and plan slice', () => {
  beforeEach(() => {
    checkTeacherSubscriptionMock.mockReset();
  });

  it('builds the first_classroom step event with step_index 2', () => {
    const ev = buildTeacherActivationFunnelStepEvent({
      teacherId: 't-1',
      step: 'first_classroom',
      locale: 'he',
      plan: 'trial',
      isTestAccount: false,
    });

    expect(ev).toEqual({
      distinctId: 't-1',
      event: 'teacher_activation_funnel_step',
      properties: {
        step: 'first_classroom',
        step_index: 2,
        locale: 'he',
        plan: 'trial',
        is_test_account: false,
      },
    });
  });

  it('maps subscription state onto the plan slice, falling back to unknown on failure', async () => {
    checkTeacherSubscriptionMock.mockResolvedValue({ has_pro: false, status: 'active' });
    await expect(resolveTeacherActivationPlan('t-1')).resolves.toBe('free');

    checkTeacherSubscriptionMock.mockResolvedValue({ has_pro: true, status: 'trialing' });
    await expect(resolveTeacherActivationPlan('t-1')).resolves.toBe('trial');

    checkTeacherSubscriptionMock.mockResolvedValue({ has_pro: true, status: 'active' });
    await expect(resolveTeacherActivationPlan('t-1')).resolves.toBe('pro');

    checkTeacherSubscriptionMock.mockRejectedValue(new Error('db down'));
    await expect(resolveTeacherActivationPlan('t-1')).resolves.toBe('unknown');
  });
});

describe('teacher activation funnel — client graph stays clean', () => {
  it('client module never imports posthog-node or backend/', () => {
    const src = readFileSync(path.join(process.cwd(), 'lib/education/teacherActivationFunnel.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]@\/lib\/posthog['"]/);
    expect(src).not.toMatch(/from ['"]posthog-node['"]/);
    expect(src).not.toMatch(/from ['"]@\/backend\//);
  });

  it('server builder does not import the client module (that would pull posthog-js into the API route)', () => {
    const src = readFileSync(path.join(process.cwd(), 'lib/education/teacherActivationFunnelServer.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]\.\/teacherActivationFunnel['"]/);
    expect(src).not.toMatch(/from ['"]@\/utils\/growthTracking['"]/);
    expect(src).not.toMatch(/lazyPosthog/);
    expect(src).toMatch(/from ['"]\.\/teacherActivationFunnelEvents['"]/);
  });

  it('GROWTH_TWIN_EVENTS carries both funnel names so the server twin fires', () => {
    const src = readFileSync(path.join(process.cwd(), 'backend/utils/educationTelemetry.ts'), 'utf8');
    expect(src).toContain(`'teacher_activation_funnel_step'`);
    expect(src).toContain(`'teacher_activation_funnel_completed'`);
  });
});
