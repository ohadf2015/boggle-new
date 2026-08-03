import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'
import { PolarClient, getPolarApiBase, getPolarProductKind } from '../polar'
import { getPaymentsProvider, isPolarEnabled } from '../payments/config'

/**
 * Sign a body the way Polar (Standard Webhooks spec) does:
 * base64 HMAC-SHA256 of `${webhook-id}.${timestamp}.${body}` with the
 * base64-decoded whsec_ secret as the key.
 */
function sign(body: string, secret: string, id: string, timestamp: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
}

const RAW_SECRET = 'dGVzdC1zZWNyZXQta2V5LWJ5dGVz' // base64 test key
const SECRET = `whsec_${RAW_SECRET}`
const NOW = 1_800_000_000

describe('payments/config provider flag', () => {
  const ORIGINAL = process.env.PAYMENTS_PROVIDER
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.PAYMENTS_PROVIDER
    else process.env.PAYMENTS_PROVIDER = ORIGINAL
  })

  it('defaults to polar when PAYMENTS_PROVIDER is unset', () => {
    delete process.env.PAYMENTS_PROVIDER
    expect(getPaymentsProvider()).toBe('polar')
    expect(isPolarEnabled()).toBe(true)
  })

  it('selects lemonsqueezy only on the exact value', () => {
    process.env.PAYMENTS_PROVIDER = 'lemonsqueezy'
    expect(getPaymentsProvider()).toBe('lemonsqueezy')
    expect(isPolarEnabled()).toBe(false)
    process.env.PAYMENTS_PROVIDER = 'POLAR'
    expect(getPaymentsProvider()).toBe('polar')
  })
})

describe('getPolarApiBase', () => {
  const ORIGINAL = process.env.POLAR_SERVER
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.POLAR_SERVER
    else process.env.POLAR_SERVER = ORIGINAL
  })

  it('uses the sandbox API unless POLAR_SERVER=production', () => {
    delete process.env.POLAR_SERVER
    expect(getPolarApiBase()).toBe('https://sandbox-api.polar.sh')
    process.env.POLAR_SERVER = 'sandbox'
    expect(getPolarApiBase()).toBe('https://sandbox-api.polar.sh')
    process.env.POLAR_SERVER = 'production'
    expect(getPolarApiBase()).toBe('https://api.polar.sh')
  })
})

describe('getPolarProductKind', () => {
  const ORIG_PRO = process.env.POLAR_PRO_PRODUCT_ID
  const ORIG_LIFE = process.env.POLAR_LIFETIME_PRODUCT_ID
  beforeEach(() => {
    process.env.POLAR_PRO_PRODUCT_ID = 'prod_pro_123'
    process.env.POLAR_LIFETIME_PRODUCT_ID = 'prod_life_456'
  })
  afterEach(() => {
    if (ORIG_PRO === undefined) delete process.env.POLAR_PRO_PRODUCT_ID
    else process.env.POLAR_PRO_PRODUCT_ID = ORIG_PRO
    if (ORIG_LIFE === undefined) delete process.env.POLAR_LIFETIME_PRODUCT_ID
    else process.env.POLAR_LIFETIME_PRODUCT_ID = ORIG_LIFE
  })

  it('maps configured product ids to kinds', () => {
    expect(getPolarProductKind('prod_pro_123')).toBe('pro')
    expect(getPolarProductKind('prod_life_456')).toBe('lifetime')
  })

  it('returns null for unknown or missing product ids', () => {
    expect(getPolarProductKind('prod_other')).toBeNull()
    expect(getPolarProductKind(null)).toBeNull()
    expect(getPolarProductKind(undefined)).toBeNull()
  })
})

