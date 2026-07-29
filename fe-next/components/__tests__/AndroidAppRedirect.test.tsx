import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AndroidAppRedirect from '../AndroidAppRedirect';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const ANDROID_WEBVIEW_UA =
  'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36';

function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

function setLocation(href: string) {
  const url = new URL(href);
  Object.defineProperty(window, 'location', {
    value: {
      host: url.host,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      href,
    },
    configurable: true,
    writable: true,
  });
}

function mockInstalledRelatedApps(apps: Array<{ platform: string; id?: string; url?: string }>) {
  Object.defineProperty(navigator, 'getInstalledRelatedApps', {
    value: vi.fn().mockResolvedValue(apps),
    configurable: true,
  });
}

describe('AndroidAppRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setLocation('https://www.lexiclash.live/play?x=1');
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as { getInstalledRelatedApps?: unknown }).getInstalledRelatedApps;
  });

  it('redirects to intent:// only when installed app detected', async () => {
    setUA(ANDROID_UA);
    mockInstalledRelatedApps([{ platform: 'play', id: 'live.lexiclash.app' }]);
    render(<AndroidAppRedirect />);
    await waitFor(() => {
      expect(window.location.href).toMatch(/^intent:\/\/www\.lexiclash\.live\/play\?x=1#Intent;/);
    });
    expect(window.location.href).toContain('package=live.lexiclash.app');
    expect(window.location.href).toContain(
      `S.browser_fallback_url=${encodeURIComponent('https://www.lexiclash.live/play?x=1')}`,
    );
  });

  it('does nothing when app not installed', async () => {
    setUA(ANDROID_UA);
    mockInstalledRelatedApps([]);
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
  });

  it('does nothing when getInstalledRelatedApps unavailable', async () => {
    setUA(ANDROID_UA);
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
  });

  it('skips iOS', async () => {
    setUA(IOS_UA);
    mockInstalledRelatedApps([{ platform: 'play', id: 'live.lexiclash.app' }]);
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
  });

  it('skips Android WebView (Capacitor host)', async () => {
    setUA(ANDROID_WEBVIEW_UA);
    mockInstalledRelatedApps([{ platform: 'play', id: 'live.lexiclash.app' }]);
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
  });

  it('skips when Capacitor.isNativePlatform() true', async () => {
    setUA(ANDROID_UA);
    mockInstalledRelatedApps([{ platform: 'play', id: 'live.lexiclash.app' }]);
    (window as unknown as { Capacitor: unknown }).Capacitor = { isNativePlatform: () => true };
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it('skips when dismissed within 7d window', async () => {
    setUA(ANDROID_UA);
    mockInstalledRelatedApps([{ platform: 'play', id: 'live.lexiclash.app' }]);
    localStorage.setItem('android_app_redirect_dismissed_until', String(Date.now() + 86_400_000));
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
  });

  it('skips when session flag set (prevents loop)', async () => {
    setUA(ANDROID_UA);
    mockInstalledRelatedApps([{ platform: 'play', id: 'live.lexiclash.app' }]);
    sessionStorage.setItem('android_app_redirect_tried', '1');
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
  });

  it('skips when running as installed PWA (standalone)', async () => {
    setUA(ANDROID_UA);
    mockInstalledRelatedApps([{ platform: 'play', id: 'live.lexiclash.app' }]);
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<AndroidAppRedirect />);
    await new Promise((r) => setTimeout(r, 10));
    expect(window.location.href).toBe('https://www.lexiclash.live/play?x=1');
  });
});
