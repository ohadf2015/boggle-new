/**
 * Teacher Pro funnel — durable fallback when the client PostHog key is absent.
 *
 * WHY THIS EXISTS
 * ---------------
 * `lazyPosthog` buffers every pre-init `capture()` in a bounded queue and only
 * flushes it into posthog-js when `init()` runs. `PostHogProvider` guards
 * `init()` on `NEXT_PUBLIC_POSTHOG_KEY`, which Next.js bakes into the client
 * bundle at BUILD time. When the key never reached the build (Railway build-arg
 * forwarding gap), the guard silently skips init, the queue fills to MAX_QUEUE,
 * and the oldest events are dropped — invisibly. That is how
 * `checkout_return_landed` went dark in production while the server-side
 * `checkout_started` kept firing (brain P0s 7dcdeba8 / 38ac1a51, 2026-10-28:
 * 8-9 Polar starts, real returns happening, 0-1 return events in PostHog).
 *
 * The fix has two halves:
 *  - LOUD: the first event that finds no client key logs a console.error and
 *    beacons a sentinel event (`edu_pro_telemetry_client_key_missing`), so the
 *    gap shows up in PostHog itself instead of only in a log nobody reads.
 *  - DURABLE: the event itself is beaconed to /api/education/pro-funnel-beacon,
 *    which re-emits it server-side through captureEduServerEvents ($host
 *    stamped), so the funnel step survives a dead client key.
 *
 * Never throws — telemetry must never break the money path.
 */

/** Where the durable fallback lands. Server route: app/api/education/pro-funnel-beacon. */
export const PRO_FUNNEL_BEACON_PATH = '/api/education/pro-funnel-beacon';

/**
 * The client key is inlined at build time, so this is a STATIC property of the
 * deployed bundle — reading process.env here is reading the build, not a
 * runtime secret. In tests it is a live env var.
 */
export function hasClientPostHogKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/**
 * Best-effort server fallback for one funnel event. Uses keepalive so a send
 * fired during a checkout redirect still leaves the page. Never throws.
 */
export function beaconProFunnelEvent(event: string, props: Record<string, unknown>): void {
  try {
    if (typeof fetch !== 'function') return;
    void fetch(PRO_FUNNEL_BEACON_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props }),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {
      /* best effort — the beacon must never break a checkout */
    });
  } catch {
    /* best effort */
  }
}

let missingKeyReported = false;

/**
 * Loud, once per session: the silent queue-fill was the actual bug, so the
 * no-key state now announces itself in the console AND in PostHog (via the
 * server-side beacon, which does not depend on the client key).
 */
export function reportMissingClientKey(surface: string): void {
  if (missingKeyReported) return;
  missingKeyReported = true;
  try {
     
    console.error(
      `[proFunnelBeacon] NEXT_PUBLIC_POSTHOG_KEY missing from the client bundle (surface: ${surface}) — ` +
        'posthog.init() is guarded on it, so every queued capture would be silently dropped. ' +
        'Falling back to the server beacon for Teacher Pro funnel events.',
    );
  } catch {
    /* a console that throws must not break telemetry */
  }
  beaconProFunnelEvent('edu_pro_telemetry_client_key_missing', { surface });
}

/** @internal test-only reset of the once-per-session report latch. */
export function _resetProFunnelBeacon(): void {
  missingKeyReported = false;
}
