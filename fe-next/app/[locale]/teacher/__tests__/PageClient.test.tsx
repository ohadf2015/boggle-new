import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
let accessState: { trial: {
  expiresAt: string;
  msLeft: number;
  daysLeft: number;
  hoursLeft: number;
  isExpired: boolean;
  isUrgent: boolean;
} | null } = { trial: null };
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => accessState }));
// The Pro entitlement decides whether the upgrade strip shows at all. Default: a
// resolved free teacher; individual tests override.
let proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div /> }));
// The banner is a SLOT on the dashboard now, not a sibling — rendered beside an
// `h-dvh` root it made the page taller than the viewport. The mock has to render
// what it is handed, or these assertions would pass on a dropped banner.
vi.mock('@/components/teacher/TeacherDashboard', () => ({
  default: ({ banner }: { banner?: React.ReactNode }) => (
    <div data-testid="teacher-dashboard">{banner}</div>
  ),
}));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({
  TrialUrgencyBanner: ({
    trial,
    href,
    onDismiss,
    ctaLabel,
  }: {
    trial: unknown;
    href?: string;
    onDismiss?: () => void;
    ctaLabel?: string;
  }) =>
    trial ? (
      <div
        data-testid="trial-urgency-banner"
        data-href={href}
        data-cta={ctaLabel ?? ''}
        data-dismissible={onDismiss ? '1' : '0'}
      />
    ) : null,
}));
let trialNudgeState = { dismissed: false, dismiss: vi.fn() };
vi.mock('@/lib/education/useTrialUpgradeNudge', () => ({
  useTrialUpgradeNudge: () => trialNudgeState,
}));
vi.mock('@/components/education/TeacherGate', () => ({
  TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
let recentState = { hasRecentConfig: true };
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => recentState,
}));
let milestoneState = {
  hasMilestone: true,
  loading: false,
  dismissed: false,
  dismiss: vi.fn(),
};
vi.mock('@/hooks/useTeacherProMilestone', () => ({
  useTeacherProMilestone: () => milestoneState,
}));
vi.mock('lucide-react', () => ({ Shield: () => null, ArrowLeft: () => null, X: () => null }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button> }));

import * as AuthContext from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import TeacherPage from '../PageClient';

const mockUseAuth = AuthContext.useAuth as ReturnType<typeof vi.fn>;
const mockTrackGrowthEvent = vi.mocked(trackGrowthEvent);

const teacherProfile = { user_role: 'teacher' as const, is_admin: false };
const adminProfile  = { user_role: 'admin' as const,   is_admin: true  };

describe('TeacherPage upgrade CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessState = { trial: null };
    trialNudgeState = { dismissed: false, dismiss: vi.fn() };
    proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
    recentState = { hasRecentConfig: true };
    milestoneState = { hasMilestone: true, loading: false, dismissed: false, dismiss: vi.fn() };
  });

  it('hides the upgrade strip for a Pro teacher (paid or gifted)', () => {
    proState = { ...proState, hasPro: true, source: 'admin_grant' };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
      'iap_viewed',
      expect.objectContaining({ product: 'teacher_pro', event_type: 'impression' }),
    );
  });

  it('shows no upsell while the entitlement is still loading', () => {
    proState = { ...proState, loading: true };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
  });

  it('shows Teacher Pro ask with price, reports, and /pricing checkout for a free teacher', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-ask')).toBeInTheDocument();
    expect(screen.getByText(/\$9/)).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.unlimitedClasses')).toBeInTheDocument();
    expect(screen.getByText('education.landing.pro.analytics')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /teacher\.subscription\.upgradeNow/i });
    expect(link).toHaveAttribute('href', '/en/pricing');
  });

  it('hides upgrade link for admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: adminProfile, isAdmin: true, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
  });

  it('fires iap_viewed impression on mount for non-admin teacher', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'dashboard_banner',
      event_type: 'impression',
    });
  });

  it('does not fire iap_viewed impression for admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: adminProfile, isAdmin: true, loading: false });
    render(<TeacherPage />);
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
      'iap_viewed',
      expect.objectContaining({ product: 'teacher_pro', event_type: 'impression' }),
    );
  });

  it('buries the Pro ask until a classroom hits the engagement milestone', () => {
    milestoneState = { ...milestoneState, hasMilestone: false };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
      'iap_viewed',
      expect.objectContaining({ product: 'teacher_pro', event_type: 'impression' }),
    );
  });

  it('stays quiet after the teacher dismissed the milestone ask', () => {
    milestoneState = { ...milestoneState, dismissed: true };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
  });

  it('shows no Pro ask while the milestone read is still open', () => {
    milestoneState = { ...milestoneState, loading: true, hasMilestone: false };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
  });
});

const mkTrial = (over: Partial<NonNullable<typeof accessState.trial>>): NonNullable<typeof accessState.trial> => ({
  expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
  msLeft: 5 * 86400000,
  daysLeft: 5,
  hoursLeft: 120,
  isExpired: false,
  isUrgent: false,
  ...over,
});

describe('TeacherPage 7-day trial upgrade nudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessState = { trial: null };
    trialNudgeState = { dismissed: false, dismiss: vi.fn() };
    proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
    recentState = { hasRecentConfig: true };
    milestoneState = { hasMilestone: true, loading: false, dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
  });

  it('shows a dismissible days-remaining banner linked to Polar checkout inside 7 days', () => {
    accessState = { trial: mkTrial({ daysLeft: 5 }) };
    render(<TeacherPage />);
    const banner = screen.getByTestId('trial-urgency-banner');
    expect(banner).toHaveAttribute('data-href', '/en/teacher/upgrade');
    expect(banner).toHaveAttribute('data-dismissible', '1');
    expect(banner).toHaveAttribute('data-cta', 'Upgrade to Teacher Pro');
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
  });

  it('does not show the trial banner with more than 7 days left', () => {
    accessState = { trial: mkTrial({ daysLeft: 10, msLeft: 10 * 86400000, hoursLeft: 240 }) };
    render(<TeacherPage />);
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
  });

  it('stays quiet after the teacher dismissed the 7-day nudge', () => {
    accessState = { trial: mkTrial({ daysLeft: 2, isUrgent: true }) };
    trialNudgeState = { dismissed: true, dismiss: vi.fn() };
    render(<TeacherPage />);
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
  });

  it('never asks a Pro teacher to upgrade, even inside the 7-day window', () => {
    accessState = { trial: mkTrial({ daysLeft: 3 }) };
    proState = { ...proState, hasPro: true, source: 'admin_grant' };
    render(<TeacherPage />);
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
    expect(screen.queryByTestId('teacher-pro-ask')).toBeNull();
  });

  it('still shows the expired renewal card, without a dismiss control', () => {
    accessState = { trial: mkTrial({ isExpired: true, daysLeft: 0, hoursLeft: 0, msLeft: 0 }) };
    render(<TeacherPage />);
    const banner = screen.getByTestId('trial-urgency-banner');
    expect(banner).toHaveAttribute('data-href', '/en/teacher/upgrade');
    expect(banner).toHaveAttribute('data-dismissible', '0');
  });
});
