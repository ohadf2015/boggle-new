/**
 * The bottom sheet is explicitly non-blocking (aria-modal=false, no backdrop,
 * no scroll-lock — see CookieConsent.tsx header comment). It must not trap
 * keyboard focus either: a keyboard-only user must be able to keep tabbing
 * through the rest of the page while the sheet is open, same as a mouse user
 * can click through it. useFocusTrap is NOT mocked here so the real trap
 * behavior is exercised.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('CookieConsent — keyboard focus stays free (non-blocking sheet)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not steal focus into the sheet when it appears', () => {
    const outsideButton = document.createElement('button');
    outsideButton.textContent = 'outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    render(<CookieConsent />);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(document.activeElement).toBe(outsideButton);

    outsideButton.remove();
  });

  it('does not trap Tab inside the sheet', () => {
    render(<CookieConsent />);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const buttons = screen.getAllByRole('button');
    const last = buttons[buttons.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: 'Tab' });

    // No trap listener should redirect focus back to the first element.
    expect(document.activeElement).toBe(last);
  });
});
