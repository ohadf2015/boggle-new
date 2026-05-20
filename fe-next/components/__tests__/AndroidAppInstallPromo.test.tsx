import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AndroidAppInstallPromo from '../AndroidAppInstallPromo';

const captureMock = vi.fn();

vi.mock('posthog-js', () => ({ default: { capture: (...a: unknown[]) => captureMock(...a) } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

// Keep the pure gate + isAndroidBrowser real; stub only the environment probes.
vi.mock('@/utils/androidApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/androidApp')>();
  return {
    ...actual,
    isCapacitorNative: () => false,
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
  it('shows the promo after the delay on an Android web browser', async () => {
    render(<AndroidAppInstallPromo />);
    // Resolve the install probe + fire the delayed open.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByText('androidAppPromo.title')).toBeInTheDocument();
    expect(screen.getByText('androidAppPromo.install')).toBeInTheDocument();
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_shown');
    expect(sessionStorage.getItem('android_app_install_promo_shown')).toBe('1');
  });

  it('navigates to the Play Store and records dismissal on install click', async () => {
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByText('androidAppPromo.install'));
    expect(window.location.href).toBe(
      'https://play.google.com/store/apps/details?id=live.lexiclash.app'
    );
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_install_click');
    expect(localStorage.getItem('android_app_install_promo_dismissed_until')).toBeTruthy();
  });

  it('records a 14-day dismissal when the user taps "not now"', async () => {
    render(<AndroidAppInstallPromo />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByText('androidAppPromo.dismiss'));
    const until = parseInt(localStorage.getItem('android_app_install_promo_dismissed_until')!, 10);
    expect(until).toBeGreaterThan(Date.now() + 13 * 86_400_000);
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_dismissed');
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
});
