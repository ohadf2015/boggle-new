/**
 * Behaviour of the upgrade page's money paths: who sees "current plan", who is
 * offered the trial, what a 401 / 503 does, and how a sign-in resumes checkout.
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

const fetchMock = vi.fn();

beforeEach(() => {
  search = '';
  auth.user = null;
  auth.loading = false;
  Object.assign(pro, { hasPro: false, loading: false, trialUsed: false, known: false });
  fetchMock.mockReset();
  toastError.mockReset();
  toastPlain.mockReset();
  mark.mockReset();
  consumeIntent.mockReset().mockReturnValue(false);
  consumeTrial.mockReset().mockReturnValue(false);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('upgrade page — logged-out visitor', () => {
  it('is not told they are on the Free plan, and is offered the trial the code grants new accounts', () => {
    render(<PageClient />);
    expect(screen.queryByTestId('pricing-free-current')).not.toBeInTheDocument();
    expect(screen.getByTestId('pricing-trial-cta')).toBeInTheDocument();
  });

  it('a trial tap that comes back 401 remembers the trial intent and opens sign-in', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    render(<PageClient />);
    fireEvent.click(screen.getByTestId('pricing-trial-cta'));
    await waitFor(() => expect(screen.getByTestId('auth-modal')).toBeInTheDocument());
    expect(mark).toHaveBeenCalledWith({ trial: true });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ trial: true, locale: 'en' });
  });

  it('a 503 says checkout is offline (not "try again shortly") and points somewhere useful', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    render(<PageClient />);
    fireEvent.click(screen.getByTestId('pricing-paid-cta'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    const { container } = render(<>{toastError.mock.calls[0][0]}</>);
    expect(container.textContent).toContain('eg2Pro.upgrade.checkoutOffline');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/en/contact');
  });
});

describe('upgrade page — before auth resolves (server render / first paint)', () => {
  it('leads with the 14-day trial badge and CTA, like a logged-out visitor, without claiming a plan', () => {
    auth.loading = true;
    render(<PageClient />);
    expect(screen.getByTestId('pricing-trial-cta')).toBeInTheDocument();
    expect(screen.getByText(/^eg2Pro\.plans\.trialBadge/)).toBeInTheDocument();
    expect(screen.queryByText('eg2Pro.plans.recommended')).not.toBeInTheDocument();
    expect(screen.getByTestId('pricing-paid-cta').textContent).toMatch(/^eg2Pro\.plans\.buyNowInstead/);
    expect(screen.queryByTestId('pricing-free-current')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pricing-pro-current')).not.toBeInTheDocument();
  });

  it('does not count a trial view until the viewer is known', async () => {
    const { trackTrialCtaView } = await import('@/lib/education/proFunnelTelemetry');
    vi.mocked(trackTrialCtaView).mockClear();
    auth.loading = true;
    render(<PageClient />);
    expect(trackTrialCtaView).not.toHaveBeenCalled();
  });

  it('drops the trial for a trial-used account once auth and the entitlement resolve', () => {
    auth.loading = true;
    const { rerender } = render(<PageClient />);
    expect(screen.getByTestId('pricing-trial-cta')).toBeInTheDocument();
    auth.loading = false;
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, trialUsed: true });
    rerender(<PageClient />);
    expect(screen.queryByTestId('pricing-trial-cta')).not.toBeInTheDocument();
    expect(screen.getByText('eg2Pro.plans.recommended')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-free-current')).toBeInTheDocument();
  });

  it('shows a Pro teacher their plan, not the trial, once resolved', () => {
    auth.loading = true;
    const { rerender } = render(<PageClient />);
    auth.loading = false;
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, hasPro: true });
    rerender(<PageClient />);
    expect(screen.queryByTestId('pricing-trial-cta')).not.toBeInTheDocument();
    expect(screen.getByTestId('pricing-pro-current')).toBeInTheDocument();
  });
});

describe('upgrade page — signed-in teachers', () => {
  it('marks Free as current only once the status read succeeded', () => {
    auth.user = { id: 't1' };
    render(<PageClient />);
    expect(screen.queryByTestId('pricing-free-current')).not.toBeInTheDocument();
  });

  it('hides the trial from a teacher who already used it', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, trialUsed: true });
    render(<PageClient />);
    expect(screen.getByTestId('pricing-free-current')).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-trial-cta')).not.toBeInTheDocument();
  });

  it('does not resume a trial checkout for an account whose trial is used up', async () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, trialUsed: true });
    consumeIntent.mockReturnValue(true);
    consumeTrial.mockReturnValue(true);
    await act(async () => { render(<PageClient />); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toastPlain).toHaveBeenCalledWith('eg2Pro.upgrade.trialUsed');
  });

  it('resumes the trial checkout for an eligible account after sign-in', async () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true });
    consumeIntent.mockReturnValueOnce(true);
    consumeTrial.mockReturnValueOnce(true);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ url: 'https://pay.test' }) });
    await act(async () => { render(<PageClient />); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ trial: true, locale: 'en' });
  });

  it('waits for the entitlement read before consuming the resume intent', async () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { loading: true });
    consumeIntent.mockReturnValue(true);
    await act(async () => { render(<PageClient />); });
    expect(consumeIntent).not.toHaveBeenCalled();
  });

  it('shows a Pro teacher their tools instead of a buy button', () => {
    auth.user = { id: 't1' };
    Object.assign(pro, { known: true, hasPro: true });
    render(<PageClient />);
    expect(screen.getByTestId('parent-pack')).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-paid-cta')).not.toBeInTheDocument();
  });
});

describe('upgrade page — school tab', () => {
  it('opens on the school quote when the link says plan=school, naming the teacher who asked', () => {
    search = 'plan=school&for=Ms%20Rivera';
    render(<PageClient />);
    expect(screen.getByTestId('school-quote-requester').textContent).toContain('Ms Rivera');
  });

  it('switches to the school tab from the school card', () => {
    render(<PageClient />);
    fireEvent.click(screen.getByTestId('plan-school-cta'));
    expect(screen.getByLabelText('eg2Pro.school.fieldSchool')).toBeInTheDocument();
  });
});
