/**
 * Session-level guard for promotional overlays.
 *
 * Enforcement: ONE promotional overlay per session. Once any promo (install
 * modal, new modes announcement, etc.) is shown, others must not auto-open.
 *
 * State: sessionStorage key survives navigation within the session, but is
 * cleared on refresh or tab close (browser-defined session boundary).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  markPromoShown,
  wasPromoShownThisSession,
  clearPromoSessionFlag,
} from '../promoOverlaySession';

describe('promoOverlaySession', () => {
  beforeEach(() => {
    // Clear session before each test
    clearPromoSessionFlag();
  });

  afterEach(() => {
    clearPromoSessionFlag();
  });

  it('returns false if no promo has been shown', () => {
    expect(wasPromoShownThisSession()).toBe(false);
  });

  it('returns true after marking a promo as shown', () => {
    markPromoShown();
    expect(wasPromoShownThisSession()).toBe(true);
  });

  it('persists the flag across calls within the same session', () => {
    expect(wasPromoShownThisSession()).toBe(false);
    markPromoShown();
    expect(wasPromoShownThisSession()).toBe(true);
    expect(wasPromoShownThisSession()).toBe(true); // Still true
  });

  it('gracefully handles sessionStorage access failure', () => {
    // Simulate sessionStorage failure by making it throw
    const originalSetItem = sessionStorage.setItem;
    const originalGetItem = sessionStorage.getItem;
    sessionStorage.setItem = () => {
      throw new Error('sessionStorage is full');
    };
    sessionStorage.getItem = () => {
      throw new Error('sessionStorage access failed');
    };

    try {
      // Should not throw; fail-closed (assume shown when there's an error)
      markPromoShown(); // Should catch and continue
      expect(wasPromoShownThisSession()).toBe(true); // Error assumes shown
    } finally {
      sessionStorage.setItem = originalSetItem;
      sessionStorage.getItem = originalGetItem;
    }
  });
});
