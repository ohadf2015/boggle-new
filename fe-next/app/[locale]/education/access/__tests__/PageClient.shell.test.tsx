import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/components/education/landing/LandingHeader', () => ({
  LandingHeader: () => <header data-testid="landing-header" />,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/he/education/access',
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

const STATES = {
  loading: { status: 'none', hasAccess: false, isLoading: true },
  pitch: { status: 'none', hasAccess: false, isLoading: false },
  pending: { status: 'pending', hasAccess: false, isLoading: false },
  approved: { status: 'approved', hasAccess: true, isLoading: false },
} as const;

describe('access PageClient — locked to one scroll region', () => {
  it.each(Object.keys(STATES) as (keyof typeof STATES)[])('%s renders inside the edu shell with no page-growing root', (key) => {
    mockUseTeacherAccess.mockReturnValue({ ...STATES[key], latestRequest: null, trial: null });
    const { container } = render(<PageClient />);
    const shell = screen.getByTestId('education-shell');
    expect(shell).toHaveClass('h-dvh');
    expect(within(screen.getByTestId('education-shell-header')).getByTestId('landing-header')).toBeInTheDocument();
    expect(within(screen.getByTestId('education-shell-scroll')).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(container.querySelector('.min-h-dvh, .min-h-screen')).toBeNull();
  });

  it('the Suspense fallback is height-locked too', () => {
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/min-h-dvh|min-h-screen/);
    expect(src).toMatch(/h-dvh/);
  });
});
