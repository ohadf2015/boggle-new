import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialOfferBanner } from '../TeacherProTrialOfferBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
  }),
}));

const trackTrialCtaView = vi.fn();
const trackTrialCtaTap = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTrialCtaView: (...a: unknown[]) => trackTrialCtaView(...a),
  trackTrialCtaTap: (...a: unknown[]) => trackTrialCtaTap(...a),
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

describe('TeacherProTrialOfferBanner', () => {
  beforeEach(() => {
    trackTrialCtaView.mockReset();
    trackTrialCtaTap.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
  });

  it('fires trial_cta_view when mounted', () => {
    render(<TeacherProTrialOfferBanner />);
    expect(screen.getByTestId('teacher-pro-trial-offer')).toBeInTheDocument();
    expect(trackTrialCtaView).toHaveBeenCalledWith({ source: 'dashboard_trial_offer' });
  });

  it('POSTs Polar trial checkout and tracks trial_cta_tap', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/trial' });
    render(<TeacherProTrialOfferBanner />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-cta'));
    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledTimes(1);
    });
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: true, locale: 'en' });
    expect(trackTrialCtaTap).toHaveBeenCalledWith({ source: 'dashboard_trial_offer' });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/trial');
  });

  it('does not invent a URL on 503', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: false, status: 503 });
    render(<TeacherProTrialOfferBanner />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-cta'));
    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledTimes(1);
    });
    expect(goToPolarCheckout).not.toHaveBeenCalled();
  });
});
