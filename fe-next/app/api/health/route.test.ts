import { afterEach, describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/health (Next fallback)', () => {
  const prev = process.env.RAILWAY_GIT_COMMIT_SHA;

  afterEach(() => {
    if (prev === undefined) delete process.env.RAILWAY_GIT_COMMIT_SHA;
    else process.env.RAILWAY_GIT_COMMIT_SHA = prev;
  });

  it('returns JSON status + running commit sha', async () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'abc123def456';
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/json/);
    expect(res.headers.get('cache-control')).toMatch(/no-store/);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.commit).toBe('abc123def456');
    expect(typeof body.started_at).toBe('string');
    expect(Number.isNaN(Date.parse(body.started_at))).toBe(false);
  });
});
