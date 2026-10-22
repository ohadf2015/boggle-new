import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import { PolarClient, getPolarEnvironment, getProProductId } from '../polar'

const SECRET = 'polar-test-secret'

/** Sign exactly like Polar's docs prescribe: base64-encoded secret as HMAC key. */
function sign(id: string, timestamp: string, body: string, secret = SECRET): string {
  return createHmac('sha256', Buffer.from(secret).toString('base64'))
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64')
}

/**
 * Sign exactly how a real Polar delivery is signed (Standard Webhooks spec):
 * secret is `whsec_<base64>`; the key is the base64 part DECODED to raw bytes.
 */
function signStandardWebhooks(id: string, timestamp: string, body: string, whsecSecret: string): string {
  const keyBytes = Buffer.from(whsecSecret.replace(/^whsec_/, ''), 'base64')
  return createHmac('sha256', keyBytes).update(`${id}.${timestamp}.${body}`).digest('base64')
}

function nowSeconds(): string {
  return String(Math.floor(Date.now() / 1000))
}

describe('PolarClient.validateWebhookSignature', () => {
  const ORIGINAL_SECRET = process.env.POLAR_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = SECRET
  })

  afterEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = ORIGINAL_SECRET
    vi.restoreAllMocks()
  })

  it('rejects (fails closed) when the webhook secret is not configured', () => {
    delete process.env.POLAR_WEBHOOK_SECRET
    expect(
      PolarClient.validateWebhookSignature('{}', { id: 'msg_1', timestamp: nowSeconds(), signature: 'v1,abc' })
    ).toBe(false)
  })

  it('accepts a correctly signed payload', () => {
    const body = '{"type":"subscription.active","data":{}}'
    const ts = nowSeconds()
    const sig = sign('msg_1', ts, body)
    expect(
      PolarClient.validateWebhookSignature(body, { id: 'msg_1', timestamp: ts, signature: `v1,${sig}` })
    ).toBe(true)
  })

  it('accepts a payload signed the way a real Polar delivery signs it (whsec_ secret, decoded to raw key bytes)', () => {
    const whsecSecret = 'whsec_' + Buffer.from('actual-raw-key-bytes').toString('base64')
    process.env.POLAR_WEBHOOK_SECRET = whsecSecret
    const body = '{"type":"checkout.completed","data":{}}'
    const ts = nowSeconds()
    const sig = signStandardWebhooks('msg_1', ts, body, whsecSecret)
    expect(
      PolarClient.validateWebhookSignature(body, { id: 'msg_1', timestamp: ts, signature: `v1,${sig}` })
    ).toBe(true)
  })

  it('rejects a tampered body', () => {
    const ts = nowSeconds()
    const sig = sign('msg_1', ts, '{"legit":true}')
    expect(
      PolarClient.validateWebhookSignature('{"tampered":true}', { id: 'msg_1', timestamp: ts, signature: `v1,${sig}` })
    ).toBe(false)
  })

  it('accepts when one of several rotated signatures matches', () => {
    const body = '{}'
    const ts = nowSeconds()
    const good = sign('msg_1', ts, body)
    expect(
      PolarClient.validateWebhookSignature(body, {
        id: 'msg_1',
        timestamp: ts,
        signature: `v1,bm90bWU= v1,${good}`,
      })
    ).toBe(true)
  })

  it('rejects an event older than 5 minutes (replay protection)', () => {
    const body = '{}'
    const staleTs = String(Math.floor(Date.now() / 1000) - 301)
    const sig = sign('msg_1', staleTs, body)
    expect(
      PolarClient.validateWebhookSignature(body, { id: 'msg_1', timestamp: staleTs, signature: `v1,${sig}` })
    ).toBe(false)
  })

  it('rejects missing headers and malformed signatures without throwing', () => {
    expect(() =>
      PolarClient.validateWebhookSignature('{}', { id: null, timestamp: null, signature: null })
    ).not.toThrow()
    expect(PolarClient.validateWebhookSignature('{}', { id: null, timestamp: null, signature: null })).toBe(false)
    expect(
      PolarClient.validateWebhookSignature('{}', { id: 'm', timestamp: nowSeconds(), signature: 'garbage' })
    ).toBe(false)
  })
})

