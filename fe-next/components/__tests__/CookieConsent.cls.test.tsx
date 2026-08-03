/**
 * CookieConsent — blocking-modal layout guard.
 *
 * The consent prompt is a centered, screen-covering modal (not a bottom banner).
 * Being a `fixed inset-0` overlay it shifts nothing in document flow, so:
 *  - it must NEVER mutate body.style.paddingBottom (the old bottom-banner CLS
 *    offender that shoved the in-flow footer down), and
 *  - while open it locks background scroll via body.style.overflow, restoring
 *    the prior value on unmount so it never clobbers screen-fit's overflow.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: () => {} }));
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

// The consent modal defers its initial mount to an idle slice (post-LCP perf
// fix). These tests assert behavior, not timing — run the idle callback
// synchronously.
vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  cb();
  return 1;
});
vi.stubGlobal('cancelIdleCallback', () => {});

describe('CookieConsent — blocking-modal layout guard', () => {
  beforeEach(() => {
    document.body.style.paddingBottom = '';
    document.body.style.overflow = '';
  });

  it('renders as a blocking modal dialog', () => {
    render(<CookieConsent />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('does NOT push the footer by mutating body paddingBottom on mount', () => {
    render(<CookieConsent />);
    // The old bottom-banner CLS bug set this to '140px' in a post-paint effect.
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('locks background scroll while open and restores it on unmount', () => {
    const prior = 'scroll';
    document.body.style.overflow = prior;
    const { unmount } = render(<CookieConsent />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe(prior);
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
