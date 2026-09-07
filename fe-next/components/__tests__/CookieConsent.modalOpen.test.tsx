/**
 * CookieConsent — must yield the screen to an open modal.
 *
 * Live bug (1440x900, /en and /en/education): the consent sheet portals to
 * <body> at z-[200] and is `min-h-[280px] max-h-[60vh]` anchored to the bottom,
 * so on a short viewport it occupies the MIDDLE of the screen. Every modal
 * renders below it (AuthModal is z-[100], the shared Dialog is z-90), so the
 * sheet's own `<p class="mb-4 text-center">` sat exactly over the auth modal's
 * "Use password instead" / "Already a member? Sign in" links and ate the click.
 *
 * `html.modal-open` is the existing ref-counted "a modal owns the screen" flag
 * (lib/native/modalOpenSignal); AuthModal and the shared Dialog both set it.
 * The sheet must stand down while it is set, and come back when it clears —
 * consent is still required, just not on top of a modal.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CookieConsent from '../CookieConsent';
import { MODAL_OPEN_CLASS } from '@/lib/native/modalOpenSignal';

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

describe('CookieConsent — yields to an open modal', () => {
  beforeEach(() => {
    document.documentElement.classList.remove(MODAL_OPEN_CLASS);
  });
  afterEach(() => {
    document.documentElement.classList.remove(MODAL_OPEN_CLASS);
  });

  it('does not render while a modal owns the screen', () => {
    document.documentElement.classList.add(MODAL_OPEN_CLASS);
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stands down when a modal opens after it, and returns when the modal closes', async () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      document.documentElement.classList.add(MODAL_OPEN_CLASS);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    act(() => {
      document.documentElement.classList.remove(MODAL_OPEN_CLASS);
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('releases the reserved bottom-sheet height while it is stood down', async () => {
    render(<CookieConsent />);
    expect(document.documentElement.classList.contains('has-cookie-consent')).toBe(true);

    act(() => {
      document.documentElement.classList.add(MODAL_OPEN_CLASS);
    });
    await waitFor(() => {
      expect(document.documentElement.classList.contains('has-cookie-consent')).toBe(false);
    });
  });
});
