import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AndroidAppInstallPromo from '../AndroidAppInstallPromo';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';

const captureMock = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => captureMock(...a) } }));
let mockPath = '/';
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
// Default: consent already decided so existing auto-popup tests keep firing.
// Flip to false in the cookie-gating regression below.
let mockHasConsentDecision = true;
vi.mock('@/utils/cookieConsent', () => ({
  hasConsentDecision: () => mockHasConsentDecision,
}));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

// Mutable so a test can flip the Capacitor bridge on AFTER mount, reproducing
// the remote-URL WebView race. (Name must be `mock*` to survive vi.mock hoisting.)
let mockNative = false;

// Keep the pure gate + isAndroidBrowser real; stub only the environment probes.
vi.mock('@/utils/androidApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/androidApp')>();
  return {
    ...actual,
    isCapacitorNative: () => mockNative,
    isStandaloneDisplay: () => false,
    hasLexiClashInstalled: () => Promise.resolve(false),
  };
});

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
  captureMock.mockClear();
  localStorage.clear();
  sessionStorage.clear();
  useAndroidInstallStore.setState({ open: false, source: 'auto_popup', pillVisible: false });
  mockNative = false;
  mockPath = '/';
  mockHasConsentDecision = true;
  resetOverlayQuietZoneForTests();
  // Default: one game finished earlier in this session, the only time the auto-popup may open.
  sessionStorage.setItem('games_completed_at_session_start', '0');
  localStorage.setItem('games_completed_count', '1');
  setUA(ANDROID_UA);
  Object.defineProperty(window, 'location', {
    value: { href: 'https://www.lexiclash.live/' },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AndroidAppInstallPromo', () => {
  // The auto-popup countdown is interaction-gated (LCP guard): it only arms
  // after the visitor's first pointerdown/keydown. Tests simulate the tap.
  const tap = () => {
    act(() => {
      fireEvent.pointerDown(window);
    });
  };

  it('shows the promo after the delay on an Android web browser', async () => {
    render(<AndroidAppInstallPromo />);
    // Resolve the install probe + arm the interaction listener.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    tap();
    // Fire the delayed open.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByText('androidAppPromo.title')).toBeInTheDocument();
    expect(screen.getByText('androidAppPromo.install')).toBeInTheDocument();
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_shown', { source: 'auto_popup' });
    expect(sessionStorage.getItem('android_app_install_promo_shown')).toBe('1');
  });

  it('navigates to the Play Store (with install referrer) and records dismissal on install click', async () => {
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    tap();
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByText('androidAppPromo.install'));
    expect(window.location.href).toContain(
      'https://play.google.com/store/apps/details?id=live.lexiclash.app'
    );
    expect(window.location.href).toContain('referrer=');
    expect(window.location.href).toContain('utm_campaign');
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_install_click', {
      source: 'auto_popup',
    });
    expect(localStorage.getItem('android_app_install_promo_dismissed_until')).toBeTruthy();
  });

  describe('install route by device', () => {
    const setDesktop = (desktop: boolean) => {
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: desktop, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    };
    afterEach(() => vi.unstubAllGlobals());

    it('offers a QR code that opens the Play listing on desktop', () => {
      setDesktop(true);
      render(<AndroidAppInstallPromo />);
      act(() => useAndroidInstallStore.getState().openPromo('menu'));
      const qr = screen.getByRole('img', { name: 'androidAppPromo.qrAlt' });
      expect(qr.getAttribute('data-qr-value')).toContain('id=live.lexiclash.app');
      expect(qr.getAttribute('data-qr-value')).toContain('install_qr');
      expect(screen.getByText('androidAppPromo.qrTitle')).toBeInTheDocument();
      expect(screen.getByText('androidAppPromo.install')).toBeInTheDocument();
    });

    it('keeps the QR code off phones, where the store button is the route', () => {
      setDesktop(false);
      render(<AndroidAppInstallPromo />);
      act(() => useAndroidInstallStore.getState().openPromo('menu'));
      expect(screen.getByText('androidAppPromo.install')).toBeInTheDocument();
      expect(screen.queryByText('androidAppPromo.qrTitle')).not.toBeInTheDocument();
    });
  });

  it('records a 14-day dismissal and collapses to the session pill on "not now"', async () => {
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    tap();
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByText('androidAppPromo.dismiss'));
    const until = parseInt(localStorage.getItem('android_app_install_promo_dismissed_until')!, 10);
    expect(until).toBeGreaterThan(Date.now() + 13 * 86_400_000);
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_dismissed', {
      source: 'auto_popup',
    });
    // Dismissing the popup leaves a re-entry pill rather than total silence.
    expect(useAndroidInstallStore.getState().pillVisible).toBe(true);
  });

  it('reopens via a re-entry surface even after the auto-popup was dismissed', async () => {
    // Simulate the 14-day cooldown being armed (auto-popup would stay silent)…
    localStorage.setItem(
      'android_app_install_promo_dismissed_until',
      String(Date.now() + 14 * 86_400_000)
    );
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    // …auto-popup stays hidden…
    expect(screen.queryByText('androidAppPromo.title')).not.toBeInTheDocument();
    // …but a user-initiated surface (menu/pill) can still open it.
    act(() => useAndroidInstallStore.getState().openPromo('menu'));
    expect(screen.getByText('androidAppPromo.title')).toBeInTheDocument();
    expect(useAndroidInstallStore.getState().source).toBe('menu');
  });

  it('stays hidden when already shown this session', async () => {
    sessionStorage.setItem('android_app_install_promo_shown', '1');
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.queryByText('androidAppPromo.title')).not.toBeInTheDocument();
  });

  it('stays hidden inside the native Capacitor app (UA is a WebView)', async () => {
    setUA(
      'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
    );
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.queryByText('androidAppPromo.title')).not.toBeInTheDocument();
  });

  it('does not open on native when the Capacitor bridge registers after mount', async () => {
    // Remote-URL WebView race: the bridge is absent at mount (looks like web),
    // so the countdown arms — but it registers before the delay elapses. The
    // fire-time re-check must catch it so the popup never opens in the app.
    mockNative = false;
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    tap();
    // Bridge finishes registering during the show delay.
    mockNative = true;
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.queryByText('androidAppPromo.title')).not.toBeInTheDocument();
    expect(captureMock).not.toHaveBeenCalledWith('android_install_promo_shown', {
      source: 'auto_popup',
    });
  });

  it('withholds the auto-popup while cookie consent is still pending', async () => {
    // Same re-arm loop as the engagement variant — advance by SHOW_DELAY_MS,
    // never runAllTimersAsync (that would chase the infinite re-arm forever).
    mockHasConsentDecision = false;
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    act(() => { fireEvent.pointerDown(window); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(useAndroidInstallStore.getState().open).toBe(false);
    // After the visitor decides, the next re-arm cycle should fire the promo.
    mockHasConsentDecision = true;
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(useAndroidInstallStore.getState().open).toBe(true);
  });

  it('LCP guard: never opens for a passive visitor, opens after first interaction', async () => {
    render(<AndroidAppInstallPromo />);
    // Probe resolves and the full delay elapses with no interaction — the
    // countdown never arms, so no popup (this is the PSI/Lighthouse visitor).
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.queryByText('androidAppPromo.title')).not.toBeInTheDocument();
    // First tap arms the countdown; the popup opens after the delay.
    tap();
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByText('androidAppPromo.title')).toBeInTheDocument();
  });
});

