import { vi, type Mock, } from 'vitest';
/**
 * Apple App Site Association Route Tests
 * Tests AASA response for iOS Universal Links
 */

// Mock NextResponse before importing route
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { headers?: Record<string, string> }) => ({
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
});
