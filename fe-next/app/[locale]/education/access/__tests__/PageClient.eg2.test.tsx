import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/education/landing/LandingHeader', () => ({
  LandingHeader: ({ showStart }: { showStart?: boolean }) => (
    <header data-testid="landing-header" data-show-start={String(showStart)} />
  ),
}));

const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}|${Object.values(params).join(',')}` : k,
    language: 'en',
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

describe('access PageClient — eg2 teacher-only page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
    mockUseTeacherAccess.mockReturnValue(NEEDS_ACCESS);
  });

  it('has the landing header (home link) but not a second start button on the start page', () => {
    render(<PageClient />);
    expect(screen.getByTestId('landing-header')).toHaveAttribute('data-show-start', 'false');
  });

  it('sends nobody to consumer games from the teacher signup page', () => {
    const { container } = render(<PageClient />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    for (const consumer of ['/en/multiplayer', '/en/blast', '/en/daily']) expect(hrefs).not.toContain(consumer);
  });

  it('describes the steps in the order they really happen: account, confirm + 2 questions, class', () => {
    render(<PageClient />);
    for (const k of ['step1', 'step2', 'step3']) {
      expect(screen.getByText(`education.access.next.${k}_title`)).toBeInTheDocument();
    }
  });
});
