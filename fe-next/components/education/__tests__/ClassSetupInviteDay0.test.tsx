import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const pro = vi.hoisted(() => ({ current: { hasPro: false, loading: false, known: true, accessTrialExpires: null as string | null } }));
const access = vi.hoisted(() => ({ current: { latestRequest: { status: 'approved', created_at: new Date().toISOString() } as { status: string; created_at: string } | null } }));
const tel = vi.hoisted(() => ({ shown: vi.fn(), clicked: vi.fn(), opened: vi.fn(), completed: vi.fn(), step: vi.fn() }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro.current }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => access.current }));
vi.mock('@/lib/education/firstRoundGuideTelemetry', () => ({ trackFirstRoundGuideShown: tel.shown, trackFirstRoundGuideClicked: tel.clicked }));
vi.mock('@/lib/education/teacherOnboardingGate', () => ({ captureTeacherOnboardingOpened: tel.opened, captureTeacherOnboardingCompleted: tel.completed }));
vi.mock('@/lib/education/telemetry', () => ({ trackTeacherOnboardingStep: tel.step }));

import { useDay0Start } from '../ClassSetupInviteDay0';

const args = { language: 'en', teacherId: 't1', classroomId: 'c1' };

describe('useDay0Start: the ready screen Start carries the day-0 step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pro.current = { hasPro: false, loading: false, known: true, accessTrialExpires: null };
    access.current = { latestRequest: { status: 'approved', created_at: new Date().toISOString() } };
  });

  it('Given a teacher approved today, Then the step is shown once and the Start tap completes it', () => {
    const { result } = renderHook(() => useDay0Start(args));
    expect(result.current.bridge).toBe(true);
    expect(tel.opened).toHaveBeenCalledWith(expect.objectContaining({ step: 'day0_bridge', surface: 'class_ready', classroomId: 'c1' }));
    expect(tel.step).toHaveBeenCalledWith(expect.objectContaining({ step: 'start_live_class', action: 'view' }));
    result.current.onStart();
    expect(tel.completed).toHaveBeenCalledWith(expect.objectContaining({ step: 'day0_bridge' }));
    expect(tel.step).toHaveBeenCalledWith(expect.objectContaining({ step: 'start_live_class', action: 'cta' }));
  });

  it.each([
    ['a Pro teacher', () => { pro.current.hasPro = true; }],
    ['entitlement still loading', () => { pro.current.loading = true; }],
    ['a teacher approved a week ago', () => { access.current = { latestRequest: { status: 'approved', created_at: new Date(Date.now() - 7 * 86_400_000).toISOString() } }; }],
  ])('Given %s, Then nothing is recorded and Start records nothing extra', (_label, arrange) => {
    arrange();
    const { result } = renderHook(() => useDay0Start(args));
    expect(result.current.bridge).toBe(false);
    result.current.onStart();
    expect(tel.opened).not.toHaveBeenCalled();
    expect(tel.completed).not.toHaveBeenCalled();
  });
});
