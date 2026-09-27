import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * CrazyGames Token Verification API Route Tests
 *
 * Verifies JWT validation, error handling, and user claim extraction.
 */

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock jose
const mockJwtVerify = vi.fn();
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn(() => ({ success: true })),
  rateLimitResponse: vi.fn(),
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    headers: { get: vi.fn().mockReturnValue(null) },
  } as any;
}

describe('POST /api/auth/verify-crazygames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when token is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Missing or invalid token');
  });

  it('returns 400 when token is not a string', async () => {
    const res = await POST(makeRequest({ token: 123 }));
    expect(res.status).toBe(400);
  });

  it('returns verified user data on valid token', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'cg-user-123',
        username: 'TestPlayer',
        profilePictureUrl: 'https://example.com/avatar.png',
      },
    });

    const res = await POST(makeRequest({ token: 'valid-jwt-token' }));
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      valid: true,
      userId: 'cg-user-123',
      username: 'TestPlayer',
      profilePictureUrl: 'https://example.com/avatar.png',
    });
  });

  it('verifies token with correct options', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: 'user-1', username: 'Player1' },
    });

    await POST(makeRequest({ token: 'some-token' }));

    expect(mockJwtVerify).toHaveBeenCalledWith('some-token', 'mock-jwks', {
      issuer: 'crazygames.com',
      audience: 'lexiclash',
      algorithms: ['RS256'],
    });
  });

  it('returns 401 when token has no user identifier', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { username: 'NoIdUser' },
    });

    const res = await POST(makeRequest({ token: 'token-no-sub' }));
    expect(res.status).toBe(401);
    expect(res.data.error).toBe('Token missing user identifier');
  });

  it('returns 401 on expired token', async () => {
    mockJwtVerify.mockRejectedValue(new Error('JWT expired'));

    const res = await POST(makeRequest({ token: 'expired-token' }));
    expect(res.status).toBe(401);
    expect(res.data.error).toBe('Invalid or expired token');
  });

  it('returns 401 on invalid signature', async () => {
    mockJwtVerify.mockRejectedValue(new Error('JWS signature verification failed'));

    const res = await POST(makeRequest({ token: 'bad-sig-token' }));
    expect(res.status).toBe(401);
  });

  it('returns 500 on unexpected server error', async () => {
    mockJwtVerify.mockRejectedValue(new Error('Network timeout'));

    const res = await POST(makeRequest({ token: 'some-token' }));
    expect(res.status).toBe(500);
    expect(res.data.error).toBe('Token verification failed');
  });

  it('handles missing optional fields gracefully', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: 'user-minimal' },
    });

    const res = await POST(makeRequest({ token: 'minimal-token' }));
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      valid: true,
      userId: 'user-minimal',
      username: null,
      profilePictureUrl: null,
    });
  });
});
