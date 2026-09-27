/**
 * Logger error-serialization tests
 *
 * Regression guard for the "{}" symptom: callers overwhelmingly use the
 * pattern `logger.error('some message:', err)` where the Error is NOT the
 * first argument. The production Sentry path must still capture the Error
 * (with its stack) via captureException instead of JSON.stringify-ing it
 * into "{}" and dropping it through captureMessage.
 */

import { vi, describe, it, expect, afterEach } from 'vitest';

const { captureException, captureMessage } = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

// Sentry capture is fire-and-forget async (lazy SDK load through several
// dynamic-import rounds). A fixed setTimeout-round flush is NOT enough — the
// import chain can take an arbitrary number of macrotasks under load, which
// both starves the positive assertion AND leaks the late capture into the
// NEXT test's cleared mocks ("expected 1, got 2"). Instead: vi.waitFor the
// positive assertion. Because logger.error/warn fire exactly ONE capture per
// call and both captureException/captureMessage ride the same
// loadSentry().then() chain, once the expected capture has fired the chain
// is settled — a negative assertion on the other mock is then race-free.
const waitForCapture = (fn: () => void) =>
  vi.waitFor(fn, { timeout: 5000, interval: 20 });

async function loadLoggerInProduction() {
  vi.resetModules();
  captureException.mockClear();
  captureMessage.mockClear();
  // logger reads NODE_ENV at module-eval time, so set it before importing.
  (process.env as Record<string, string>).NODE_ENV = 'production';
  const mod = await import('../logger');
  return mod.default;
}

describe('logger error serialization (production)', () => {
  afterEach(() => {
    (process.env as Record<string, string>).NODE_ENV = ORIGINAL_NODE_ENV ?? 'test';
  });

  it('captures the Error via captureException when it is NOT the first argument', async () => {
    const logger = await loadLoggerInProduction();
    const realError = new Error('boom: real cause with stack');

    logger.error('useChurnSignals: failed to report signals', realError);

    await waitForCapture(() => expect(captureException).toHaveBeenCalledTimes(1));

    // The actual Error object must reach Sentry so the stack/grouping survive.
    expect(captureException.mock.calls[0][0]).toBe(realError);

    // It must NOT be funnelled through captureMessage as "... {}".
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('includes the leading string message as context when capturing an Error', async () => {
    const logger = await loadLoggerInProduction();
    const realError = new Error('network down');

    logger.error('Auth callback exception:', realError);

    await waitForCapture(() => expect(captureException).toHaveBeenCalledTimes(1));

    const [errArg, options] = captureException.mock.calls[0] as [unknown, Record<string, any>];
    expect(errArg).toBe(realError);
    const contextValues = JSON.stringify(options?.contexts ?? {});
    expect(contextValues).toContain('Auth callback exception:');
  });

  it('still uses captureMessage when no Error object is present', async () => {
    const logger = await loadLoggerInProduction();

    logger.error('plain message', { code: 42 });

    await waitForCapture(() => expect(captureMessage).toHaveBeenCalledTimes(1));

    expect(captureException).not.toHaveBeenCalled();
  });

  it('captures the Error even when it is the first argument (existing behavior preserved)', async () => {
    const logger = await loadLoggerInProduction();
    const realError = new Error('first-arg error');

    logger.error(realError, 'extra context');

    await waitForCapture(() => expect(captureException).toHaveBeenCalledTimes(1));

    expect(captureException.mock.calls[0][0]).toBe(realError);
    expect(captureMessage).not.toHaveBeenCalled();
  });
});

describe('logger warn serialization (production)', () => {
  afterEach(() => {
    (process.env as Record<string, string>).NODE_ENV = ORIGINAL_NODE_ENV ?? 'test';
  });

  it('captures an Error passed to warn via captureException at warning level (not "{}")', async () => {
    const logger = await loadLoggerInProduction();
    const realError = new Error('leaderboard sync failed');

    logger.warn('[useLeaderboardSync] Failed to sync leaderboard:', realError);

    await waitForCapture(() => expect(captureException).toHaveBeenCalledTimes(1));

    expect(captureException.mock.calls[0][0]).toBe(realError);
    // level should be downgraded to warning
    const options = captureException.mock.calls[0][1] as Record<string, any>;
    expect(options?.level).toBe('warning');
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('still uses captureMessage for warn when no Error object is present', async () => {
    const logger = await loadLoggerInProduction();

    logger.warn('plain warning', { detail: true });

    await waitForCapture(() => expect(captureMessage).toHaveBeenCalledTimes(1));

    expect(captureException).not.toHaveBeenCalled();
  });
});
