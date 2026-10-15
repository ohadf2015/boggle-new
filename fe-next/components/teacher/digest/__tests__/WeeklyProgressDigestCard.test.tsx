import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyProgressDigestCard } from '../WeeklyProgressDigestCard';

const refresh = vi.fn();
const metricsMock = vi.fn();
vi.mock('@/hooks/useWeeklyProgressDigest', () => ({
  useWeeklyProgressDigest: (...args: unknown[]) => metricsMock(...args),
}));

const proState = {
  hasPro: true,
  loading: false,
  trialExpires: '2026-10-20T12:00:00.000Z',
  trialUsed: false,
};
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, vars?: Record<string, string>) => (vars ? `${k}:${JSON.stringify(vars)}` : k), language: 'en' }),
}));

vi.mock('@/lib/education/polarTrial', () => ({
  polarTrialDaysLeft: () => 7,
}));

const trackDigest = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherDigestViewed: (args: unknown) => trackDigest(args),
}));

function week() {
  return {
    thisWeek: {
      studentsActive: 4,
      rosterCount: 10,
      gamesCompleted: 6,
      wordsCompleted: 22,
      assignmentCompleted: 3,
      assignmentExpected: 10,
      assignmentCompletionPct: 30,
    },
    lastWeek: {
      studentsActive: 2,
      rosterCount: 10,
      gamesCompleted: 3,
      wordsCompleted: 10,
      assignmentCompleted: 1,
      assignmentExpected: 10,
      assignmentCompletionPct: 10,
    },
    wow: {
      studentsActive: 2,
      gamesCompleted: 3,
      wordsCompleted: 12,
      assignmentCompletionPctPoints: 20,
    },
  };
}

describe('WeeklyProgressDigestCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proState.hasPro = true;
    proState.loading = false;
    proState.trialUsed = false;
    metricsMock.mockReturnValue({
      metrics: week(),
      isLoading: false,
      error: null,
      refresh,
    });
  });

  it('prints weekly students, games, words, assignments and wow', () => {
    render(
      <WeeklyProgressDigestCard
        classroomId="c1"
        classroomName="Year 7"
        assignmentExpected={10}
        assignmentSubmitted={3}
      />,
    );
    expect(screen.getByTestId('weekly-progress-digest')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('fires teacher_digest_viewed and shows the day-7 Pro CTA', () => {
    render(
      <WeeklyProgressDigestCard
        classroomId="c1"
        classroomName="Year 7"
        assignmentExpected={10}
        assignmentSubmitted={3}
      />,
    );
    expect(trackDigest).toHaveBeenCalledWith({
      hasPro: true,
      trialDay7: true,
      trialExpired: false,
      studentsActive: 4,
    });
    const cta = screen.getByTestId('weekly-progress-digest-pro-link');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('shows the expiry conversion CTA after Polar trial lapsed', () => {
    proState.hasPro = false;
    proState.trialUsed = true;
    render(
      <WeeklyProgressDigestCard
        classroomId="c1"
        classroomName="Year 7"
        assignmentExpected={10}
        assignmentSubmitted={3}
      />,
    );
    expect(screen.getByTestId('weekly-progress-digest-expiry-cta')).toBeInTheDocument();
    expect(trackDigest).toHaveBeenCalledWith({
      hasPro: false,
      trialDay7: true,
      trialExpired: true,
      studentsActive: 4,
    });
  });
});
