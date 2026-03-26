import { vi } from 'vitest';
// @ts-nocheck
/**
 * Xsolla Webhook Verification Tests
 *
 * Verifies HMAC-SHA1 signature validation, error handling, and notification routing.
 */
import crypto from 'crypto';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// Set webhook secret before importing route
const TEST_SECRET = 'test-webhook-secret-123';
process.env.XSOLLA_WEBHOOK_SECRET = TEST_SECRET;

import { POST } from '../route';

function computeSignature(body: string, secret: string = TEST_SECRET): string {
  return crypto.createHmac('sha1', secret).update(body).digest('hex');
}

function makeRequest(body: string, signature?: string) {
  const headers = new Map<string, string>();
  if (signature !== undefined) {
    headers.set('authorization', `Signature ${signature}`);
  }
  return {
    text: async () => body,
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
  } as any;
}

describe('POST /api/purchases/verify-xsolla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for valid payment webhook', async () => {
    const body = JSON.stringify({ notification_type: 'payment', transaction: { id: 'order-123' } });
    const sig = computeSignature(body);

    const res = await POST(makeRequest(body, sig));
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  it('returns 200 for user_validation webhook', async () => {
    const body = JSON.stringify({ notification_type: 'user_validation', user: { id: '456' } });
    const sig = computeSignature(body);

    const res = await POST(makeRequest(body, sig));
    expect(res.status).toBe(200);
  });

  it('returns 401 for invalid signature', async () => {
    const body = JSON.stringify({ notification_type: 'payment' });
    const badSig = computeSignature(body, 'wrong-secret');

    const res = await POST(makeRequest(body, badSig));
    expect(res.status).toBe(401);
    expect(res.data.error).toBe('Invalid webhook signature');
  });

  it('returns 401 for missing Authorization header', async () => {
    const body = JSON.stringify({ notification_type: 'payment' });

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(401);
    expect(res.data.error).toBe('Missing or malformed Authorization header');
  });

  it('returns 400 for empty body', async () => {
    const res = await POST(makeRequest(''));
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Empty request body');
  });

  it('returns 400 for invalid JSON with valid signature', async () => {
    const body = 'not json';
    const sig = computeSignature(body);

    const res = await POST(makeRequest(body, sig));
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid JSON body');
  });

  it('handles refund notification', async () => {
    const body = JSON.stringify({ notification_type: 'refund', transaction: { id: 'order-456' } });
    const sig = computeSignature(body);

    const res = await POST(makeRequest(body, sig));
    expect(res.status).toBe(200);
  });

  it('handles unknown notification type gracefully', async () => {
    const body = JSON.stringify({ notification_type: 'unknown_type' });
    const sig = computeSignature(body);

    const res = await POST(makeRequest(body, sig));
    expect(res.status).toBe(200);
  });
});
