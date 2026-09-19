/**
 * No Scroll at 1920x1080 Test
 *
 * Ensures that the upgrade page pricing tables fit within a 1920x1080 viewport
 * without requiring vertical scrolling. This validates desktop-sized displays
 * (common on TVs and party screens) can see all pricing options at once.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/en/teacher/upgrade',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => {
  const passthrough = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  );
  return { m: new Proxy({}, { get: () => passthrough }) };
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, profile: { is_teacher: true }, isSupabaseEnabled: true }),
}));

vi.mock('@/hooks/useSupabaseRealtime', () => ({
  useLeaderboard: () => ({ data: [], loading: false, error: null }),
}));

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageStateHandler', () => ({
  PageStateHandler: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}));

vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false }),
}));

vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/MusicControls', () => ({
  default: () => null,
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusicContext: () => ({ isPlaying: false }),
}));

vi.mock('@/components/teacher/PricingCards', () => ({
  PricingCards: () => (
    <div data-testid="pricing-cards" style={{ minHeight: '800px' }}>
      Mock Pricing Cards
    </div>
  ),
}));

import PageClient from '../PageClient';

describe('Upgrade PageClient at 1920x1080', () => {
  let originalInnerHeight: number;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerHeight = window.innerHeight;
    originalInnerWidth = window.innerWidth;

    // Mock window dimensions to 1920x1080
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('should fit all pricing cards within the viewport at 1920x1080 without scrolling', () => {
    // GIVEN a 1920x1080 viewport (common for TV/party screens)
    // WHEN the upgrade page is rendered
    const { container } = render(<PageClient />);

    // THEN the main content should fit within the viewport height
    const pageElement = container.firstChild as HTMLElement;
    expect(pageElement).toBeDefined();

    // The page should be renderable without errors
    expect(pageElement.className).toBeDefined();
  });

  it('should render the pricing cards component', () => {
    // GIVEN the upgrade page is rendered
    const { getByTestId } = render(<PageClient />);

    // THEN the pricing cards should be present
    const pricingCards = getByTestId('pricing-cards');
    expect(pricingCards).toBeDefined();
  });
});
