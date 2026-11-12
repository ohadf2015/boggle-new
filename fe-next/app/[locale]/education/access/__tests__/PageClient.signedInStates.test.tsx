import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const replace = vi.hoisted(() => vi.fn());
const fromParam = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => fromParam.value }),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/en/education/access',
}));

const retry = vi.hoisted(() => vi.fn());
const access = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => access.state }));
const classes = vi.hoisted(() => ({ value: { classrooms: [] as unknown[], isLoading: false, error: null as string | null } }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classes.value }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshProfile: vi.fn(async () => {}) }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/animation/useGsapReveal', () => ({ useGsapReveal: () => ({ current: null }) }));
vi.mock('@/components/education/landing/LandingHeader', () => ({ LandingHeader: () => <header /> }));
vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/education/DistrictUpsellStrip', () => ({ DistrictUpsellStrip: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: ({ text }: { text: string }) => <p>{text}</p> }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image, never shipped
  default: (p: Record<string, unknown>) => <img alt={String(p.alt ?? '')} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/education/AccessRequestGate', () => ({ AccessRequestGate: () => <form data-testid="access-request-gate" /> }));

import { PageClient } from '../PageClient';

const REQUEST = { id: 'r1', status: 'pending', use_case: 'Weekly vocab games with my 7th grade', role: 'teacher', created_at: '2026-11-10T18:00:00Z' };
const base = { hasAccess: false, status: 'none', latestRequest: null, trial: null, isLoading: false, error: null, retry };
const set = (patch: Record<string, unknown>) => {
  access.state = { ...base, ...patch };
};

describe('access page: a signed-in teacher always gets one clear next step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    fromParam.value = null;
    classes.value = { classrooms: [], isLoading: false, error: null };
    set({});
  });

  it('Given signed in with no request yet, Then the request form shows', () => {
    render(<PageClient />);
    expect(screen.getByTestId('access-request-gate')).toBeInTheDocument();
    expect(screen.queryByTestId('access-load-error')).toBeNull();
  });

  it.each([
    ['the request lookup failed', { error: 'request' }],
    ['the profile never loaded', { error: 'profile', isLoading: true }],
  ])('Given %s, Then an error with retry shows, never the sign-up form or an endless skeleton', (_label, patch) => {
    set(patch);
    render(<PageClient />);
    const card = screen.getByTestId('access-load-error');
    expect(card).toHaveTextContent('education.access.load_error_title');
    expect(screen.queryByTestId('access-request-gate')).toBeNull();
    expect(screen.queryByTestId('access-gate-skeleton')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'education.access.load_error_retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('Given a request still pending, Then it says it is being finished, offers to finish it now and what to do meanwhile, with no form', () => {
    set({ status: 'pending', latestRequest: REQUEST });
    render(<PageClient />);
    const card = screen.getByTestId('access-pending');
    expect(card).toHaveTextContent('education.access.pending_title');
    expect(card).toHaveTextContent('education.access.pending_meanwhile');
    expect(screen.getByRole('link', { name: 'education.access.pending_meanwhile_link' })).toHaveAttribute('href', '/en/education/games-for-teachers');
    expect(screen.getByRole('button', { name: 'education.access.pending_finish_cta' })).toBeEnabled();
    expect(screen.queryByTestId('access-request-gate')).toBeNull();
  });

  it('Given a pending request, When the teacher taps finish and approval goes through, Then the saved request is resent and the page goes to class setup', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
    vi.stubGlobal('fetch', fetchMock);
    set({ status: 'pending', latestRequest: REQUEST });
    render(<PageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'education.access.pending_finish_cta' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher/classroom/new'));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/education/access-request');
    expect(JSON.parse(init.body as string)).toEqual({ locale: 'en', use_case: REQUEST.use_case, role: 'teacher' });
  });

  it('Given a pending request, When finishing is still pending on our side, Then it says so and keeps the button for another try', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 202, json: async () => ({ ok: true, approvalPending: true }) })));
    set({ status: 'pending', latestRequest: REQUEST });
    render(<PageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'education.access.pending_finish_cta' }));
    expect(await screen.findByRole('status')).toHaveTextContent('education.access.pending_still');
    expect(screen.getByRole('button', { name: 'education.access.pending_finish_cta' })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('Given a pending request, When finishing fails, Then the error shows with the button still there', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    set({ status: 'pending', latestRequest: REQUEST });
    render(<PageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'education.access.pending_finish_cta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('education.access.submit_error');
  });

  it('Given the request says approved but the account has no teacher role, Then it says we need to look, offers no "finish", and no form or approved card', () => {
    set({ status: 'approved', latestRequest: { ...REQUEST, status: 'approved' } });
    render(<PageClient />);
    expect(screen.getByTestId('access-review')).toHaveTextContent('education.access.review_title');
    expect(screen.queryByRole('button', { name: 'education.access.pending_finish_cta' })).toBeNull();
    expect(screen.queryByText('education.access.already_approved_title')).toBeNull();
    expect(screen.queryByTestId('access-request-gate')).toBeNull();
  });

  it('Given approved without the role, When the teacher asks us to check, Then the route is told once and the card says the team has it', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ ok: false, code: 'needs_review' }) }));
    vi.stubGlobal('fetch', fetchMock);
    set({ status: 'approved', latestRequest: { ...REQUEST, status: 'approved' } });
    render(<PageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'education.access.review_cta' }));
    expect(await screen.findByRole('status')).toHaveTextContent('education.access.review_sent');
    expect(screen.queryByRole('button', { name: 'education.access.review_cta' })).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Given a pending request, When the route answers that it was declined, Then it says so truthfully and offers no retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ ok: false, code: 'declined' }) })));
    set({ status: 'pending', latestRequest: REQUEST });
    render(<PageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'education.access.pending_finish_cta' }));
    expect(await screen.findByRole('status')).toHaveTextContent('education.access.declined_contact');
    expect(screen.queryByRole('button', { name: 'education.access.pending_finish_cta' })).toBeNull();
  });

  it('Given a declined request, Then the card points to replying by email, not to reapplying through a form that is not there', () => {
    set({ status: 'declined', latestRequest: { ...REQUEST, status: 'declined' } });
    render(<PageClient />);
    expect(screen.getByText('education.access.declined_contact')).toBeInTheDocument();
    expect(screen.queryByText('education.access.declined_reapply')).toBeNull();
    expect(screen.queryByTestId('access-request-gate')).toBeNull();
  });

  it('Given teacher access and a failed request lookup, with no from, Then the teacher is still sent on, never shown the error', async () => {
    set({ hasAccess: true, status: 'approved', error: 'request' });
    render(<PageClient />);
    expect(screen.queryByTestId('access-load-error')).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher/classroom/new'));
  });

  it('Given teacher access and no class yet, with no from, Then the page goes straight to class setup', async () => {
    set({ hasAccess: true, status: 'approved' });
    render(<PageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher/classroom/new'));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('Given teacher access and a class already, with no from, Then the page goes straight to the teacher area', async () => {
    classes.value = { classrooms: [{ id: 'c1' }], isLoading: false, error: null };
    set({ hasAccess: true, status: 'approved' });
    render(<PageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher'));
  });

  it('Given teacher access and a from, Then the page returns there, once', async () => {
    fromParam.value = '/en/teacher/reports';
    set({ hasAccess: true, status: 'approved' });
    render(<PageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher/reports'));
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
