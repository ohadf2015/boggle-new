import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  status: 'trialing' as string,
};
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, vars?: Record<string, string>) => (vars ? `${k}:${JSON.stringify(vars)}` : k), language: 'en' }),
}));

let daysLeftMock: number | null = 7;
vi.mock('@/lib/education/polarTrial', () => ({
  polarTrialDaysLeft: () => daysLeftMock,
}));

const trackDigest = vi.fn();
const trackCta = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherDigestViewed: (args: unknown) => trackDigest(args),
  trackTeacherDigestUpgradeCtaClicked: (args: unknown) => trackCta(args),
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
    averageScorePct: 81,
    inactiveCount: 1,
    students: [
      {
        studentId: 's1',
        name: 'Sam',
        thisWeekSessions: 2,
        lastWeekSessions: 1,
        thisWeekAccuracyPct: 90,
        lastWeekAccuracyPct: 70,
        accuracyDelta: 20,
        inactive7d: false,
      },
      {
        studentId: 's3',
        name: 'Jo',
        thisWeekSessions: 0,
        lastWeekSessions: 1,
        thisWeekAccuracyPct: null,
        lastWeekAccuracyPct: 50,
        accuracyDelta: null,
        inactive7d: true,
      },
    ],
  };
}

describe('WeeklyProgressDigestCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proState.hasPro = true;
    proState.loading = false;
    proState.trialUsed = false;
    proState.status = 'trialing';
    proState.trialExpires = '2026-10-20T12:00:00.000Z';
    daysLeftMock = 7;
    metricsMock.mockReturnValue({
      metrics: week(),
      isLoading: false,
      error: null,
      refresh,
    });
  });

  it('prints assignments completed, average score, movers, and inactive 7d', () => {
    render(
      <WeeklyProgressDigestCard
        classroomId="c1"
        classroomName="Year 7"
        assignmentExpected={10}
        assignmentSubmitted={3}
      />,
    );
    expect(screen.getByTestId('weekly-progress-digest')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('81%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-progress-digest-movement')).toHaveTextContent('Sam');
    expect(screen.getByTestId('weekly-progress-digest-inactive')).toHaveTextContent('Jo');
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
    fireEvent.click(cta);
    expect(trackCta).toHaveBeenCalled();
  });

  it('shows the expiry conversion CTA after Polar trial lapsed', () => {
    proState.hasPro = false;
    proState.trialUsed = true;
    proState.status = 'canceled';
    daysLeftMock = null;
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
      trialDay7: false,
      trialExpired: true,
      studentsActive: 4,
    });
  });

  it('shows an over-cap CTA for a free teacher and hides CTA for paid Pro', () => {
    proState.hasPro = false;
    proState.trialUsed = false;
    proState.status = 'active';
    daysLeftMock = null;
    const { rerender } = render(
      <WeeklyProgressDigestCard
        classroomId="c1"
        classroomName="Year 7"
        assignmentExpected={10}
        assignmentSubmitted={3}
        overFreeTierCaps
      />,
    );
    expect(screen.getByTestId('weekly-progress-digest-overcap-cta')).toBeInTheDocument();

    proState.hasPro = true;
    proState.trialUsed = true;
    proState.status = 'active';
    daysLeftMock = null;
    rerender(
      <WeeklyProgressDigestCard
        classroomId="c1"
        classroomName="Year 7"
        assignmentExpected={10}
        assignmentSubmitted={3}
        overFreeTierCaps
      />,
    );
    expect(screen.queryByTestId('weekly-progress-digest-pro-link')).not.toBeInTheDocument();
  });
});
