import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRumBeaconScript } from '../rumBeaconScript';

/**
 * `page_cold_start` is a once-per-device-per-day signal, but the inline script
 * re-runs on every full document load — reload, back/forward, and the
 * CHUNK_BOOT_GUARD self-heal reload all count. 374,025 events / 28d (40x the
 * next event, up to 14 per user per day) made every volume-based denominator
 * unusable. A per-session guard still let new tabs / PWA relaunches / native
 * WebView restarts average ~1.7 events per user per day, so the dedupe bucket
 * is now the UTC day in localStorage.
 */

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
  };
}

const sendBeacon = vi.fn(() => true);

function runBeacon() {
  new Function(getRumBeaconScript('SE', 'phc_test'))();
}

beforeEach(() => {
  sendBeacon.mockClear();
  vi.stubGlobal('sessionStorage', memStorage());
  vi.stubGlobal('localStorage', memStorage());
  vi.stubGlobal('navigator', { sendBeacon });
  vi.stubGlobal('location', { pathname: '/daily', hostname: 'lexiclash.live', href: 'https://lexiclash.live/daily' });
  vi.stubGlobal('performance', { getEntriesByType: () => [{ responseStart: 123.4 }] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getRumBeaconScript', () => {
  it('sends the beacon on the first run of a session', () => {
    runBeacon();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('does not send again on a reload within the same session', () => {
    runBeacon();
    runBeacon();
    runBeacon();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('does not send again in a new session the same day', () => {
    runBeacon();
    // New tab / PWA relaunch / WebView restart: sessionStorage is gone,
    // localStorage survives.
    vi.stubGlobal('sessionStorage', memStorage());
    runBeacon();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('sends again on a new day', () => {
    // Simulate a device whose last beacon went out yesterday.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const local = memStorage();
    local.setItem('lc_rum_day', yesterday);
    vi.stubGlobal('localStorage', local);
    runBeacon();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('falls back to per-session dedupe when localStorage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', blocked);
    runBeacon();
    runBeacon();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('still installs the lander CTA listener when the cold start already fired today', () => {
    const local = memStorage();
    local.setItem('lc_rum_day', new Date().toISOString().slice(0, 10));
    vi.stubGlobal('localStorage', local);
    const listeners: Array<(ev: { target: unknown }) => void> = [];
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      addEventListener: (_type: string, fn: (ev: { target: unknown }) => void) => listeners.push(fn),
    });
    vi.stubGlobal('location', {
      pathname: '/he/education',
      hostname: 'lexiclash.live',
      href: 'https://lexiclash.live/he/education?utm_source=fb&utm_medium=paid&utm_campaign=52619629920784',
      search: '?utm_source=fb&utm_medium=paid&utm_campaign=52619629920784',
    });
    runBeacon();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(listeners).toHaveLength(1);
    listeners[0]({
      target: { nodeType: 1, closest: () => ({ getAttribute: () => 'signup' }) },
    });
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const blob = sendBeacon.mock.calls[0][1] as Blob;
    expect(blob).toBeInstanceOf(Blob);
  });

  it('still sends when storage is unavailable', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('sessionStorage', blocked);
    vi.stubGlobal('localStorage', blocked);
    runBeacon();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });
});
