import { describe, it, expect } from 'vitest';
import { sentryRelease } from '../release';

describe('sentryRelease', () => {
  it('prefers explicit SENTRY_RELEASE', () => {
    expect(
      sentryRelease({
        SENTRY_RELEASE: 'explicit',
        NEXT_PUBLIC_SENTRY_RELEASE: 'public',
        RAILWAY_GIT_COMMIT_SHA: 'railway',
      }),
    ).toBe('explicit');
  });

  it('falls back to Railway git SHA when no explicit release', () => {
    expect(
      sentryRelease({
        RAILWAY_GIT_COMMIT_SHA: 'abc123def',
        VERCEL_GIT_COMMIT_SHA: 'vercel',
      }),
    ).toBe('abc123def');
  });

  it('returns undefined when nothing is set or values are blank', () => {
    expect(sentryRelease({})).toBeUndefined();
    expect(sentryRelease({ SENTRY_RELEASE: '  ' })).toBeUndefined();
  });
});