describe('PolarClient.createCheckout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the expected payload to the sandbox API and returns the checkout url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://sandbox.polar.sh/checkout/abc' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = new PolarClient('token-123', 'sandbox')
    const url = await client.createCheckout({
      userId: 'user-1',
      productId: 'prod-1',
      email: 'teacher@example.com',
    })

    expect(url).toBe('https://sandbox.polar.sh/checkout/abc')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [endpoint, init] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('https://sandbox-api.polar.sh/v1/checkouts/')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer token-123')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      products: ['prod-1'],
      customer_email: 'teacher@example.com',
      external_customer_id: 'user-1',
      metadata: { user_id: 'user-1', trial: false },
      allow_trial: false,
    })
    expect(body.trial_interval).toBeUndefined()
  })

  it('a trial checkout asks Polar for 14 days and marks metadata.trial', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://sandbox.polar.sh/checkout/trial' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = new PolarClient('token-123', 'sandbox')
    await client.createCheckout({ userId: 'user-1', productId: 'prod-1', allowTrial: true })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      allow_trial: true,
      trial_interval: 'day',
      trial_interval_count: 14,
      metadata: { user_id: 'user-1', trial: true },
    })
  })

  it('builds the fallback success_url with the /en prefix by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://sandbox.polar.sh/checkout/abc' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.lexiclash.live'

    const client = new PolarClient('token-123', 'sandbox')
    await client.createCheckout({ userId: 'user-1', productId: 'prod-1' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.success_url).toBe('https://www.lexiclash.live/en/teacher?checkout=success')
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('builds the fallback success_url with the given locale prefix', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://sandbox.polar.sh/checkout/abc' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.lexiclash.live'

    const client = new PolarClient('token-123', 'sandbox')
    await client.createCheckout({ userId: 'user-1', productId: 'prod-1', locale: 'he' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.success_url).toBe('https://www.lexiclash.live/he/teacher?checkout=success')
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('lets redirectUrl override the locale-aware success_url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://sandbox.polar.sh/checkout/abc' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = new PolarClient('token-123', 'sandbox')
    await client.createCheckout({ userId: 'user-1', productId: 'prod-1', locale: 'he', redirectUrl: 'https://example.com/done' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.success_url).toBe('https://example.com/done')
  })

  it('throws on Polar API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }))
    const client = new PolarClient('bad-token', 'production')
    await expect(client.createCheckout({ userId: 'u', productId: 'p' })).rejects.toThrow('Polar API error: 401')
  })
})

describe('PolarClient.createCheckout — rejected customer_email', () => {
  const rejected = {
    ok: false,
    status: 422,
    text: async () => '{"detail":[{"loc":["body","x","customer_email"],"msg":"The domain name school.example does not exist."}]}',
  }
  const created = { ok: true, json: async () => ({ url: 'https://polar.sh/checkout/ok' }) }

  it('retries once without the email, so a teacher with an odd address can still subscribe', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(rejected).mockResolvedValueOnce(created)
    vi.stubGlobal('fetch', fetchMock)
    const url = await new PolarClient('tok', 'sandbox').createCheckout({ userId: 'u', productId: 'p', email: 'a@school.example' })
    expect(url).toBe('https://polar.sh/checkout/ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).customer_email).toBe('a@school.example')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty('customer_email')
  })

  it('does not retry a 422 that is not about the email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => '{"detail":[{"loc":["body","products"]}]}' })
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      new PolarClient('tok', 'sandbox').createCheckout({ userId: 'u', productId: 'p', email: 'a@b.co' }),
    ).rejects.toThrow('Polar API error: 422')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('polar env helpers', () => {
  afterEach(() => {
    delete process.env.POLAR_ENVIRONMENT
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('defaults to production so an unset env var cannot bill into sandbox', () => {
    expect(getPolarEnvironment()).toBe('production')
    process.env.POLAR_ENVIRONMENT = ''
    expect(getPolarEnvironment()).toBe('production')
    process.env.POLAR_ENVIRONMENT = 'production'
    expect(getPolarEnvironment()).toBe('production')
  })

  it('uses sandbox only when explicitly opted in', () => {
    process.env.POLAR_ENVIRONMENT = 'sandbox'
    expect(getPolarEnvironment()).toBe('sandbox')
  })

  it('throws when POLAR_PRO_PRODUCT_ID is missing', () => {
    expect(() => getProProductId()).toThrow('POLAR_PRO_PRODUCT_ID')
    process.env.POLAR_PRO_PRODUCT_ID = 'prod-x'
    expect(getProProductId()).toBe('prod-x')
  })
})
