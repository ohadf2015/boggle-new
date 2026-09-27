import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * A Pro teacher (paid or gifted) keeps the trial deadline she was granted Pro
 * to replace — `teacher_access_requests.trial_expires_at` is never cleared.
 * `/teacher` already gates its banner on the entitlement (pickTeacherBanner);
 * this page did not, so a paying teacher landing on /education/access saw
 * "trial expired — Upgrade Now". Same rule here: Pro (or still loading) hides
 * the trial urgency banner. Recurring pitfall class 1: never paint an upsell a
 * later answer retracts.
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));

let proState: { hasPro: boolean; loading: boolean };
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/lib/animation/useGsapReveal', () => ({ useGsapReveal: () => ({ current: null }) }));
vi.mock('@/components/education/AccessRequestGate', () => ({ AccessRequestGate: () => null }));
vi.mock('@/components/education/DistrictUpsellStrip', () => ({ DistrictUpsellStrip: () => null }));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({
  TrialUrgencyBanner: () => <div data-testid="trial-banner" />,
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image, never shipped
  default: (p: Record<string, unknown>) => <img alt={String(p.alt ?? '')} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { PageClient } from '../PageClient';

const APPROVED_WITH_TRIAL = {
  status: 'approved',
  hasAccess: true,
  isLoading: false,
  latestRequest: { trial_expires_at: '2026-09-23T00:00:00Z' },
  trial: { state: 'expired', daysLeft: 0 },
};

describe('access PageClient — Pro hides the trial banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeacherAccess.mockReturnValue(APPROVED_WITH_TRIAL);
  });

  it('shows the trial banner for an approved free teacher', () => {
    proState = { hasPro: false, loading: false };
    render(<PageClient />);
    expect(screen.getByTestId('trial-banner')).toBeInTheDocument();
  });

  it('hides it for a Pro teacher', () => {
    proState = { hasPro: true, loading: false };
    render(<PageClient />);
    expect(screen.queryByTestId('trial-banner')).not.toBeInTheDocument();
  });

  it('hides it while the entitlement is still loading', () => {
    proState = { hasPro: false, loading: true };
    render(<PageClient />);
    expect(screen.queryByTestId('trial-banner')).not.toBeInTheDocument();
  });
});
