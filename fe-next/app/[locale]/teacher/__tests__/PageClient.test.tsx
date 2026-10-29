import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
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
  default: ({
    banner,
    usagePrompt,
    proOffer,
  }: {
    banner?: React.ReactNode;
    usagePrompt?: React.ReactNode;
    proOffer?: { kind: string; tracked: boolean; onDismiss: () => void } | null;
  }) => (
    <div data-testid="teacher-dashboard">
      {banner}
      {usagePrompt}
      {proOffer ? (
        <button data-testid="pro-offer" data-kind={proOffer.kind} data-tracked={String(proOffer.tracked)} onClick={proOffer.onDismiss} />
      ) : null}
    </div>
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
let trialOfferState = { dismissed: true, dismiss: vi.fn() };
vi.mock('@/hooks/useTeacherTrialOffer', () => ({
  useTeacherTrialOffer: () => trialOfferState,
}));
let trialEndedState = { dismissed: false, dismiss: vi.fn() };
vi.mock('@/hooks/useTeacherTrialEnded', () => ({
  useTeacherTrialEnded: () => trialEndedState,
}));
// The usage-triggered card waits on the same inputs as the milestone ask.
// Default: no limit hit, so the card stays down unless a test opts in.
let usageState = {
  reason: null as null | 'students' | 'assignments',
  count: 0,
  loading: false,
  dismissed: false,
  dismiss: vi.fn(),
};
vi.mock('@/hooks/useTeacherUsagePrompt', () => ({
  useTeacherUsagePrompt: () => usageState,
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
    trialOfferState = { dismissed: true, dismiss: vi.fn() };
    trialEndedState = { dismissed: false, dismiss: vi.fn() };
    usageState = { reason: null, count: 0, loading: false, dismissed: false, dismiss: vi.fn() };
  });

  it('hides the upgrade strip for a Pro teacher (paid or gifted)', () => {
    proState = { ...proState, hasPro: true, source: 'admin_grant' };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('pro-offer')).toBeNull();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
      'iap_viewed',
      expect.objectContaining({ product: 'teacher_pro', event_type: 'impression' }),
    );
  });

  it('shows no upsell while the entitlement is still loading', () => {
    proState = { ...proState, loading: true };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('pro-offer')).toBeNull();
  });

  it('hands the milestone Pro ask to Home as its one rail card for a free teacher', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    // Home renders it as the one rail card (its copy and CTA are pinned in TeacherDashboard.home).
    const offer = screen.getByTestId('pro-offer');
    expect(offer).toHaveAttribute('data-kind', 'upgrade');
    expect(offer).toHaveAttribute('data-tracked', 'true');
  });

  it('hides upgrade link for admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: adminProfile, isAdmin: true, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('pro-offer')).toBeNull();
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

  it('before the engagement milestone, a free teacher with no other ask still gets the dashboard Pro card (no milestone banner impression)', () => {
    milestoneState = { ...milestoneState, hasMilestone: false };
    trialOfferState = { dismissed: false, dismiss: vi.fn() };
    proState = { ...proState, trialUsed: true };
    trialEndedState = { dismissed: true, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    const offer = screen.getByTestId('pro-offer');
    expect(offer).toHaveAttribute('data-kind', 'upgrade');
    expect(offer).toHaveAttribute('data-tracked', 'false');
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
      'iap_viewed',
      expect.objectContaining({ product: 'teacher_pro', event_type: 'impression' }),
    );
  });

  it('the dashboard Pro card stays down after an earlier "Not now" on the trial offer, and its own dismiss persists', () => {
    milestoneState = { ...milestoneState, hasMilestone: false };
    trialOfferState = { dismissed: true, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    const { unmount } = render(<TeacherPage />);
    expect(screen.queryByTestId('pro-offer')).toBeNull();
    unmount();
    trialOfferState = { dismissed: false, dismiss: vi.fn() };
    proState = { ...proState, trialUsed: true };
    trialEndedState = { dismissed: true, dismiss: vi.fn() };
    window.localStorage.removeItem('lexi:proTrialCardDismissed:dashboard');
    render(<TeacherPage />);
    act(() => screen.getByTestId('pro-offer').click());
    expect(screen.queryByTestId('pro-offer')).toBeNull();
    expect(Number(window.localStorage.getItem('lexi:proTrialCardDismissed:dashboard'))).toBeGreaterThan(0);
    window.localStorage.removeItem('lexi:proTrialCardDismissed:dashboard');
  });

  it('stays quiet after the teacher dismissed the milestone ask', () => {
    milestoneState = { ...milestoneState, dismissed: true };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('pro-offer')).toBeNull();
  });

  it('shows no Pro ask while the milestone read is still open', () => {
    milestoneState = { ...milestoneState, loading: true, hasMilestone: false };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('pro-offer')).toBeNull();
  });

  it('shows the usage prompt card when a free teacher hits a usage limit', () => {
    milestoneState = { ...milestoneState, dismissed: true };
    usageState = { reason: 'students', count: 12, loading: false, dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-usage-prompt')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /teacher\.subscription\.upgradeNow/i })).toHaveAttribute(
      'href',
      '/en/teacher/upgrade',
    );
  });

  it('does not stack the usage card on top of the milestone Pro banner', () => {
    usageState = { reason: 'assignments', count: 3, loading: false, dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.getByTestId('pro-offer')).toBeInTheDocument();
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).toBeNull();
  });

  it('a live Polar trial shows the days-remaining lifecycle banner, not the access banner or a Pro ask', () => {
    accessState = { trial: mkTrial({ daysLeft: 2, isUrgent: true }) };
    proState = { ...proState, hasPro: true, source: 'polar', status: 'trialing', trialUsed: true };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-trial-lifecycle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'teacher.subscription.trialLifecycleCta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'teacher.subscription.trialLifecycleCta' })).toBeNull();
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
    expect(screen.queryByTestId('pro-offer')).toBeNull();
    expect(screen.queryByTestId('teacher-pro-trial-ended')).toBeNull();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'dashboard_trial_lifecycle',
      event_type: 'impression',
    });
  });

  it('a Polar trial on day 10 (4 days left) shows the expiring banner, not the lifecycle welcome', () => {
    const trialExpires = new Date(Date.now() + 4 * 86400000).toISOString();
    proState = {
      ...proState,
      hasPro: true,
      source: 'polar',
      status: 'trialing',
      trialUsed: true,
      trialExpires,
      periodEnd: trialExpires,
    };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-trial-expiring')).toBeInTheDocument();
    expect(screen.getByTestId('teacher-pro-trial-expiring')).toHaveAttribute('data-days', '4');
    expect(screen.queryByTestId('teacher-pro-trial-lifecycle')).toBeNull();
  });

  it('an expired Polar trial is one reactivation CTA, not a second free trial or a stacked ask', () => {
    accessState = { trial: mkTrial({ isExpired: true, daysLeft: 0, hoursLeft: 0, msLeft: 0 }) };
    proState = { ...proState, hasPro: false, source: 'polar', status: 'canceled', trialUsed: true };
    usageState = { reason: 'students', count: 12, loading: false, dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.getByTestId('teacher-pro-trial-ended')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'teacher.subscription.trialReactivateCta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'teacher.subscription.trialReactivateCta' })).toBeNull();
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
    expect(screen.queryByTestId('pro-offer')).toBeNull();
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).toBeNull();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'dashboard_trial_ended',
      event_type: 'impression',
    });
  });

  it('hides the expired Polar trial banner after persisted dismiss', () => {
    accessState = { trial: mkTrial({ isExpired: true, daysLeft: 0, hoursLeft: 0, msLeft: 0 }) };
    proState = { ...proState, hasPro: false, source: 'polar', status: 'canceled', trialUsed: true };
    trialEndedState = { dismissed: true, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-trial-ended')).toBeNull();
  });

  it('hides the usage prompt card for a Pro teacher and after dismiss', () => {
    proState = { ...proState, hasPro: true, source: 'polar' };
    usageState = { reason: 'students', count: 12, loading: false, dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    const { unmount } = render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).toBeNull();
    unmount();

    proState = { ...proState, hasPro: false };
    usageState = { ...usageState, dismissed: true };
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).toBeNull();
  });

  it('shows no usage card while the usage read is still open', () => {
    milestoneState = { ...milestoneState, dismissed: true };
    usageState = { reason: 'students', count: 12, loading: true, dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).toBeNull();
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
    trialOfferState = { dismissed: true, dismiss: vi.fn() };
    trialEndedState = { dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
  });

  it('turns the 7-day upgrade nudge into Home\'s dismissible Pro card', () => {
    accessState = { trial: mkTrial({ daysLeft: 5 }) };
    render(<TeacherPage />);
    // Inside the 7-day window the nudge is Home's one Pro card; its dismiss is the nudge's.
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
    const offer = screen.getByTestId('pro-offer');
    expect(offer).toHaveAttribute('data-kind', 'upgrade');
    offer.click();
    expect(trialNudgeState.dismiss).toHaveBeenCalled();
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
    expect(screen.queryByTestId('pro-offer')).toBeNull();
  });

  it('still shows the expired renewal card, without a dismiss control', () => {
    accessState = { trial: mkTrial({ isExpired: true, daysLeft: 0, hoursLeft: 0, msLeft: 0 }) };
    render(<TeacherPage />);
    const banner = screen.getByTestId('trial-urgency-banner');
    expect(banner).toHaveAttribute('data-href', '/en/teacher/upgrade');
    expect(banner).toHaveAttribute('data-dismissible', '0');
  });
});

