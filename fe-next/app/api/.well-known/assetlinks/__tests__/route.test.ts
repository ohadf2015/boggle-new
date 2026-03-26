import { vi, type Mock, } from 'vitest';
/**
 * Android Asset Links Route Tests
 * Tests Digital Asset Links response for Android App Links
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

describe('assetlinks route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ANDROID_SHA256_CERT: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return valid Digital Asset Links JSON', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(body).toBeInstanceOf(Array);
    expect(body[0].relation).toContain('delegate_permission/common.handle_all_urls');
  });

  it('should include correct package name', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body[0].target.package_name).toBe('live.lexiclash.app');
  });

  it('should include SHA-256 fingerprint from env', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body[0].target.sha256_cert_fingerprints).toContain(
      'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99'
    );
  });
});
