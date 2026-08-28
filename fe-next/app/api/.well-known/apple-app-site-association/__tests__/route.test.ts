import { vi, type Mock, } from 'vitest';
/**
 * Apple App Site Association Route Tests
 * Tests AASA response for iOS Universal Links
 */

// Mock NextResponse before importing route
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
      headers: new Map(Object.entries(init?.headers || {})),
    }),
  },
}));

import { GET } from '../route';

describe('AASA route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APPLE_TEAM_ID: 'TEAM123456',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return valid AASA JSON', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(body.applinks).toBeDefined();
    expect(body.applinks.apps).toEqual([]);
    expect(body.applinks.details).toBeInstanceOf(Array);
  });

  it('should include correct app ID with team prefix', async () => {
    const response = await GET();
    const body = await response.json();

    const detail = body.applinks.details[0];
    expect(detail.appID).toBe('TEAM123456.live.lexiclash.app');
  });

  it('should include all supported deep link paths', async () => {
    const response = await GET();
    const body = await response.json();

    const paths = body.applinks.details[0].paths;
    expect(paths).toContain('/auth/callback*');
    expect(paths).toContain('/*/join/*');
    expect(paths).toContain('/join/*');
    expect(paths).toContain('/*/adventure*');
  });

  it('should include webcredentials', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.webcredentials).toBeDefined();
    expect(body.webcredentials.apps).toContain('TEAM123456.live.lexiclash.app');
  });

  // Production served `appID: ".live.lexiclash.app"` — APPLE_TEAM_ID was never set
  // in the deployed env. iOS caches the AASA it fetches, so publishing a malformed
  // one is worse than publishing none: a 5xx makes iOS retry later, a bad appID
  // sticks. Every other test in this file sets the env var, which is exactly why
  // the unset case shipped broken.
  describe('when APPLE_TEAM_ID is not configured', () => {
    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.APPLE_TEAM_ID;
    });

    it('does not serve an appID with an empty team prefix', async () => {
      const response = await GET();
      const body = await response.json();

      const appID = body?.applinks?.details?.[0]?.appID;
      expect(appID).not.toBe('.live.lexiclash.app');
      expect(appID ?? '').not.toMatch(/^\./);
    });

    it('responds 503 so iOS retries instead of caching a broken association', async () => {
      const response = await GET();
      expect(response.status).toBe(503);
    });
  });
});
