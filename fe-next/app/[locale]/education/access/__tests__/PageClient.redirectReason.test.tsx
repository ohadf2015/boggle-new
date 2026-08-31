import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * CHANNEL test, not a component test.
 *
 * `AccessRedirectNotice` has its own unit tests, but those pass `from` as a
 * prop — and the shipped bug was never in the component. `TeacherGate` wrote
 * `?from=` and this page threw it away, so the wiring was the broken part while
 * every consumer-level test would have stayed green. Same shape as the
 * classroom lesson-handoff bug: the consumer was tested, the channel never was.
 *
 * So: mock only the *edges* (search params, auth, presentational children) and
 * let the real notice render through the real PageClient.
 */

const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}|${Object.values(params).join(',')}` : k,
    language: 'es',
  }),
}));

vi.mock('@/lib/animation/useGsapReveal', () => ({ useGsapReveal: () => ({ current: null }) }));
vi.mock('@/components/education/AccessRequestGate', () => ({
  AccessRequestGate: () => <div>FORM</div>,
}));
vi.mock('@/components/education/DistrictUpsellStrip', () => ({
  DistrictUpsellStrip: () => null,
}));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({
  TrialUrgencyBanner: () => null,
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image, never shipped
  default: (p: Record<string, unknown>) => <img alt={String(p.alt ?? '')} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { PageClient } from '../PageClient';

const NEEDS_ACCESS = { status: 'none', hasAccess: false, isLoading: false, latestRequest: null, trial: null };

describe('access PageClient — redirect reason channel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeacherAccess.mockReturnValue(NEEDS_ACCESS);
  });

  it('reads ?from= and explains the redirect to a teacher who must still apply', () => {
    mockGet.mockImplementation((k: string) => (k === 'from' ? '/es/education/classroom-game' : null));
    render(<PageClient />);

    expect(mockGet).toHaveBeenCalledWith('from');
    // The destination the teacher actually clicked must reach the copy.
    expect(
      screen.getByText(/education\.access\.redirect_body\|education\.header\.breadcrumbs\.classroomGame/)
    ).toBeInTheDocument();
  });

  it('stays quiet for a teacher who navigated here directly', () => {
    mockGet.mockReturnValue(null);
    render(<PageClient />);
    expect(screen.queryByText(/redirect_body/)).toBeNull();
  });

  it('does not re-pitch access to a teacher who already has it', () => {
    mockGet.mockImplementation((k: string) => (k === 'from' ? '/es/teacher' : null));
    mockUseTeacherAccess.mockReturnValue({ ...NEEDS_ACCESS, hasAccess: true, status: 'approved' });
    render(<PageClient />);
    expect(screen.queryByText(/redirect_body/)).toBeNull();
  });
});
