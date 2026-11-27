import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { TeacherProTrialCanceledBanner } from '../TeacherProTrialCanceledBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));
vi.mock('../pro/TrialUsageRecap', () => ({ TrialUsageRecap: () => null }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

describe('TeacherProTrialCanceledBanner', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('says Pro stays on until the end date with no charge, and never offers a checkout', () => {
    render(<TeacherProTrialCanceledBanner endsAt="2026-12-06T19:21:51.009Z" onResumed={vi.fn()} />);
    expect(screen.getByText('teacher.subscription.canceledTrialTitle:December 6')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.canceledTrialBody')).toBeInTheDocument();
    const lesson = screen.getByTestId('teacher-pro-trial-canceled-lesson');
    expect(lesson).toHaveAttribute('href', '/en/teacher/classroom/new');
    expect(screen.queryByRole('link', { name: /upgrade|checkout/i })).toBeNull();
    expect(screen.getByTestId('teacher-pro-trial-cancel-reason-too_expensive')).toBeInTheDocument();
  });

  it('turns renewal back on with one tap and refreshes the plan', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const onResumed = vi.fn();
    render(<TeacherProTrialCanceledBanner endsAt="2026-12-06T19:21:51.009Z" onResumed={onResumed} />);
    fireEvent.click(screen.getByTestId('teacher-pro-resume-cta'));
    await waitFor(() => expect(onResumed).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/subscription/resume', expect.objectContaining({ method: 'POST' }));
    expect(toast.success).toHaveBeenCalledWith('teacher.subscription.resumeDone');
  });

  it('shows an error and keeps the button when the resume fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'provider_error' }) });
    const onResumed = vi.fn();
    render(<TeacherProTrialCanceledBanner endsAt="2026-12-06T19:21:51.009Z" onResumed={onResumed} />);
    fireEvent.click(screen.getByTestId('teacher-pro-resume-cta'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.subscription.resumeError'));
    expect(onResumed).not.toHaveBeenCalled();
    expect(screen.getByTestId('teacher-pro-resume-cta')).not.toBeDisabled();
  });

  it('records a one-tap reason without starting a checkout', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<TeacherProTrialCanceledBanner endsAt="2026-12-06T19:21:51.009Z" onResumed={vi.fn()} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-cancel-reason-school_pays'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscription/cancel-reason',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ reason: 'school_pays' }) }),
    ));
    expect(screen.getByText('teacher.subscription.cancelReasonThanks')).toBeInTheDocument();
  });
});
