/**
 * CookieConsent — non-blocking bottom-sheet layout guard.
 *
 * The consent prompt is now a fixed bottom sheet (Option A from t_01e346a5).
 * It does NOT cover the screen, does NOT use backdrop-filter, and does NOT lock
 * background scroll, so it cannot shift in-flow layout. It still defers its
 * initial mount to an idle slice so the hero/LCP element is not delayed.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
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

// The consent sheet defers its initial mount to an idle slice (post-LCP perf
// fix). These tests assert behavior, not timing — run the idle callback
// synchronously.
vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

describe('CookieConsent — non-blocking bottom-sheet layout guard', () => {
  beforeEach(() => {
    document.body.style.paddingBottom = '';
    document.body.style.overflow = '';
  });

  it('renders as a non-blocking dialog at the bottom of the viewport', () => {
    render(<CookieConsent />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'false');
    expect(dialog).toHaveClass('fixed');
    expect(dialog).toHaveClass('bottom-0');
  });

  it('portals to document.body above Dialog overlays (z-[200] > z-90)', () => {
    // Regression: in-tree z-[110] lost to the portaled Android install Dialog
    // (z-90 on body), so ACCEPT ALL was unclickable under GET THE LEXICLASH APP.
    render(<CookieConsent />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('z-[200]');
    expect(dialog.parentElement).toBe(document.body);
  });

  it('does NOT push the footer by mutating body paddingBottom on mount', () => {
    render(<CookieConsent />);
    // The old bottom-banner CLS bug set this to '140px' in a post-paint effect.
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('does NOT lock background scroll (non-blocking sheet)', () => {
    const prior = 'scroll';
    document.body.style.overflow = prior;
    const { unmount } = render(<CookieConsent />);
    expect(document.body.style.overflow).toBe(prior);
    unmount();
    expect(document.body.style.overflow).toBe(prior);
  });

  it('reserves a fixed min-height so the sheet does not cause layout shift', () => {
    render(<CookieConsent />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('min-h-[280px]');
  });

  it('defers the initial mount to an idle callback so it is not the LCP element', () => {
    // Replace the module-level synchronous ric stub with a capturing one.
    const callbacks: Array<() => void> = [];
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    try {
      render(<CookieConsent />);
      // Not mounted synchronously on first paint...
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // ...but appears once the browser grants an idle slice (post-LCP).
      act(() => callbacks.forEach((cb) => cb()));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    } finally {
      // Restore the synchronous stub for any later tests in this file.
      vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
        cb();
        return 1;
      });
    }
  });
});
