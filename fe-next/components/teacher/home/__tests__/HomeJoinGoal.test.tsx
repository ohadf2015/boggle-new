import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const shown = vi.hoisted(() => vi.fn());
const joined = vi.hoisted(() => vi.fn());
const funnel = vi.hoisted(() => vi.fn());
const ding = vi.hoisted(() => vi.fn());
const roster = vi.hoisted(() => ({ value: { students: [] as { id: string }[], arrivals: [] as string[], loading: false } }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, status: null, loading: false }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduJoinCodeShown: shown, trackEduFirstStudentJoined: joined }));
vi.mock('@/lib/education/teacherOnboardingFunnel', () => ({
  captureTeacherOnboardingFunnel: funnel,
  TEACHER_ONBOARDING_FUNNEL_EVENTS: { studentJoined: 'student_joined' },
  teacherFunnelPlan: () => 'free',
}));
vi.mock('@/components/teacher/hq/useClassRoster', () => ({ useClassRoster: () => roster.value }));
vi.mock('@/components/teacher/hq/useHqJuice', () => ({ useHqJuice: () => ({ reduced: true, sfx: { playPlayerJoinedSound: ding } }) }));

import { HomeJoinGoal } from '../HomeJoinGoal';

const CLASS = { id: 'c1', name: '7B', join_code: 'PLSB66', member_count: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  roster.value = { students: [], arrivals: [], loading: false };
});
afterEach(cleanup);

describe('<HomeJoinGoal>', () => {
  it('Given an empty class, Then it shows the goal line and records once that the code was shown', () => {
    const { rerender } = render(<HomeJoinGoal classroom={CLASS} />);
    expect(screen.getByTestId('hq-joined-goal-count')).toHaveTextContent('academy.hq.joinedGoal:{"count":0,"goal":3}');
    rerender(<HomeJoinGoal classroom={CLASS} />);
    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown).toHaveBeenCalledWith({ classroomId: 'c1' });
  });

  it('When the first student arrives, Then the first-join events fire and the arrival dings', () => {
    const { rerender } = render(<HomeJoinGoal classroom={CLASS} />);
    roster.value = { students: [{ id: 's1' }], arrivals: ['s1'], loading: false };
    rerender(<HomeJoinGoal classroom={CLASS} />);
    expect(joined).toHaveBeenCalledWith({ classroomId: 'c1' });
    expect(funnel).toHaveBeenCalledWith('student_joined', { locale: 'en', plan: 'free' });
    expect(ding).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('hq-joined-goal-count')).toHaveTextContent('academy.hq.joinedGoal:{"count":1,"goal":3}');
  });

  it('Given the roster is still loading, Then it claims no number', () => {
    roster.value = { students: [], arrivals: [], loading: true };
    render(<HomeJoinGoal classroom={CLASS} />);
    expect(screen.queryByTestId('hq-joined-goal-count')).toBeNull();
    expect(shown).not.toHaveBeenCalled();
  });
});