describe('auto-popup waits for a game finished this session', () => {
  // The re-arm loop never ends while the gate fails: advance by SHOW_DELAY_MS,
  // never runAllTimersAsync.
  const tapAndRun = async (ms: number) => {
    act(() => { fireEvent.pointerDown(window); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(ms); });
  };

  it('stays closed for a returning player who has not finished a game yet, then opens after one', async () => {
    sessionStorage.removeItem('games_completed_at_session_start');
    localStorage.setItem('games_completed_count', '7');
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    await tapAndRun(12_000);
    expect(useAndroidInstallStore.getState().open).toBe(false);

    localStorage.setItem('games_completed_count', '8');
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(useAndroidInstallStore.getState().open).toBe(true);
  });

  it.each(['/en/word-craft', '/en/multiplayer', '/en/daily'])('never opens on a play route (%s)', async (path) => {
    mockPath = path;
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    await tapAndRun(12_000);
    await act(async () => { vi.advanceTimersByTime(36_000); });
    expect(useAndroidInstallStore.getState().open).toBe(false);
  });

  it('withholds the auto-popup inside the overlay quiet zone, and re-arms after it', async () => {
    // The round-end recap and projector results live on /multiplayer-adjacent
    // surfaces with no body class; the quiet zone is raised by the surface itself.
    const release = claimOverlayQuietZone('classroom-results');
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    await tapAndRun(12_000);
    expect(useAndroidInstallStore.getState().open).toBe(false);

    release();
    await act(async () => { vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100); });
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(useAndroidInstallStore.getState().open).toBe(true);
  });
});
