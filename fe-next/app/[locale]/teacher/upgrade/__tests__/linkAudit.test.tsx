import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/teacher/upgrade',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
const auth = { user: { id: 't1' } as null | { id: string }, loading: false, profile: null };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const pro = { hasPro: false, loading: false, status: 'active', source: 'polar', trialUsed: false, known: true, portalUrl: 'https://billing.example/portal', refresh: vi.fn(), trialExpires: null, periodEnd: null };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [{ id: 'c1', name: 'Room 7B', member_count: 4 }], isLoading: false }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTrialCtaTap: vi.fn(),
  trackTrialCtaView: vi.fn(),
  trackEduProUpgradeClicked: vi.fn(),
}));
vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

import PageClient from '../PageClient';

const ALLOWED = [
  /^\/en\/(teacher|education|legal|student|join)(\/|\?|$)/,
  /^https:\/\/billing\.example\//,
  /^mailto:/,
];

function hrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '');
}

function leaks(container: HTMLElement): string[] {
  return hrefs(container).filter((h) => !ALLOWED.some((re) => re.test(h)));
}

beforeEach(() => {
  auth.user = { id: 't1' };
  Object.assign(pro, { hasPro: false, known: true });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
});
afterEach(() => vi.unstubAllGlobals());

describe('upgrade page link audit', () => {
  it('free teacher tab: every link stays inside edu, legal or billing', () => {
    const { container } = render(<PageClient />);
    expect(hrefs(container).length).toBeGreaterThan(0);
    expect(leaks(container)).toEqual([]);
  });

  it('school tab: no comparison or consumer page links', () => {
    const { container } = render(<PageClient />);
    fireEvent.click(screen.getByRole('tab', { name: 'eg2Pro.tabs.school' }));
    expect(leaks(container)).toEqual([]);
  });

  it('Pro teacher: no comparison or consumer page links', () => {
    Object.assign(pro, { hasPro: true });
    const { container } = render(<PageClient />);
    expect(leaks(container)).toEqual([]);
  });

  it('shows what Pro adds to this teacher\'s own classes', () => {
    render(<PageClient />);
    expect(screen.getByTestId('upgrade-your-classes').textContent).toContain('Room 7B');
  });
});