describe('PolarClient.validateWebhookSignature', () => {
  const ORIGINAL = process.env.POLAR_WEBHOOK_SECRET
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.POLAR_WEBHOOK_SECRET
    else process.env.POLAR_WEBHOOK_SECRET = ORIGINAL
  })

  it('fails closed when POLAR_WEBHOOK_SECRET is not configured', () => {
    delete process.env.POLAR_WEBHOOK_SECRET
    expect(
      PolarClient.validateWebhookSignature({
        rawBody: '{}',
        webhookId: 'msg_1',
        timestamp: String(NOW),
        signatureHeader: 'v1,abc',
        nowSeconds: NOW,
      })
    ).toBe(false)
  })

  it('rejects when any required header is missing', () => {
    process.env.POLAR_WEBHOOK_SECRET = SECRET
    const base = {
      rawBody: '{}',
      webhookId: 'msg_1',
      timestamp: String(NOW),
      signatureHeader: 'v1,abc',
      nowSeconds: NOW,
    }
    expect(PolarClient.validateWebhookSignature({ ...base, webhookId: null })).toBe(false)
    expect(PolarClient.validateWebhookSignature({ ...base, timestamp: null })).toBe(false)
    expect(PolarClient.validateWebhookSignature({ ...base, signatureHeader: null })).toBe(false)
  })

  describe('with a configured secret', () => {
    beforeEach(() => {
      process.env.POLAR_WEBHOOK_SECRET = SECRET
    })

    it('accepts a correctly signed payload', () => {
      const body = '{"type":"subscription.created","data":{}}'
      const sig = sign(body, SECRET, 'msg_1', String(NOW))
      expect(
        PolarClient.validateWebhookSignature({
          rawBody: body,
          webhookId: 'msg_1',
          timestamp: String(NOW),
          signatureHeader: `v1,${sig}`,
          nowSeconds: NOW,
        })
      ).toBe(true)
    })

    it('rejects a tampered body', () => {
      const sig = sign('{"type":"x"}', SECRET, 'msg_1', String(NOW))
      expect(
        PolarClient.validateWebhookSignature({
          rawBody: '{"type":"y"}',
          webhookId: 'msg_1',
          timestamp: String(NOW),
          signatureHeader: `v1,${sig}`,
          nowSeconds: NOW,
        })
      ).toBe(false)
    })

    it('accepts when a matching signature appears among rotation entries', () => {
      const body = '{}'
      const sig = sign(body, SECRET, 'msg_1', String(NOW))
      expect(
        PolarClient.validateWebhookSignature({
          rawBody: body,
          webhookId: 'msg_1',
          timestamp: String(NOW),
          signatureHeader: `v1,oldrotated v1,${sig}`,
          nowSeconds: NOW,
        })
      ).toBe(true)
    })

    it('rejects timestamps outside the 5-minute replay window', () => {
      const body = '{}'
      const stale = String(NOW - 301)
      const sig = sign(body, SECRET, 'msg_1', stale)
      expect(
        PolarClient.validateWebhookSignature({
          rawBody: body,
          webhookId: 'msg_1',
          timestamp: stale,
          signatureHeader: `v1,${sig}`,
          nowSeconds: NOW,
        })
      ).toBe(false)
    })

    it('rejects a non-numeric timestamp without throwing', () => {
      expect(() =>
        PolarClient.validateWebhookSignature({
          rawBody: '{}',
          webhookId: 'msg_1',
          timestamp: 'not-a-number',
          signatureHeader: 'v1,abc',
          nowSeconds: NOW,
        })
      ).not.toThrow()
      expect(
        PolarClient.validateWebhookSignature({
          rawBody: '{}',
          webhookId: 'msg_1',
          timestamp: 'not-a-number',
          signatureHeader: 'v1,abc',
          nowSeconds: NOW,
        })
      ).toBe(false)
    })

    it('supports a raw (non-whsec_) secret as utf8 key', () => {
      process.env.POLAR_WEBHOOK_SECRET = 'plain-secret'
      const body = '{}'
      const expected = createHmac('sha256', Buffer.from('plain-secret', 'utf8'))
        .update(`msg_1.${NOW}.${body}`)
        .digest('base64')
      expect(
        PolarClient.validateWebhookSignature({
          rawBody: body,
          webhookId: 'msg_1',
          timestamp: String(NOW),
          signatureHeader: `v1,${expected}`,
          nowSeconds: NOW,
        })
      ).toBe(true)
    })
  })
})
