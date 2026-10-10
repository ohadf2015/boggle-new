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

const trackTrialExpiredShown = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTrialExpiredShown: (...a: unknown[]) => trackTrialExpiredShown(...a),
  trackEduProUpgradeClicked: vi.fn(),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', () => ({
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('TeacherProTrialEndedBanner', () => {
  beforeEach(() => {
    trackTrialExpiredShown.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
  });

  it('fires trial_expired when shown', () => {
    render(<TeacherProTrialEndedBanner />);
    expect(screen.getByTestId('teacher-pro-trial-ended')).toBeInTheDocument();
    expect(trackTrialExpiredShown).toHaveBeenCalledWith({ source: 'dashboard_trial_ended' });
  });

  it('POSTs paid Polar checkout (not another trial) from the Reactivate CTA', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/reactivate' });
    render(<TeacherProTrialEndedBanner />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-ended-cta'));
    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledTimes(1);
    });
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: false, locale: 'en' });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/reactivate');
  });

  it('persists dismiss via onDismiss', () => {
    const onDismiss = vi.fn();
    render(<TeacherProTrialEndedBanner onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-ended-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
