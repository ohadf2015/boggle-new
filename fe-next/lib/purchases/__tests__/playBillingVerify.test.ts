import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  parsePlayPurchase,
  verifyPlayPurchase,
  isPlayBillingConfigured,
} from '../playBillingVerify';

describe('playBillingVerify — parsePlayPurchase', () => {
  it('accepts a purchased product (purchaseState=0) and extracts the orderId', () => {
    const r = parsePlayPurchase({ purchaseState: 0, orderId: 'GPA.1234-5678', acknowledgementState: 1 });
    if ('error' in r) throw new Error(r.error);
    expect(r.valid).toBe(true);
    expect(r.orderId).toBe('GPA.1234-5678');
  });

  it('rejects a canceled (1) or pending (2) purchase as not valid', () => {
    const canceled = parsePlayPurchase({ purchaseState: 1, orderId: 'GPA.x' });
    const pending = parsePlayPurchase({ purchaseState: 2, orderId: 'GPA.y' });
    if ('error' in canceled || 'error' in pending) throw new Error('expected parse, not error');
    expect(canceled.valid).toBe(false);
    expect(pending.valid).toBe(false);
  });

  it('errors when purchaseState is missing/non-numeric', () => {
    expect('error' in parsePlayPurchase({ orderId: 'x' })).toBe(true);
  });

  it('errors when orderId is missing on an otherwise-purchased response', () => {
    expect('error' in parsePlayPurchase({ purchaseState: 0 })).toBe(true);
  });
});

describe('playBillingVerify — verifyPlayPurchase (mocked Google API)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const args = { packageName: 'live.lexiclash.app', productId: 'remove_ads', token: 'tok_abc', accessToken: 'ya29.fake' };

  it('calls the androidpublisher products endpoint with a Bearer token and returns a valid purchase', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ purchaseState: 0, orderId: 'GPA.999' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await verifyPlayPurchase(args);
    if ('error' in r) throw new Error(r.error);
    expect(r.valid).toBe(true);
    expect(r.orderId).toBe('GPA.999');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/applications/live.lexiclash.app/purchases/products/remove_ads/tokens/tok_abc');
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe('Bearer ya29.fake');
  });

  it('errors when Google returns a non-2xx (bad/expired token)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 410, json: async () => ({}) })));
    const r = await verifyPlayPurchase(args);
    expect('error' in r).toBe(true);
  });
});

describe('playBillingVerify — isPlayBillingConfigured', () => {
  afterEach(() => {
    delete process.env.GOOGLE_PLAY_SA_CLIENT_EMAIL;
    delete process.env.GOOGLE_PLAY_SA_PRIVATE_KEY;
    delete process.env.GOOGLE_PLAY_PACKAGE_NAME;
  });

  it('is false (dark) unless all three SA env vars are set', () => {
    expect(isPlayBillingConfigured()).toBe(false);
    process.env.GOOGLE_PLAY_SA_CLIENT_EMAIL = 'sa@x.iam';
    process.env.GOOGLE_PLAY_SA_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----';
    expect(isPlayBillingConfigured()).toBe(false);
    process.env.GOOGLE_PLAY_PACKAGE_NAME = 'live.lexiclash.app';
    expect(isPlayBillingConfigured()).toBe(true);
  });
});
