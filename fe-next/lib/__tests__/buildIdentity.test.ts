import { afterEach, describe, expect, it } from 'vitest';
import { deployHealthPayload, runningCommitSha } from '../buildIdentity';

const SHA_KEYS = [
  'RAILWAY_GIT_COMMIT_SHA',
  'SOURCE_COMMIT',
  'GIT_COMMIT',
  'VERCEL_GIT_COMMIT_SHA',
  'COMMIT_SHA',
  'NEXT_PUBLIC_GIT_SHA',
] as const;

function clearShaEnv() {
  for (const key of SHA_KEYS) delete process.env[key];
}

describe('runningCommitSha', () => {
  const snapshot: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of SHA_KEYS) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
  });

  it('prefers RAILWAY_GIT_COMMIT_SHA', () => {
    clearShaEnv();
    process.env.RAILWAY_GIT_COMMIT_SHA = 'abc123def456';
    process.env.GIT_COMMIT = 'other';
    expect(runningCommitSha()).toBe('abc123def456');
  });

  it('returns unknown when no sha env is set', () => {
    clearShaEnv();
    expect(runningCommitSha()).toBe('unknown');
  });
});

describe('deployHealthPayload', () => {
  it('returns stoquant-shaped JSON with status, commit, started_at', () => {
    clearShaEnv();
    process.env.RAILWAY_GIT_COMMIT_SHA = 'deadbeef';
    const payload = deployHealthPayload();
    expect(payload.status).toBe('ok');
    expect(payload.commit).toBe('deadbeef');
    expect(payload.service).toBe('lexiclash');
    expect(Number.isNaN(Date.parse(payload.started_at))).toBe(false);
  });
});
