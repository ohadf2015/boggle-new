import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  withScope: (cb: (s: unknown) => void) => cb({ setLevel: vi.fn(), setTag: vi.fn(), setContext: vi.fn(), setFingerprint: vi.fn(), setTransactionName: vi.fn() }),
  captureMessage: (...a: unknown[]) => captureMessage(...a),
  captureException: vi.fn(),
}));

async function loadProdLogger() {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('LOG_LEVEL', 'silent');
  return (await import('../logger')).default;
}

describe('logger warn -> Sentry', () => {
  beforeEach(() => captureMessage.mockClear());

  it.each(['RATE_LIMIT', 'CLASSROOM_ECONOMY'])('does not open a Sentry issue for expected %s warnings', async (category) => {
    const logger = await loadProdLogger();
    logger.warn(category, 'Key abc exceeded limit (124/100)');
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('still reports other warnings and all errors', async () => {
    const logger = await loadProdLogger();
    logger.warn('SUPABASE', 'Failed to invalidate caches');
    logger.error('RATE_LIMIT', 'boom');
    expect(captureMessage).toHaveBeenCalledTimes(2);
  });

  it('does not open a Sentry issue for a classroom game with nothing to record', async () => {
    const logger = await loadProdLogger();
    logger.warn(
      'CLASSROOM_GAME',
      'Game GHYRVS ended with no participants to record (roster 0, scores 0) — 0 practice sessions written',
    );
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('still reports other classroom warnings', async () => {
    const logger = await loadProdLogger();
    logger.warn('CLASSROOM_GAME', 'Failed to release the persistence lock for GHYRVS: boom');
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });
});
