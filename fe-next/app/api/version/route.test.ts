import { afterEach, describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/version', () => {
  const prev = process.env.RAILWAY_GIT_COMMIT_SHA;

  afterEach(() => {
    if (prev === undefined) delete process.env.RAILWAY_GIT_COMMIT_SHA;
    else process.env.RAILWAY_GIT_COMMIT_SHA = prev;
  });

  it('returns buildTime plus the running commit sha, uncached', async () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'abc123def456';
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/json/);
    expect(res.headers.get('cache-control')).toMatch(/no-store/);
    const body = await res.json();
    expect(Number.isNaN(Date.parse(body.buildTime))).toBe(false);
    expect(body.commit).toBe('abc123def456');
  });

  it('falls back to "unknown" sha rather than inventing one', async () => {
    for (const key of [
      'RAILWAY_GIT_COMMIT_SHA',
      'SOURCE_COMMIT',
      'GIT_COMMIT',
      'VERCEL_GIT_COMMIT_SHA',
      'COMMIT_SHA',
      'NEXT_PUBLIC_GIT_SHA',
    ]) {
      delete process.env[key];
    }
    const res = await GET();
    const body = await res.json();
    expect(body.commit).toBe('unknown');
  });
});
