import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { TeacherProTrialExpiringBanner } from '../TeacherProTrialExpiringBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const expiresIn = (days: number) => new Date(Date.now() + days * 86_400_000 - 60_000).toISOString();

describe('TeacherProTrialExpiringBanner checkout', () => {
  beforeEach(() => {
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('Given an expiring trial, When the CTA is tapped, Then the shared paid checkout runs with its placement', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/x' });
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));
    await waitFor(() => expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/x'));
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: false, locale: 'en', placement: 'dashboard_trial_expiring' });
  });

  it('Given the till is shut (503), When tapped, Then the unavailable toast shows and the CTA stays tappable for a retry', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: false, status: 503 });
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.subscription.checkoutUnavailable'));
    expect(goToPolarCheckout).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('teacher-pro-trial-expiring-cta')).not.toBeDisabled());
  });

  it('Given a signed-out session (401), When tapped, Then it asks to sign in like every other checkout CTA', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: false, status: 401 });
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.subscription.signInRequired'));
  });

  it('Given any other failure, When tapped, Then the generic error toast shows', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: false, status: 500 });
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.subscription.checkoutError'));
  });

  it('Given the network drops, When tapped, Then the generic error toast shows', async () => {
    postTeacherProCheckout.mockRejectedValue(new TypeError('offline'));
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.subscription.checkoutError'));
  });
});
