import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AndroidAppInstallPromo from '../AndroidAppInstallPromo';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';

const captureMock = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => captureMock(...a) } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// exp-install-promo-after-first-game-v1 — mutable so a test can pick the bucket.
let mockPromoVariant: 'control' | 'after-first-game' = 'control';
const exposureMock = vi.fn();
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: mockPromoVariant, trackExposure: exposureMock }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
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
  mockPromoVariant = 'control';
  exposureMock.mockClear();
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

describe('exp-install-promo-after-first-game-v1', () => {
  // Native players are the whole AdMob pool and weekly activeUsers fell 68 -> 26.
  // Exposure is at an all-time high while 82% of promos are dismissed, so the
  // variant trades reach for intent: withhold the auto-popup until one game is done.
  const tapAndRun = async (ms: number) => {
    act(() => { fireEvent.pointerDown(window); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(ms); });
  };

  it('control shows the promo with zero completed games (behaviour unchanged)', async () => {
    mockPromoVariant = 'control';
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    await tapAndRun(12_000);
    expect(useAndroidInstallStore.getState().open).toBe(true);
  });

  it('variant withholds the promo while no game has been completed', async () => {
    mockPromoVariant = 'after-first-game';
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    await tapAndRun(12_000);
    expect(useAndroidInstallStore.getState().open).toBe(false);
  });

  // The whole point: a one-shot check would make "hasn't played yet at 12s" mean
  // "never sees the promo", which looks like a variant win but is a silent no-op.
  it('variant RE-ARMS and shows the promo once a game is completed', async () => {
    mockPromoVariant = 'after-first-game';
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    await tapAndRun(12_000);
    expect(useAndroidInstallStore.getState().open).toBe(false);

    localStorage.setItem('games_completed_count', '1');
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(useAndroidInstallStore.getState().open).toBe(true);
  });

  it('counts exposure only when a promo decision is actually reached', async () => {
    mockPromoVariant = 'after-first-game';
    render(<AndroidAppInstallPromo />);
    await act(async () => { await Promise.resolve(); });
    await tapAndRun(12_000);
    expect(exposureMock).not.toHaveBeenCalled();

    localStorage.setItem('games_completed_count', '1');
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(exposureMock).toHaveBeenCalled();
  });
});
