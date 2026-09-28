import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialEndedBanner } from '../TeacherProTrialEndedBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
  }),
}));

const trackEduProUpgradeClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProUpgradeClicked: (...a: unknown[]) => trackEduProUpgradeClicked(...a),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', () => ({
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() },
}));

describe('TeacherProTrialEndedBanner', () => {
  beforeEach(() => {
    trackEduProUpgradeClicked.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
    toastError.mockReset();
  });

  it('states trial expired and POSTs paid checkout', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/2' });
    render(<TeacherProTrialEndedBanner />);
    expect(screen.getByText('teacher.subscription.trialEndedTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('teacher-pro-trial-ended-cta'));
    await waitFor(() => expect(postTeacherProCheckout).toHaveBeenCalledTimes(1));
    expect(trackEduProUpgradeClicked).toHaveBeenCalledWith({ source: 'dashboard_trial_ended' });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/2');
  });

  it('surfaces 503 instead of inventing a Polar URL', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: false, status: 503 });
    render(<TeacherProTrialEndedBanner />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-ended-cta'));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('teacher.subscription.checkoutUnavailable');
    });
    expect(goToPolarCheckout).not.toHaveBeenCalled();
  });
});
