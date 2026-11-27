import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/components/education/landing/LandingHeader', () => ({
  LandingHeader: () => <header data-testid="landing-header" />,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/en/education/access',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/lib/animation/useGsapReveal', () => ({ useGsapReveal: () => ({ current: null }) }));
vi.mock('@/components/education/AccessRequestGate', () => ({
  AccessRequestGate: () => <div data-testid="access-request-gate">Gate</div>,
}));
vi.mock('@/components/education/AccessRedirectNotice', () => ({
  AccessRedirectNotice: () => null,
}));
vi.mock('@/components/education/DistrictUpsellStrip', () => ({
  DistrictUpsellStrip: () => <div data-testid="district-upsell" />,
}));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({
  TrialUrgencyBanner: () => null,
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stub
  default: (p: Record<string, unknown>) => <img alt={String(p.alt ?? '')} src={String(p.src ?? '')} data-testid={p['data-testid'] as string | undefined} />,
}));

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));

import { PageClient } from '../PageClient';

describe('access PageClient — CLS reserve while access is loading', () => {
  beforeEach(() => {
    mockUseTeacherAccess.mockReturnValue({
      status: 'none',
      hasAccess: false,
      isLoading: true,
      latestRequest: null,
      trial: null,
    });
  });

  it('keeps the header, mascot and h1 in place instead of a short loading column', () => {
    render(<PageClient />);
    expect(screen.getByTestId('landing-header')).toBeInTheDocument();
    expect(screen.getByText('education.access.h1')).toBeInTheDocument();
    expect(screen.getByTestId('access-mascot')).toBeInTheDocument();
    expect(screen.getByTestId('access-gate-skeleton')).toHaveClass('min-h-[220px]');
    expect(screen.queryByTestId('access-request-gate')).toBeNull();
  });

  it('Suspense fallback in page.tsx reserves pitch chrome, not the approved card', () => {
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).toMatch(/max-w-md/);
    expect(src).toMatch(/h-\[136px\] w-\[136px\]/);
    expect(src).toMatch(/min-h-\[220px\]/);
    expect(src).not.toMatch(/already_approved/);
  });

  it('Given the sky page, Then the mascot stands between chunky A/B tiles, not in a faded cyan box', () => {
    render(<PageClient />);
    const art = screen.getByTestId('access-art');
    expect(art.className).not.toMatch(/bg-neo-cyan\/\d+|border-neo-cyan\/\d+/);
    expect(art.querySelectorAll('.edu-tile')).toHaveLength(2);
    expect(readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8')).not.toMatch(/bg-neo-cyan\/10/);
  });
});
