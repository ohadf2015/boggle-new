/**
 * CookieConsent — reduce height on mobile (390x844) without changing consent logic.
 *
 * UX audit 2026-09-14 (lexiclash.live): the compact bar measured ~350px and covered
 * PLAY NOW + the lower grid. Height reduction goals:
 * - Remove line-clamp on message to ensure policy link is always visible (informed consent)
 * - Reduce padding/gap on mobile
 * - Level all three buttons (Accept, Decline, Customize) to equal visual weight (border-3, text-sm)
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
  it('does NOT clamp message so policy link remains visible for informed consent', () => {
    render(<CookieConsent />);
    // Find the message by looking for the learn more link's parent paragraph
    const learnMoreLink = screen.getByRole('link', { name: 'cookieConsent.learnMore' });
    const message = learnMoreLink.closest('p');
    expect(message).not.toHaveClass('line-clamp-1');
    expect(message).not.toHaveClass('line-clamp-2');
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

  it('gives all three choices equal visual weight (border-3, text-sm)', () => {
    render(<CookieConsent />);
    const accept = screen.getByRole('button', { name: 'cookieConsent.accept' });
    const customize = screen.getByRole('button', { name: 'cookieConsent.customize' });
    const decline = screen.getByRole('button', { name: 'cookieConsent.decline' });

    // Accept: filled cyan, border-3, text-sm
    expect(accept).toHaveClass('bg-neo-cyan');
    expect(accept).toHaveClass('border-3');
    expect(accept).toHaveClass('text-sm');

    // Decline: border-3, text-sm (equal to Accept)
    expect(decline).toHaveClass('border-3');
    expect(decline).toHaveClass('text-sm');

    // Customize: now also border-3, text-sm (equal weight, but cyan outline for affordance)
    expect(customize).toHaveClass('border-3');
    expect(customize).toHaveClass('text-sm');
  });
});
