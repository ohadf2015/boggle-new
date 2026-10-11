import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRumBeaconScript } from '../rumBeaconScript';

/**
 * `page_cold_start` is a once-per-session signal, but the inline script re-runs on
 * every full document load — reload, back/forward, and the CHUNK_BOOT_GUARD self-heal
 * reload all count. 374,025 events / 28d (40x the next event, up to 14 per user per
 * day) made every volume-based denominator unusable.
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

  it('sends again in a new session', () => {
    runBeacon();
    vi.stubGlobal('sessionStorage', memStorage());
    runBeacon();
    expect(sendBeacon).toHaveBeenCalledTimes(2);
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
