/** Who gets which chrome on the plan page: the public header for visitors, the app nav for teachers. */
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
  EducationShell: ({ children, header, chromeFree }: React.PropsWithChildren<{ header?: React.ReactNode; chromeFree?: boolean }>) => (
    <div data-testid="shell" data-chrome-free={chromeFree ? 'true' : 'false'}>{header}{children}</div>
  ),
}));
vi.mock('@/components/education/landing/LandingHeader', () => ({ LandingHeader: () => <div data-testid="landing-header" /> }));
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

describe('plan page chrome', () => {
  it('gives a signed-out visitor the public header, not the teacher app nav', () => {
    render(<PageClient />);
    expect(screen.getByTestId('shell')).toHaveAttribute('data-chrome-free', 'true');
    expect(screen.getByTestId('landing-header')).toBeInTheDocument();
  });

  it('keeps the teacher app nav for a signed-in teacher', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true });
    render(<PageClient hasSession />);
    expect(screen.getByTestId('shell')).toHaveAttribute('data-chrome-free', 'false');
    expect(screen.queryByTestId('landing-header')).not.toBeInTheDocument();
  });

  it('holds the app nav while a returning teacher with a session cookie is still loading', () => {
    auth.loading = true;
    render(<PageClient hasSession />);
    expect(screen.getByTestId('shell')).toHaveAttribute('data-chrome-free', 'false');
  });
});
