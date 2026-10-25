/**
 * Plan-page states beyond the money paths: a Pro teacher manages their plan instead of
 * being pitched, and a signed-in teacher waiting on the entitlement read sees a skeleton
 * rather than a trial offer that flips away.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher/upgrade',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/dynamic', () => ({
  default: () => (props: { isOpen: boolean }) => (props.isOpen ? <div data-testid="auth-modal" /> : null),
}));
const toastError = vi.fn();
const toastPlain = vi.fn();
vi.mock('react-hot-toast', () => {
  const fn = Object.assign((...a: unknown[]) => toastPlain(...a), {
    error: (...a: unknown[]) => toastError(...a),
    success: vi.fn(),
  });
  return { default: fn };
});
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
const auth = { user: null as null | { id: string }, loading: false, profile: null as null | Record<string, unknown> };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const pro = { hasPro: false, loading: false, status: 'active', source: 'polar', trialUsed: false, known: false, portalUrl: null, refresh: vi.fn() };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTrialCtaTap: vi.fn(),
  trackTrialCtaView: vi.fn(),
  trackEduProUpgradeClicked: vi.fn(),
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ children, footer }: React.PropsWithChildren<{ footer?: React.ReactNode }>) => <div>{children}{footer}</div>,
}));
vi.mock('@/components/teacher/pro/ParentReportPack', () => ({ ParentReportPack: () => <div data-testid="parent-pack" /> }));
const mark = vi.fn();
const consumeIntent = vi.fn(() => false);
const consumeTrial = vi.fn(() => false);
vi.mock('@/lib/teacher/resumeCheckout', () => ({
  markResumeCheckoutIntent: (...a: unknown[]) => mark(...a),
  clearResumeCheckoutIntent: vi.fn(),
  consumeResumeCheckoutIntent: () => consumeIntent(),
  consumeResumeTrialFlag: () => consumeTrial(),
}));

import PageClient from '../PageClient';

beforeEach(() => {
  search = '';
  auth.user = null;
  auth.loading = false;
  Object.assign(pro, { hasPro: false, loading: false, status: 'active', source: 'polar', trialUsed: false, known: false, portalUrl: null, trialExpires: null, periodEnd: null });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('plan page — Pro teacher', () => {
  it('shows plan management, not the pitch: no plan cards, preview strip, trust chips or comparison table', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, hasPro: true, portalUrl: 'https://billing.example/portal', periodEnd: '2026-11-15T00:00:00Z' });
    render(<PageClient />);
    expect(screen.getByTestId('pro-plan-panel')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-pro-current')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'eg2Pro.plans.manageBilling' })).toHaveAttribute('href', 'https://billing.example/portal');
    expect(screen.queryByTestId('pricing-cards')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pro-preview-strip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trust-chip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-comparison-matrix')).not.toBeInTheDocument();
  });

  it('tells a trialing teacher how many days are left and what it costs after', () => {
    auth.user = { id: 't1' };
    const inFiveDays = new Date(Date.now() + 4.5 * 86_400_000).toISOString();
    Object.assign(pro, { known: true, hasPro: true, status: 'trialing', trialExpires: inFiveDays });
    render(<PageClient />);
    expect(screen.getByTestId('pro-plan-status').textContent).toBe('eduPlans.manage.trialing|5|$9');
  });

  it('says a gifted plan has no billing to manage', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, hasPro: true, source: 'admin_grant', periodEnd: '2026-12-01T00:00:00Z' });
    render(<PageClient />);
    expect(screen.getByTestId('pro-plan-status').textContent).toMatch(/^eduPlans\.manage\.gifted\|/);
    expect(screen.queryByRole('link', { name: 'eg2Pro.plans.manageBilling' })).not.toBeInTheDocument();
  });
});

describe('plan page — loading', () => {
  it('shows the skeleton, not the trial pitch, on first paint when the server saw a session cookie', () => {
    auth.loading = true;
    render(<PageClient hasSession />);
    expect(screen.getByTestId('plan-cards-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-trial-cta')).not.toBeInTheDocument();
  });

  it('shows skeleton plan cards to a signed-in teacher while the entitlement loads', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { loading: true });
    render(<PageClient />);
    expect(screen.getByTestId('plan-cards-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-trial-cta')).not.toBeInTheDocument();
  });
});

describe('plan page — free teacher', () => {
  it('sells the Free card by what it includes, with no struck-through rows', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true });
    render(<PageClient />);
    const free = screen.getByTestId('plan-card-free');
    expect(free.querySelector('.line-through')).toBeNull();
    expect(free.textContent).not.toContain('education.landing.pro.analytics');
    expect(free.textContent).toContain('education.landing.pro.customLists');
  });

  it('states the live-game seat limit once, for every plan', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true });
    render(<PageClient />);
    expect(screen.getAllByText(/^eduPlans\.cards\.liveCapNote\|50$/)).toHaveLength(1);
  });

  it('shows the school plan as a yearly price with its monthly equivalent and the saving', () => {
    render(<PageClient />);
    expect(screen.getByTestId('school-monthly').textContent).toBe('eduPlans.cards.schoolMonthly|$4.08|54');
  });
});

describe('plan page — inside the native app', () => {
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it('shows no purchase UI, only a line saying Teacher Pro is not sold in the app', async () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, hasPro: false });
    render(<PageClient />);
    expect(await screen.findByTestId('upgrade-not-in-app')).toHaveTextContent('teacher.subscription.notInApp');
    expect(screen.queryByTestId('pricing-cards')).toBeNull();
  });
});
