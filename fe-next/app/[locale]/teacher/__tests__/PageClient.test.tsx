import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial: null }) }));
// The Pro entitlement decides whether the upgrade strip shows at all. Default: a
// resolved free teacher; individual tests override.
let proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div /> }));
// The banner is a SLOT on the dashboard now, not a sibling — rendered beside an
// `h-dvh` root it made the page taller than the viewport. The mock has to render
// what it is handed, or these assertions would pass on a dropped banner.
vi.mock('@/components/teacher/TeacherDashboard', () => ({
  default: ({ banner, usagePrompt }: { banner?: React.ReactNode; usagePrompt?: React.ReactNode }) => (
    <div data-testid="teacher-dashboard">{banner}{usagePrompt}</div>
  ),
}));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({ TrialUrgencyBanner: () => null }));
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
    proState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: vi.fn() };
    recentState = { hasRecentConfig: true };
    milestoneState = { hasMilestone: true, loading: false, dismissed: false, dismiss: vi.fn() };
    usageState = { reason: null, count: 0, loading: false, dismissed: false, dismiss: vi.fn() };
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
    expect(screen.getByTestId('teacher-pro-ask')).toBeInTheDocument();
    expect(screen.queryByTestId('teacher-pro-usage-prompt')).toBeNull();
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