describe('TeacherPage Polar 14-day trial offer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessState = { trial: null };
    trialNudgeState = { dismissed: false, dismiss: vi.fn() };
    proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn(), trialUsed: false, status: 'active' };
    recentState = { hasRecentConfig: true };
    milestoneState = { hasMilestone: false, loading: false, dismissed: false, dismiss: vi.fn() };
    trialOfferState = { dismissed: false, dismiss: vi.fn() };
    trialEndedState = { dismissed: false, dismiss: vi.fn() };
    usageState = { reason: null, count: 0, loading: false, dismissed: false, dismiss: vi.fn() };
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
  });

  it('offers the 14-day trial as Home\'s Pro card even before a milestone', () => {
    render(<TeacherPage />);
    const offer = screen.getByTestId('pro-offer');
    expect(offer).toHaveAttribute('data-kind', 'trial');
    offer.click();
    expect(trialOfferState.dismiss).toHaveBeenCalled();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'dashboard_trial_offer',
      event_type: 'impression',
    });
  });

  it('after dismiss, falls through to the milestone Pro ask when earned', () => {
    trialOfferState = { dismissed: true, dismiss: vi.fn() };
    milestoneState = { hasMilestone: true, loading: false, dismissed: false, dismiss: vi.fn() };
    render(<TeacherPage />);
    expect(screen.getByTestId('pro-offer')).toHaveAttribute('data-kind', 'upgrade');
  });

  it('renders PendingCheckoutBanner when pendingCheckout is true, outranking offerTrial and suppressing usage prompt', () => {
    proState = {
      ...proState,
      hasPro: false,
      pendingCheckout: true,
    } as typeof proState;
    usageState = { reason: 'students', count: 12, loading: false, dismissed: false, dismiss: vi.fn() };
    render(<TeacherPage />);
    expect(screen.getByTestId('pending-checkout-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('pro-offer')).toBeNull();
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).toBeNull();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'dashboard_pending_checkout',
      event_type: 'impression',
    });
  });
});
