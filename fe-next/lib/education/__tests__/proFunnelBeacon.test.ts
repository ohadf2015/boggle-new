/**
 * Durable fallback beacon for Teacher Pro funnel events (brain P0 38ac1a51):
 * key detection, loud once-per-session reporting, never-throw transport.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  PRO_FUNNEL_BEACON_PATH,
  beaconProFunnelEvent,
  hasClientPostHogKey,
  reportMissingClientKey,
  _resetProFunnelBeacon,
} from '../proFunnelBeacon';

const KEY_ENV = 'NEXT_PUBLIC_POSTHOG_KEY';

describe('hasClientPostHogKey', () => {
  const original = process.env[KEY_ENV];
  afterEach(() => {
    if (original === undefined) delete process.env[KEY_ENV];
    else process.env[KEY_ENV] = original;
  });

  it('is false when the bundle was built without the key', () => {
    delete process.env[KEY_ENV];
    expect(hasClientPostHogKey()).toBe(false);
  });

  it('is true when the key is present', () => {
    process.env[KEY_ENV] = 'phc_test';
    expect(hasClientPostHogKey()).toBe(true);
  });
});

describe('beaconProFunnelEvent', () => {
  beforeEach(() => _resetProFunnelBeacon());

  it('POSTs the event to the beacon endpoint with keepalive (survives a checkout redirect unload)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    try {
      beaconProFunnelEvent('trial_cta_view', { source: 'upgrade_page' });
      expect(fetchSpy).toHaveBeenCalledWith(
        PRO_FUNNEL_BEACON_PATH,
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
          credentials: 'same-origin',
        }),
      );
      const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
      expect(body).toEqual({ event: 'trial_cta_view', props: { source: 'upgrade_page' } });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('never throws when fetch rejects', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    try {
      expect(() => beaconProFunnelEvent('trial_cta_tap', { source: 'upgrade_page' })).not.toThrow();
      // let the rejection handler run
      await Promise.resolve();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('never throws when fetch itself throws synchronously', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('no fetch');
    });
    try {
      expect(() => beaconProFunnelEvent('trial_cta_tap', {})).not.toThrow();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('reportMissingClientKey', () => {
  beforeEach(() => _resetProFunnelBeacon());

  it('logs a loud console.error AND beacons the sentinel event — once per session', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    try {
      reportMissingClientKey('proFunnelTelemetry');
      reportMissingClientKey('proFunnelTelemetry');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0][0])).toContain('NEXT_PUBLIC_POSTHOG_KEY');
      const sentinelCalls = fetchSpy.mock.calls.filter((c) =>
        String(c[1]?.body).includes('edu_pro_telemetry_client_key_missing'),
      );
      expect(sentinelCalls).toHaveLength(1);
      const body = JSON.parse(String(sentinelCalls[0][1]?.body));
      expect(body.props.surface).toBe('proFunnelTelemetry');
    } finally {
      errorSpy.mockRestore();
      fetchSpy.mockRestore();
    }
  });
});
