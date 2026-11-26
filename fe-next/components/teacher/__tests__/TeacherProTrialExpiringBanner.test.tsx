import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialExpiringBanner } from '../TeacherProTrialExpiringBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));

const trackTeacherTrialBannerShown = vi.fn();
const trackTeacherTrialUpgradeClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTeacherTrialBannerShown: (...a: unknown[]) => trackTeacherTrialBannerShown(...a),
  trackTeacherTrialUpgradeClicked: (...a: unknown[]) => trackTeacherTrialUpgradeClicked(...a),
}));

const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
}));

const expiresIn = (days: number) => new Date(Date.now() + days * 86_400_000 - 60_000).toISOString();
const PORTAL = 'https://polar.sh/lexiclash/portal?customer_session_token=x';

describe('TeacherProTrialExpiringBanner', () => {
  beforeEach(() => {
    capture.mockReset();
    trackTeacherTrialBannerShown.mockReset();
    trackTeacherTrialUpgradeClicked.mockReset();
    postTeacherProCheckout.mockReset();
  });

  it('Given 3 days left, Then it is the urgent variant and fires both shown events with days_remaining', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} portalUrl={PORTAL} />);
    expect(screen.getByText('teacher.subscription.trialAutoRenewBody')).toBeInTheDocument();
    expect(screen.getByTestId('teacher-pro-trial-expiring')).toHaveAttribute('data-tone', 'urgent');
    expect(capture).toHaveBeenCalledWith('teacher_trial_expiring_shown', { days_remaining: 3 });
    expect(trackTeacherTrialBannerShown).toHaveBeenCalledTimes(1);
    expect(trackTeacherTrialBannerShown).toHaveBeenCalledWith({ days_remaining: 3, urgent: true });
  });

  it('Given 4 days left, Then the shown event is not marked urgent', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(4)} portalUrl={PORTAL} />);
    expect(trackTeacherTrialBannerShown).toHaveBeenCalledWith({ days_remaining: 4, urgent: false });
  });

  it('Given the upgrade CTA, Then it links to the existing checkout path and tracks days_remaining', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(2)} portalUrl={PORTAL} />);
    const cta = screen.getByTestId('teacher-pro-trial-expiring-upgrade-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade?source=dashboard_trial_lifecycle');
    fireEvent.click(cta);
    expect(trackTeacherTrialUpgradeClicked).toHaveBeenCalledTimes(1);
    expect(trackTeacherTrialUpgradeClicked).toHaveBeenCalledWith({ days_remaining: 2, urgent: true });
    expect(postTeacherProCheckout).not.toHaveBeenCalled();
  });

  it('Given a trialing teacher, Then manage-or-cancel stays a secondary portal link, never a new checkout', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(2)} portalUrl={PORTAL} />);
    const cta = screen.getByTestId('teacher-pro-trial-expiring-cta');
    expect(cta).toHaveTextContent('teacher.subscription.trialManageCta');
    expect(cta).toHaveAttribute('href', PORTAL);
    expect(cta).toHaveAttribute('target', '_blank');
    fireEvent.click(cta);
    expect(screen.getByTestId('teacher-cancel-intercept')).toBeInTheDocument();
    expect(postTeacherProCheckout).not.toHaveBeenCalled();
  });

  it('Given no portal link yet, Then the manage link opens the plan page in-app', () => {
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(2)} portalUrl={null} />);
    const cta = screen.getByTestId('teacher-pro-trial-expiring-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(cta).not.toHaveAttribute('target');
  });

  it('Given more than 4 days left, Then it renders nothing', () => {
    const { container } = render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(8)} portalUrl={PORTAL} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given it is dismissed, Then it hides and tells the parent', () => {
    const onDismiss = vi.fn();
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(2)} portalUrl={PORTAL} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
  });

  it('Given trial usage, When the banner shows, Then it names what the teacher ran during the trial', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, usage: { games: 7, students: 42, practice: 90 } }),
    } as Response);
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} portalUrl={PORTAL} />);
    expect(await screen.findByTestId('trial-usage-recap')).toHaveTextContent('teacher.trialUsage.lead');
    spy.mockRestore();
  });

  it('Given the usage read fails, When the banner shows, Then the banner stays without the recap', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    render(<TeacherProTrialExpiringBanner trialExpires={expiresIn(3)} portalUrl={PORTAL} />);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByTestId('teacher-pro-trial-expiring')).toBeInTheDocument();
    expect(screen.queryByTestId('trial-usage-recap')).toBeNull();
    spy.mockRestore();
  });
});
