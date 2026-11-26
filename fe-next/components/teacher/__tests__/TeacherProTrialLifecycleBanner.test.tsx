import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialLifecycleBanner } from '../TeacherProTrialLifecycleBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const trackTeacherTrialBannerShown = vi.fn();
const trackTeacherTrialUpgradeClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTeacherTrialBannerShown: (...a: unknown[]) => trackTeacherTrialBannerShown(...a),
  trackTeacherTrialUpgradeClicked: (...a: unknown[]) => trackTeacherTrialUpgradeClicked(...a),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const expiresIn = (days: number) => new Date(Date.now() + days * 86_400_000 - 60_000).toISOString();
const PORTAL = 'https://polar.sh/lexiclash/portal?customer_session_token=x';

describe('TeacherProTrialLifecycleBanner', () => {
  beforeEach(() => {
    trackTeacherTrialBannerShown.mockReset();
    trackTeacherTrialUpgradeClicked.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
  });

  it('shows days remaining in the title and the countdown tile', () => {
    render(<TeacherProTrialLifecycleBanner trialExpires={expiresIn(5)} />);
    const banner = screen.getByTestId('teacher-pro-trial-lifecycle');
    expect(banner).toHaveAttribute('data-days', '5');
    expect(banner).toHaveAttribute('data-tone', 'calm');
    expect(screen.getByText(/teacher.subscription.trialLifecycleTitle:5/)).toBeInTheDocument();
    expect(screen.getByTestId('trial-count')).toHaveTextContent('5');
  });

  it('fires teacher_trial_banner_shown once per display with days_remaining', () => {
    render(<TeacherProTrialLifecycleBanner trialExpires={expiresIn(5)} />);
    expect(trackTeacherTrialBannerShown).toHaveBeenCalledTimes(1);
    expect(trackTeacherTrialBannerShown).toHaveBeenCalledWith({ days_remaining: 5, urgent: false });
  });

  it('uses the urgent variant at 3 days or fewer', () => {
    render(<TeacherProTrialLifecycleBanner trialExpires={expiresIn(3)} />);
    expect(screen.getByTestId('teacher-pro-trial-lifecycle')).toHaveAttribute('data-tone', 'urgent');
    expect(trackTeacherTrialBannerShown).toHaveBeenCalledWith({ days_remaining: 3, urgent: true });
  });

  it('uses the today title once the trial instant has passed', () => {
    render(<TeacherProTrialLifecycleBanner trialExpires={new Date(Date.now() - 1000).toISOString()} />);
    expect(screen.getByTestId('teacher-pro-trial-lifecycle')).toHaveAttribute('data-days', '0');
    expect(screen.getByText('teacher.subscription.trialLifecycleTitleToday')).toBeInTheDocument();
  });

  it('leads with an upgrade CTA to the existing checkout path and tracks the click', () => {
    render(<TeacherProTrialLifecycleBanner trialExpires={expiresIn(5)} portalUrl={PORTAL} />);
    const cta = screen.getByTestId('teacher-pro-trial-lifecycle-upgrade-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade?source=dashboard_trial_lifecycle');
    fireEvent.click(cta);
    expect(trackTeacherTrialUpgradeClicked).toHaveBeenCalledTimes(1);
    expect(trackTeacherTrialUpgradeClicked).toHaveBeenCalledWith({ days_remaining: 5, urgent: false });
    // A trialing teacher must never be sent through a second checkout session.
    expect(postTeacherProCheckout).not.toHaveBeenCalled();
    expect(goToPolarCheckout).not.toHaveBeenCalled();
  });

  it('manage-or-cancel opens the retention offer before the raw Polar cancel', () => {
    render(<TeacherProTrialLifecycleBanner trialExpires={expiresIn(5)} portalUrl={PORTAL} />);
    const manage = screen.getByTestId('teacher-pro-trial-lifecycle-manage');
    fireEvent.click(manage);
    // The interstitial stands between the teacher and the Polar portal cancel.
    expect(screen.getByTestId('cancel-offer-dialog')).toBeInTheDocument();
  });

  it('with no expiry known, renders the active-trial title and fires nothing', () => {
    render(<TeacherProTrialLifecycleBanner trialExpires={null} />);
    expect(screen.getByText('teacher.plan.trialActive')).toBeInTheDocument();
    expect(trackTeacherTrialBannerShown).not.toHaveBeenCalled();
  });
});
