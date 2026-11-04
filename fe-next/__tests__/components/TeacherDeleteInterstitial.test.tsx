import { vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherDeleteInterstitial from '@/components/settings/TeacherDeleteInterstitial';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import {
  trackTeacherDeleteAlternativeChosen,
  trackTeacherDeleteReasonSelected,
  trackTeacherDeleteViewed,
} from '@/lib/education/teacherDeleteTelemetry';
import type { DeleteImpactSummary } from '@/lib/account/deleteAccountImpact';

vi.mock('@/contexts/LanguageContext');
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/lib/education/teacherDeleteTelemetry', () => ({
  trackTeacherDeleteViewed: vi.fn(),
  trackTeacherDeleteReasonSelected: vi.fn(),
  trackTeacherDeleteAlternativeChosen: vi.fn(),
  trackTeacherDeleteConfirmed: vi.fn(),
}));

const mockT = (key: string) => key;

const FREE_BILLING = { tier: 'free' as const, status: null, renews: false, portalUrl: null };

const TEACHER_IMPACT: DeleteImpactSummary = {
  isTeacher: true,
  classrooms: [
    { id: 'c1', name: 'Period 3', studentCount: 19 },
    { id: 'c2', name: null, studentCount: 2 },
  ],
  totalStudents: 21,
  roundsPlayed: 15,
  emailSubscribed: true,
  billing: FREE_BILLING,
  perClassDeleteAvailable: false,
};

function renderInterstitial(overrides: Partial<Parameters<typeof TeacherDeleteInterstitial>[0]> = {}) {
  const props = {
    impact: TEACHER_IMPACT,
    surface: 'settings' as const,
    isDarkMode: false,
    reason: null,
    onReasonChange: vi.fn(),
    onKeepAccount: vi.fn(),
    onContinueToDelete: vi.fn(),
    ...overrides,
  };
  render(<TeacherDeleteInterstitial {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  (useLanguage as Mock).mockReturnValue({ t: mockT, language: 'en' });
});

describe('TeacherDeleteInterstitial', () => {
  it('shows roster impact per class and the totals', () => {
    renderInterstitial();
    expect(screen.getByText('settings.teacherDeleteImpactTitle')).toBeInTheDocument();
    expect(screen.getByText(/Period 3/)).toBeInTheDocument();
    // Unnamed class falls back to the placeholder name.
    expect(screen.getByText(/settings.teacherDeleteUnnamedClass/)).toBeInTheDocument();
  });

  it('emits teacher_delete_viewed once on mount', () => {
    renderInterstitial();
    expect(trackTeacherDeleteViewed).toHaveBeenCalledTimes(1);
    expect(trackTeacherDeleteViewed).toHaveBeenCalledWith(TEACHER_IMPACT, 'settings');
  });

  it('picking a reason lifts it up and emits teacher_delete_reason_selected', () => {
    const props = renderInterstitial();
    fireEvent.click(screen.getByText('settings.teacherDeleteReason.too_expensive'));
    expect(props.onReasonChange).toHaveBeenCalledWith('too_expensive');
    expect(trackTeacherDeleteReasonSelected).toHaveBeenCalledWith('too_expensive', 'settings', true);
  });

  it('"keep free account" emits the alternative and keeps the account', () => {
    const props = renderInterstitial();
    fireEvent.click(screen.getByText('settings.teacherDeleteKeepFree'));
    expect(trackTeacherDeleteAlternativeChosen).toHaveBeenCalledWith('keep_free_account', TEACHER_IMPACT, 'settings');
    expect(props.onKeepAccount).toHaveBeenCalled();
  });

  it('"stop emails" unsubscribes via preferences API and reports done', async () => {
    (fetchWithAuth as Mock).mockResolvedValue({ ok: true });
    renderInterstitial();
    fireEvent.click(screen.getByText('settings.teacherDeleteStopEmails'));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        '/api/email/preferences',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ daily_email_subscribed: false }),
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('settings.teacherDeleteStopEmailsDone')).toBeInTheDocument();
    });
    expect(trackTeacherDeleteAlternativeChosen).toHaveBeenCalledWith('unsubscribe_emails', TEACHER_IMPACT, 'settings');
  });

  it('a failed unsubscribe shows the error and emits nothing', async () => {
    (fetchWithAuth as Mock).mockResolvedValue({ ok: false });
    renderInterstitial();
    fireEvent.click(screen.getByText('settings.teacherDeleteStopEmails'));
    await waitFor(() => {
      expect(screen.getByText('settings.teacherDeleteStopEmailsError')).toBeInTheDocument();
    });
    expect(trackTeacherDeleteAlternativeChosen).not.toHaveBeenCalled();
  });

  it('hides the stop-emails option when already unsubscribed', () => {
    renderInterstitial({ impact: { ...TEACHER_IMPACT, emailSubscribed: false } });
    expect(screen.queryByText('settings.teacherDeleteStopEmails')).not.toBeInTheDocument();
    expect(screen.getByText('settings.teacherDeleteStopEmailsDone')).toBeInTheDocument();
  });

  it('continue is optional — a missing reason does not block it', () => {
    const props = renderInterstitial({ reason: null });
    const continueBtn = screen.getByText('settings.teacherDeleteContinue').closest('button');
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn!);
    expect(props.onContinueToDelete).toHaveBeenCalled();
  });

  it('renders the acceptance sentence, free-stays-free, and the delete-one-class link', () => {
    const dict: Record<string, string> = {
      'settings.teacherDeleteImpactSummaryV2': '{classes} {classNoun}, {students} {studentNoun}, {rounds} {roundNoun} and their reports will be permanently deleted.',
      'settings.teacherDeleteNoun.class.one': 'class',
      'settings.teacherDeleteNoun.student.other': 'students',
      'settings.teacherDeleteNoun.round.other': 'rounds',
      'settings.teacherDeleteKeepFree': 'The free plan stays free',
      'settings.teacherDeleteOneClass.oneClass': 'Delete your class instead',
    };
    (useLanguage as Mock).mockReturnValue({ t: (key: string) => dict[key] ?? key, language: 'en' });
    renderInterstitial({
      impact: {
        ...TEACHER_IMPACT,
        classrooms: [{ id: 'c1', name: 'Period 3', studentCount: 19 }],
        totalStudents: 19,
        roundsPlayed: 15,
        perClassDeleteAvailable: true,
        billing: FREE_BILLING,
      },
    });
    expect(screen.getByTestId('teacher-delete-impact-summary')).toHaveTextContent(
      '1 class, 19 students, 15 rounds and their reports will be permanently deleted.'
    );
    expect(screen.getByText('The free plan stays free')).toBeInTheDocument();
    expect(screen.getByTestId('teacher-delete-one-class')).toHaveAttribute('href', '/en/teacher/classroom/c1');
  });

  it('hides free-stays-free when Pro renews and shows the billing note instead', () => {
    renderInterstitial({
      impact: {
        ...TEACHER_IMPACT,
        billing: { tier: 'pro', status: 'active', renews: true, portalUrl: 'https://billing.example/portal' },
      },
    });
    expect(screen.queryByText('settings.teacherDeleteKeepFree')).not.toBeInTheDocument();
    expect(screen.getByTestId('teacher-delete-pro-note')).toBeInTheDocument();
    expect(screen.getByText('settings.teacherDeleteProActiveLink')).toHaveAttribute('href', 'https://billing.example/portal');
  });
});
