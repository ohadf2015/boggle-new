import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * A Pro teacher (paid or gifted) keeps the trial deadline she was granted Pro
 * to replace — `teacher_access_requests.trial_expires_at` is never cleared.
 * `/teacher` already gates its banner on the entitlement (selectTeacherBanner);
 * this page did not, so a paying teacher landing on /education/access saw
 * "trial expired — Upgrade Now". Same rule here: Pro (or still loading) hides
 * the trial urgency banner. Recurring pitfall class 1: never paint an upsell a
 * later answer retracts.
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/en/education/access',
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
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: [], isLoading: false }) }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image, never shipped
  default: (p: Record<string, unknown>) => <img alt={String(p.alt ?? '')} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { PageClient } from '../PageClient';

const ENDED = { expiresAt: '2026-09-23T00:00:00Z', isExpired: true, daysLeft: 0 };
const LIVE = { expiresAt: '2026-12-02T00:00:00Z', isExpired: false, daysLeft: 14 };
const approvedWith = (trial: unknown) => ({
  status: 'approved',
  hasAccess: true,
  isLoading: false,
  latestRequest: { trial_expires_at: '2026-09-23T00:00:00Z' },
  trial,
});

describe('access PageClient — the trial line on the approved card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeacherAccess.mockReturnValue(approvedWith(ENDED));
  });

  it('Given a live trial, Then it says Pro features are open until the date, with no countdown card or second CTA', () => {
    proState = { hasPro: false, loading: false };
    mockUseTeacherAccess.mockReturnValue(approvedWith(LIVE));
    render(<PageClient />);
    expect(screen.getByTestId('access-trial-note')).toHaveTextContent('education.trial.body');
    expect(screen.queryByTestId('trial-urgency-banner')).toBeNull();
    expect(screen.getAllByText('education.trial.cta')).toHaveLength(1);
  });

  it('Given an ended trial, Then it says what stays free instead of a date', () => {
    proState = { hasPro: false, loading: false };
    render(<PageClient />);
    expect(screen.getByTestId('access-trial-note')).toHaveTextContent('education.trial.expired_kept');
  });

  it('hides it for a Pro teacher', () => {
    proState = { hasPro: true, loading: false };
    render(<PageClient />);
    expect(screen.queryByTestId('access-trial-note')).not.toBeInTheDocument();
  });

  it('hides it while the entitlement is still loading', () => {
    proState = { hasPro: false, loading: true };
    render(<PageClient />);
    expect(screen.queryByTestId('access-trial-note')).not.toBeInTheDocument();
  });
});
