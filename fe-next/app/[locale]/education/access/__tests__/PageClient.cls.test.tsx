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
  default: (p: Record<string, unknown>) => <img alt={String(p.alt ?? '')} src={String(p.src ?? '')} />,
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

  it('keeps the header, h1, and hero in place instead of a short loading column', () => {
    render(<PageClient />);
    expect(screen.getByTestId('landing-header')).toBeInTheDocument();
    expect(screen.getByText('education.access.h1')).toBeInTheDocument();
    expect(screen.getByAltText('education.access.hero_alt')).toBeInTheDocument();
    expect(screen.getByTestId('access-gate-skeleton')).toHaveClass('min-h-[220px]');
    expect(screen.queryByTestId('access-request-gate')).toBeNull();
  });

  it('Suspense fallback in page.tsx reserves pitch chrome, not the approved card', () => {
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).toMatch(/max-w-6xl/);
    expect(src).toMatch(/aspect-\[918\/880\]/);
    expect(src).toMatch(/min-h-\[220px\]/);
    expect(src).not.toMatch(/already_approved/);
  });
});
