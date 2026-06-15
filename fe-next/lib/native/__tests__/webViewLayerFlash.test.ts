import { describe, it, expect, vi, afterEach } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { prefersStaticFullscreenOverlay } from '../webViewLayerFlash';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn() },
}));

// lib/** runs in the node environment (no DOM), so stub `window` explicitly.
const setEnv = (native: boolean, mobileViewport: boolean) => {
  (Capacitor.isNativePlatform as ReturnType<typeof vi.fn>).mockReturnValue(native);
  vi.stubGlobal('window', {
    matchMedia: vi.fn().mockReturnValue({ matches: mobileViewport }),
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('prefersStaticFullscreenOverlay', () => {
  it('is true on the native (Android WebView) app — fresh GPU layers flash white', () => {
    setEnv(true, false);
    expect(prefersStaticFullscreenOverlay()).toBe(true);
  });

  it('is true on a mobile viewport (same mobile-renderer quirk on web)', () => {
    setEnv(false, true);
    expect(prefersStaticFullscreenOverlay()).toBe(true);
  });

  it('is false on desktop web — animated overlays are safe there', () => {
    setEnv(false, false);
    expect(prefersStaticFullscreenOverlay()).toBe(false);
  });

  it('is false during SSR (no window)', () => {
    (Capacitor.isNativePlatform as ReturnType<typeof vi.fn>).mockReturnValue(true);
    vi.stubGlobal('window', undefined);
    expect(prefersStaticFullscreenOverlay()).toBe(false);
  });
});
