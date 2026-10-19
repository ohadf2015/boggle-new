/**
 * Teacher onboarding funnel — pins the exact PostHog event names the
 * 65-teacher re-invite funnel is built on, plus the call sites that emit them.
 *
 * The funnel (PostHog, persons):
 *   teacher_onboarding_viewed → classroom_created → assignment_created
 *     → student_joined → trial_started → teacher_pro_upgraded
 *
 * The source pins exist because this funnel was invisible once already: the
 * whole teacher surface had zero capture() calls and nothing failed. A renamed
 * constant or a dropped call site must fail a test, not a dashboard.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  TEACHER_ONBOARDING_FUNNEL_EVENTS,
  captureTeacherOnboardingFunnel,
  captureTeacherOnboardingViewedOnce,
  teacherFunnelPlan,
} from '@/lib/education/teacherOnboardingFunnel';
import { ASSIGNMENT_CREATED } from '@/lib/education/assignmentEvents';
import {
  buildTrialStartedEvent,
  buildTeacherProUpgradedEvent,
} from '@/lib/education/proFunnelServer';

const readSrc = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('teacher onboarding funnel — pinned event names', () => {
  it('pins the six funnel event names', () => {
    expect(TEACHER_ONBOARDING_FUNNEL_EVENTS).toEqual({
      teacherOnboardingViewed: 'teacher_onboarding_viewed',
      classroomCreated: 'classroom_created',
      assignmentCreated: 'assignment_created',
      studentJoined: 'student_joined',
      trialStarted: 'trial_started',
      teacherProUpgraded: 'teacher_pro_upgraded',
    });
    // The funnel's assignment step is the SAME string assignmentEvents.ts
    // already emits on lesson/word-goal publish — never a second spelling.
    expect(ASSIGNMENT_CREATED).toBe('assignment_created');
    expect(TEACHER_ONBOARDING_FUNNEL_EVENTS.assignmentCreated).toBe(ASSIGNMENT_CREATED);
  });

  it('captureTeacherOnboardingFunnel emits the name with locale + plan only', () => {
    captureMock.mockClear();
    captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.classroomCreated, {
      locale: 'he',
      plan: 'free',
    });
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('classroom_created', { locale: 'he', plan: 'free' });
  });

  it('teacher_onboarding_viewed fires at most once per browser', () => {
    captureMock.mockClear();
    window.localStorage.clear();
    expect(captureTeacherOnboardingViewedOnce({ locale: 'en', plan: 'free' })).toBe(true);
    expect(captureTeacherOnboardingViewedOnce({ locale: 'en', plan: 'free' })).toBe(false);
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('teacher_onboarding_viewed', { locale: 'en', plan: 'free' });
  });

  it('teacherFunnelPlan maps the entitlement state', () => {
    expect(teacherFunnelPlan({ hasPro: false, status: 'active' })).toBe('free');
    expect(teacherFunnelPlan({ hasPro: true, status: 'trialing' })).toBe('trial');
    expect(teacherFunnelPlan({ hasPro: true, status: 'active' })).toBe('pro');
    expect(teacherFunnelPlan({ hasPro: false, loading: true })).toBe('unknown');
  });
});

describe('teacher onboarding funnel — server upgrade steps', () => {
  it('trial_started is emitted with plan=trial and the locale', () => {
    expect(buildTrialStartedEvent('u-1', 'sub-9', 'he')).toEqual({
      distinctId: 'u-1',
      event: 'trial_started',
      properties: {
        product: 'teacher_pro',
        provider: 'polar',
        plan: 'trial',
        subscription_id: 'sub-9',
        locale: 'he',
      },
    });
  });

  it('teacher_pro_upgraded is emitted with plan=pro and omits a missing locale', () => {
    expect(buildTeacherProUpgradedEvent('u-1', 'sub-9')).toEqual({
      distinctId: 'u-1',
      event: 'teacher_pro_upgraded',
      properties: {
        product: 'teacher_pro',
        provider: 'polar',
        plan: 'pro',
        subscription_id: 'sub-9',
      },
    });
  });
});

describe('teacher onboarding funnel — call sites stay wired', () => {
  it('teacher dashboard fires teacher_onboarding_viewed once per browser', () => {
    const src = readSrc('app/[locale]/teacher/PageClient.tsx');
    expect(src).toContain('captureTeacherOnboardingViewedOnce');
  });

  it('classroom/new submit success fires classroom_created', () => {
    const src = readSrc('components/teacher/setup/ClassSetupFlow.tsx');
    expect(src).toContain('TEACHER_ONBOARDING_FUNNEL_EVENTS.classroomCreated');
  });

  it('the starter-pack publish path fires assignment_created', () => {
    const src = readSrc('components/teacher/assignments/AssignmentCreator.tsx');
    expect(src).toContain('TEACHER_ONBOARDING_FUNNEL_EVENTS.assignmentCreated');
  });

  it('the HQ join card fires student_joined on the first arrival', () => {
    const src = readSrc('components/teacher/hq/GetStudentsInCard.tsx');
    expect(src).toContain('TEACHER_ONBOARDING_FUNNEL_EVENTS.studentJoined');
  });

  it('the Polar webhook emits trial_started and teacher_pro_upgraded', () => {
    const src = readSrc('app/api/webhook/polar/route.ts');
    expect(src).toContain('buildTrialStartedEvent');
    expect(src).toContain('buildTeacherProUpgradedEvent');
  });

  it('Polar checkout metadata carries the locale so webhook events can slice by it', () => {
    const src = readSrc('lib/polar.ts');
    expect(src).toMatch(/metadata:\s*\{[^}]*locale/);
  });
});
