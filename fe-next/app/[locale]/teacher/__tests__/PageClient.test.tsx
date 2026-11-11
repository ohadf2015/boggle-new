import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
type Trial = { expiresAt: string; msLeft: number; daysLeft: number; hoursLeft: number; isExpired: boolean; isUrgent: boolean };
let accessState: { trial: Trial | null; isLoading?: boolean } = { trial: null };
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => accessState }));
const FREE_PRO = { hasPro: false, loading: false, known: true, source: 'polar', status: 'active', trialUsed: false, periodEnd: null, trialExpires: null, pendingCheckout: false, portalUrl: null, grant: null, grantExpired: false, refresh: vi.fn() };
let proState: Record<string, unknown> = { ...FREE_PRO };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div /> }));
const dashboardProps = vi.hoisted(() => ({ last: {} as Record<string, unknown> }));
vi.mock('@/components/teacher/TeacherDashboard', () => ({
  default: function MockTeacherDashboard(props: { banner?: React.ReactNode; alert?: React.ReactNode }) {
    dashboardProps.last = props as Record<string, unknown>;
    return (
      <div data-testid="teacher-dashboard">
        {props.alert}
        {props.banner}
      </div>
    );
  },
}));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({
  TrialUrgencyBanner: ({ trial, href, onDismiss }: { trial: unknown; href?: string; onDismiss?: () => void }) =>
    trial ? <div data-testid="trial-urgency-banner" data-href={href} data-dismissible={onDismiss ? '1' : '0'} /> : null,
}));
vi.mock('@/components/education/TeacherGate', () => ({
  TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
let trialEndedState = { dismissed: false, dismiss: vi.fn() };
vi.mock('@/hooks/useTeacherTrialEnded', () => ({ useTeacherTrialEnded: () => trialEndedState }));
vi.mock('lucide-react', () => ({ Shield: () => null, ArrowLeft: () => null, X: () => null, Crown: () => null, CreditCard: () => null, ExternalLink: () => null, AlertTriangle: () => null }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button> }));

import * as AuthContext from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import TeacherPage from '../PageClient';

const mockUseAuth = AuthContext.useAuth as ReturnType<typeof vi.fn>;
const mockTrackGrowthEvent = vi.mocked(trackGrowthEvent);
const teacher = { user: { id: 'u1' }, profile: { user_role: 'teacher', is_admin: false }, isAdmin: false, loading: false };
const admin = { user: { id: 'u1' }, profile: { user_role: 'admin', is_admin: true }, isAdmin: true, loading: false };

const mkTrial = (over: Partial<Trial>): Trial => ({
  expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
  msLeft: 5 * 86400000,
  daysLeft: 5,
  hoursLeft: 120,
  isExpired: false,
  isUrgent: false,
  ...over,
});

const upsellImpressions = () =>
  mockTrackGrowthEvent.mock.calls.filter(([name, props]) => name === 'iap_viewed' && /dashboard_banner|dashboard_trial_offer/.test(String((props as { source?: string }).source)));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  accessState = { trial: null };
  proState = { ...FREE_PRO };
  trialEndedState = { dismissed: false, dismiss: vi.fn() };
  dashboardProps.last = {};
  mockUseAuth.mockReturnValue(teacher);
});

describe('TeacherPage: Home carries billing banners only', () => {
  it('given a free teacher with no billing state, when Home renders, then no banner and no rail Pro card or usage prompt is handed down', () => {
    render(<TeacherPage />);
    expect(dashboardProps.last.banner).toBeUndefined();
    expect(dashboardProps.last.proOffer).toBeUndefined();
    expect(dashboardProps.last.usagePrompt).toBeUndefined();
    expect(upsellImpressions()).toHaveLength(0);
  });

  it('given a free teacher inside the 7-day access-trial window, when Home renders, then the trial-ending card shows and no upsell card replaces the class insight', () => {
    accessState = { trial: mkTrial({ daysLeft: 5 }) };
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-trial-ending-card')).toBeInTheDocument();
    expect(dashboardProps.last.proOffer).toBeUndefined();
  });

  it('given a Pro teacher (paid or admin-granted), when Home renders, then no banner and no impression', () => {
    proState = { ...FREE_PRO, hasPro: true, source: 'admin_grant' };
    render(<TeacherPage />);
    expect(dashboardProps.last.banner).toBeUndefined();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('iap_viewed', expect.anything());
  });

  it('given the plan is still loading, when Home renders, then nothing is shown', () => {
    proState = { ...FREE_PRO, loading: true, known: false };
    render(<TeacherPage />);
    expect(dashboardProps.last.banner).toBeUndefined();
    expect(dashboardProps.last.alert).toBeUndefined();
  });

  it('given the plan read failed, when Home renders, then no billing banner is guessed', () => {
    proState = { ...FREE_PRO, known: false, pendingCheckout: true };
    render(<TeacherPage />);
    expect(screen.queryByTestId('pending-checkout-banner')).toBeNull();
  });

  it('given a live Polar trial, when Home renders, then the days-remaining lifecycle banner shows', () => {
    proState = { ...FREE_PRO, hasPro: true, status: 'trialing', trialUsed: true };
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-trial-lifecycle')).toBeInTheDocument();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { product: 'teacher_pro', source: 'dashboard_trial_lifecycle', event_type: 'impression' });
  });

  it('given a Polar trial with 4 days left, when Home renders, then the expiring banner shows instead', () => {
    const trialExpires = new Date(Date.now() + 4 * 86400000).toISOString();
    proState = { ...FREE_PRO, hasPro: true, status: 'trialing', trialUsed: true, trialExpires, periodEnd: trialExpires };
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-trial-expiring')).toHaveAttribute('data-days', '4');
    expect(screen.queryByTestId('teacher-pro-trial-lifecycle')).toBeNull();
  });

  it('given an expired Polar trial (lapsed), when Home renders, then one reactivation banner shows, until dismissed', () => {
    proState = { ...FREE_PRO, status: 'canceled', trialUsed: true };
    const { unmount } = render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-trial-ended')).toBeInTheDocument();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { product: 'teacher_pro', source: 'dashboard_trial_ended', event_type: 'impression' });
    unmount();
    trialEndedState = { dismissed: true, dismiss: vi.fn() };
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-trial-ended')).toBeNull();
  });

  it('given an expired access trial, when Home renders, then the trial-ending card shows without a dismiss control', () => {
    accessState = {
      trial: mkTrial({
        isExpired: true,
        daysLeft: 0,
        hoursLeft: 0,
        msLeft: 0,
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      }),
    };
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-trial-ending-card')).toBeInTheDocument();
    expect(screen.getByTestId('teacher-trial-ending-cta')).toHaveAttribute(
      'href',
      '/en/teacher/upgrade?source=trial_ending_card',
    );
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
  });

  it('given an unfinished checkout, when Home renders, then the resume banner shows (never for an admin)', () => {
    proState = { ...FREE_PRO, pendingCheckout: true };
    const { unmount } = render(<TeacherPage />);
    expect(screen.getByTestId('pending-checkout-banner')).toBeInTheDocument();
    unmount();
    mockUseAuth.mockReturnValue(admin);
    render(<TeacherPage />);
    expect(screen.queryByTestId('pending-checkout-banner')).toBeNull();
  });

  it('given a declined renewal, when Home renders, then the payment-failed alert is handed down', () => {
    proState = { ...FREE_PRO, hasPro: true, status: 'past_due', source: 'polar' };
    render(<TeacherPage />);
    expect(dashboardProps.last.alert).toBeTruthy();
    expect(dashboardProps.last.banner).toBeUndefined();
  });
});
