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

const TEACHER_IMPACT: DeleteImpactSummary = {
  isTeacher: true,
  classrooms: [
    { id: 'c1', name: 'Period 3', studentCount: 19 },
    { id: 'c2', name: null, studentCount: 2 },
  ],
  totalStudents: 21,
  roundsPlayed: 15,
  emailSubscribed: true,
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
    fireEvent.click(screen.getByText('settings.teacherDeleteReason.too_many_emails'));
    expect(props.onReasonChange).toHaveBeenCalledWith('too_many_emails');
    expect(trackTeacherDeleteReasonSelected).toHaveBeenCalledWith('too_many_emails', 'settings');
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

  it('disables continue button until a reason is selected', () => {
    const props = renderInterstitial({ reason: null });
    const continueBtn = screen.getByText('settings.teacherDeleteContinue').closest('button');
    expect(continueBtn).toBeDisabled();
    fireEvent.click(continueBtn!);
    expect(props.onContinueToDelete).not.toHaveBeenCalled();
  });

  it('enables continue button and calls onContinueToDelete when reason is selected', () => {
    const props = renderInterstitial({ reason: 'too_many_emails' });
    const continueBtn = screen.getByText('settings.teacherDeleteContinue').closest('button');
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn!);
    expect(props.onContinueToDelete).toHaveBeenCalled();
  });
});
