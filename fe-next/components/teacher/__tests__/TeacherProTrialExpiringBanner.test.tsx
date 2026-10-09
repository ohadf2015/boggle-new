import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialExpiringBanner } from '../TeacherProTrialExpiringBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...a: unknown[]) => capture(...a) },
}));

const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() },
}));

/** ISO `days` whole days from now minus `backMs`, so ceil() lands exactly on `days`. */
function expiresInDays(days: number, backMs = 60_000): string {
  return new Date(Date.now() + days * 86_400_000 - backMs).toISOString();
}

describe('TeacherProTrialExpiringBanner', () => {
  beforeEach(() => {
    capture.mockReset();
    toastError.mockReset();
  });

  it('shows from Day-10 (4 days remaining) and fires teacher_trial_expiring_shown once', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresInDays(4)} />);
    const banner = screen.getByTestId('teacher-pro-trial-expiring');
    expect(banner).toHaveAttribute('data-days', '4');
    expect(screen.getByText('teacher.subscription.trialLifecycleTitle:4')).toBeInTheDocument();
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('teacher_trial_expiring_shown', { days_remaining: 4 });
  });

  it.each([3, 2, 1, 0])('still shows inside the window at %i days remaining', (days) => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresInDays(days)} />);
    expect(screen.getByTestId('teacher-pro-trial-expiring')).toHaveAttribute('data-days', String(days));
  });

  it('hides above the window (5 days remaining) and when the trial end is unknown', () => {
    const { rerender } = render(<TeacherProTrialExpiringBanner trialExpires={expiresInDays(5)} />);
    expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
    rerender(<TeacherProTrialExpiringBanner trialExpires={null} />);
    expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
  });

  it('CTA deep-links to the paid Polar checkout with teacher_upgrade_clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://polar.sh/checkout/paid' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<TeacherProTrialExpiringBanner trialExpires={expiresInDays(4)} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/subscription/checkout',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ trial: false, locale: 'en' }),
        }),
      );
    });
    expect(capture).toHaveBeenCalledWith('teacher_upgrade_clicked', { days_remaining: 4 });
    vi.unstubAllGlobals();
  });

  it('dismiss hides the banner', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresInDays(4)} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-dismiss'));
    expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
  });
});
