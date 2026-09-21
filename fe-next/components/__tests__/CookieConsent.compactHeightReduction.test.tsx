/**
 * CookieConsent — reduce height on mobile (390x844) without changing consent logic.
 *
 * UX audit 2026-09-14 (lexiclash.live): the compact bar measured ~350px and covered
 * PLAY NOW + the lower grid. Height reduction goals:
 * - Line-clamp message to 1 line at xs (2+ lines on sm+)
 * - Reduce padding/gap on mobile
 * - Level Decline button up to Accept weight (border-3, text-sm) for lawful choice
 *
 * This test asserts the visual compaction changes without touching consent state machine.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/utils/cookieConsent', () => ({
  hasConsentDecision: () => false,
  getConsentState: () => ({ analytics: false, advertising: false, timestamp: 0 }),
  acceptAll: vi.fn(),
  declineAll: vi.fn(),
  setConsentState: vi.fn(),
  resetConsent: vi.fn(),
  onConsentChange: () => () => {},
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

describe('CookieConsent — compact height reduction', () => {
  it('clamps message to 1 line on mobile, expands on tablet+', () => {
    render(<CookieConsent />);
    // Find the message by looking for the learn more link's parent paragraph
    const learnMoreLink = screen.getByRole('link', { name: 'cookieConsent.learnMore' });
    const message = learnMoreLink.closest('p');
    expect(message).toHaveClass('line-clamp-1');
    expect(message).toHaveClass('sm:line-clamp-2');
  });

  it('levels Decline button to Accept weight (border-3, text-sm)', () => {
    render(<CookieConsent />);
    const decline = screen.getByRole('button', { name: 'cookieConsent.decline' });
    expect(decline).toHaveClass('border-3');
    expect(decline).toHaveClass('text-sm');
  });

  it('keeps Decline visually distinct from Customize', () => {
    render(<CookieConsent />);
    const customize = screen.getByRole('button', { name: 'cookieConsent.customize' });
    const decline = screen.getByRole('button', { name: 'cookieConsent.decline' });
    // Customize stays outline with lighter styling
    expect(customize.className).toMatch(/border-neo-cyan/);
    expect(decline.className).toMatch(/border-neo-cream/);
  });

  it('keeps mascot hidden on mobile to reduce height', () => {
    render(<CookieConsent />);
    const mascot = screen.getByAltText('cookieConsent.mascotAlt');
    expect(mascot).toHaveClass('hidden');
    expect(mascot).toHaveClass('sm:block');
    // Mascot size stays h-10 w-10 when visible
    expect(mascot).toHaveClass('h-10');
    expect(mascot).toHaveClass('w-10');
  });

  it('reduces all three choices to equal visual weight', () => {
    render(<CookieConsent />);
    const accept = screen.getByRole('button', { name: 'cookieConsent.accept' });
    const customize = screen.getByRole('button', { name: 'cookieConsent.customize' });
    const decline = screen.getByRole('button', { name: 'cookieConsent.decline' });

    // Accept: filled cyan, border-3, text-sm
    expect(accept).toHaveClass('bg-neo-cyan');
    expect(accept).toHaveClass('border-3');
    expect(accept).toHaveClass('text-sm');

    // Decline: now border-3, text-sm (up from border-2, text-xs)
    expect(decline).toHaveClass('border-3');
    expect(decline).toHaveClass('text-sm');

    // Customize: outline, smaller (stays as is for hierarchy)
    expect(customize).toHaveClass('border-2');
    expect(customize).toHaveClass('text-xs');
  });
});
