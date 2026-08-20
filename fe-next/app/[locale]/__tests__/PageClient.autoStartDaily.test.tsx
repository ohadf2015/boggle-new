/**
 * PageClient — returning visitors auto-start today's daily puzzle (gauntlet-2).
 *
 * NYT's homepage IS the game; LexiClash's was a brochure. A returning visitor
 * (localStorage-seen-before: completed onboarding or a live Supabase session)
 * with no invite (?room=) and no QR arrival warps straight into today's Word
 * Hunt grid. New visitors keep the hero + FTUE untouched. Invite and QR
 * redirects both outrank the auto-start. `return_visit` still fires so the D1
 * retention funnel keeps measuring the very cohort this change targets.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';
import { trackGrowthEvent } from '@/utils/growthTracking';

const replaceMock = vi.fn();

vi.mock('@/components/landing', () => ({
  LandingView: () => <div data-testid="landing-view" />,
}));

vi.mock('next/dynamic', () => ({
  default: (_fn: unknown, _opts: unknown) =>
    () => <div data-testid="onboarding-flow" />,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
  trackInviteLanded: vi.fn(),
  trackInviteRedirectFired: vi.fn(),
}));

const setUrl = (search: string, pathname = '/en') => {
  Object.defineProperty(window, 'location', {
    value: { search, pathname, origin: 'http://localhost' },
    writable: true,
  });
};

describe('HomePageClient — daily auto-start for returning visitors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    setUrl('');
  });

  it('redirects a returning visitor straight into today\'s Word Hunt', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    expect(replaceMock).toHaveBeenCalledWith('/en/daily/word-hunt?from=autostart');
    // Alive feedback while the redirect resolves — no brochure flash.
    expect(screen.queryByTestId('landing-view')).not.toBeInTheDocument();
  });

  it('keeps the landing hero for NEW visitors (no redirect)', () => {
    render(<HomePageClient />);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
  });

  it('lets a live room invite (?room=) outrank the daily auto-start', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    setUrl('?room=ABC123');
    render(<HomePageClient />);
    expect(replaceMock).toHaveBeenCalledWith('/en/multiplayer?room=ABC123');
    expect(replaceMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/daily/word-hunt'),
    );
  });

  it('lets a QR-scan arrival outrank the daily auto-start', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    setUrl('?utm_source=barcode');
    render(<HomePageClient />);
    expect(replaceMock).toHaveBeenCalledWith('/en/daily?from=qr');
    expect(replaceMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/daily/word-hunt'),
    );
  });

  it('still fires return_visit (D1 retention terminal event) when auto-starting', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<HomePageClient />);
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'return_visit',
      expect.objectContaining({ auto_start_daily: true }),
    );
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'auto_start_daily',
      expect.objectContaining({ target: 'word_hunt' }),
    );
    // landing_view stays skipped on redirect, as with invite/QR hops.
    expect(trackGrowthEvent).not.toHaveBeenCalledWith(
      'landing_view',
      expect.anything(),
    );
  });

  it('does NOT redirect a JS-rendering crawler (SEO: bots index the landing)', () => {
    // Crawlers render with empty localStorage, so they read as new users — but
    // belt-and-braces: even if storage were seeded, isCrawler must hold the
    // landing. Here we just assert the empty-storage crawler stays put.
    const originalUA = window.navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      configurable: true,
    });
    try {
      render(<HomePageClient />);
      expect(replaceMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('landing-view')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: originalUA,
        configurable: true,
      });
    }
  });
});
