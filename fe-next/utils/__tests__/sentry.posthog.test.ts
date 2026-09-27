/**
 * @vitest-environment happy-dom
 *
 * PostHog forwarding backstop: when Sentry is dark (quota/spike-protection/DSN),
 * captured errors must still reach PostHog so error visibility never drops to zero.
 * Server path uses posthog-node (getPostHogServer); client path uses the already
 * initialized browser SDK (window.posthog) — no posthog-node import on the client.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const serverCapture = vi.fn();
const serverCaptureEvent = vi.fn();
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    captureException: serverCapture,
    capture: serverCaptureEvent,
  }),
}));

// Override the global Sentry mock with a complete scope (incl. setUser, which
// the shared vitest.setup.ts mock omits) so the userId code path doesn't throw.
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((cb: (s: unknown) => void) =>
    cb({ setTag: vi.fn(), setContext: vi.fn(), setUser: vi.fn() })
  ),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

import {
  captureError,
  captureApiError,
  captureSocketError,
  captureAIServiceError,
  captureBackgroundError,
  trackTelemetryEvent,
  __resetTelemetryThrottleForTests,
} from '@/utils/sentry';

const flush = () => new Promise((r) => setTimeout(r, 0));
const realWindow = (global as { window?: unknown }).window;

describe('PostHog error forwarding (Sentry-outage backstop)', () => {
  beforeEach(() => {
    serverCapture.mockClear();
    vi.stubEnv('NODE_ENV', 'production');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    (global as { window?: unknown }).window = realWindow;
  });

  describe('server (no window) → posthog-node', () => {
    beforeEach(() => {
      delete (global as { window?: unknown }).window;
    });

    it('captureApiError forwards to PostHog with route context + distinctId', async () => {
      const err = new Error('boom in route');
      captureApiError(err, '/api/coins', {
        method: 'POST',
        statusCode: 500,
        userId: 'user-1',
      });
      await flush();
      expect(serverCapture).toHaveBeenCalledTimes(1);
      const [fwdErr, distinctId, props] = serverCapture.mock.calls[0];
      expect(fwdErr).toBe(err);
      expect(distinctId).toBe('user-1');
      expect(props['error.type']).toBe('api_error');
      expect(props['api.route']).toBe('/api/coins');
    });

    it('captureSocketError forwards with socket context', async () => {
      const err = new Error('socket boom');
      captureSocketError(err, { event: 'submitWord', gameCode: 'ABCD' });
      await flush();
      expect(serverCapture).toHaveBeenCalledTimes(1);
      expect(serverCapture.mock.calls[0][2]['socket.event']).toBe('submitWord');
    });

    it('captureBackgroundError forwards with operation context', async () => {
      captureBackgroundError(new Error('sync boom'), {
        operation: 'sync',
        service: 'redis',
        userId: 'u2',
      });
      await flush();
      expect(serverCapture).toHaveBeenCalledTimes(1);
      expect(serverCapture.mock.calls[0][1]).toBe('u2');
    });

    it('does NOT forward expected errors (rate limit)', async () => {
      captureApiError(new Error('rate limit exceeded'), '/api/x');
      await flush();
      expect(serverCapture).not.toHaveBeenCalled();
    });

    it('does NOT forward AI rate-limited errors', async () => {
      captureAIServiceError(new Error('quota'), {
        operation: 'generate',
        isRateLimited: true,
      });
      await flush();
      expect(serverCapture).not.toHaveBeenCalled();
    });

    it('does NOT forward when NODE_ENV !== production', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      captureApiError(new Error('dev'), '/api/x');
      await flush();
      expect(serverCapture).not.toHaveBeenCalled();
    });
  });

  describe('client (window present) → browser SDK', () => {
    it('captureError uses window.posthog, not posthog-node', async () => {
      const browserCapture = vi.fn();
      (global.window as unknown as { posthog?: unknown }).posthog = {
        captureException: browserCapture,
      };
      const err = new Error('client boom');
      captureError(err, { feature: 'wheel' });
      await flush();
      expect(browserCapture).toHaveBeenCalledTimes(1);
      expect(browserCapture.mock.calls[0][0]).toBe(err);
      expect(serverCapture).not.toHaveBeenCalled();
    });

    it('does not throw when window.posthog is absent', async () => {
      delete (global.window as unknown as { posthog?: unknown }).posthog;
      expect(() => captureError(new Error('no sdk'))).not.toThrow();
      await flush();
      expect(serverCapture).not.toHaveBeenCalled();
    });
  });
});

describe('trackTelemetryEvent (custom traceable events, e.g. translation_missing)', () => {
  beforeEach(() => {
    __resetTelemetryThrottleForTests();
    serverCaptureEvent.mockClear();
    serverCapture.mockClear();
    vi.stubEnv('NODE_ENV', 'production');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    (global as { window?: unknown }).window = realWindow;
  });

  it('client: emits a named PostHog event with properties', async () => {
    const capture = vi.fn();
    (global.window as unknown as { posthog?: unknown }).posthog = { capture };
    trackTelemetryEvent('translation_missing', { key: 'home.cta', language: 'he' });
    await flush();
    expect(capture).toHaveBeenCalledWith('translation_missing', {
      key: 'home.cta',
      language: 'he',
    });
  });

  it('dedupes repeated identical events (flood guard)', async () => {
    const capture = vi.fn();
    (global.window as unknown as { posthog?: unknown }).posthog = { capture };
    trackTelemetryEvent('translation_missing', { key: 'a', language: 'en' });
    trackTelemetryEvent('translation_missing', { key: 'a', language: 'en' });
    trackTelemetryEvent('translation_missing', { key: 'b', language: 'en' });
    await flush();
    expect(capture).toHaveBeenCalledTimes(2); // 'a' once, 'b' once
  });

  it('server: routes through posthog-node capture()', async () => {
    delete (global as { window?: unknown }).window;
    trackTelemetryEvent('translation_missing', { key: 'x', language: 'sv' }, 'user-9');
    await flush();
    expect(serverCaptureEvent).toHaveBeenCalledTimes(1);
    const arg = serverCaptureEvent.mock.calls[0][0];
    expect(arg.event).toBe('translation_missing');
    expect(arg.distinctId).toBe('user-9');
    expect(arg.properties).toMatchObject({ key: 'x', language: 'sv' });
  });

  it('does not emit outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const capture = vi.fn();
    (global.window as unknown as { posthog?: unknown }).posthog = { capture };
    trackTelemetryEvent('translation_missing', { key: 'z', language: 'en' });
    await flush();
    expect(capture).not.toHaveBeenCalled();
  });
});
