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
    expect(JSON.parse(init.body)).toMatchObject({
      products: ['prod-1'],
      customer_email: 'teacher@example.com',
      external_customer_id: 'user-1',
      metadata: { user_id: 'user-1' },
    })
  })

  it('throws on Polar API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }))
    const client = new PolarClient('bad-token', 'production')
    await expect(client.createCheckout({ userId: 'u', productId: 'p' })).rejects.toThrow('Polar API error: 401')
  })
})

describe('polar env helpers', () => {
  afterEach(() => {
    delete process.env.POLAR_ENVIRONMENT
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('defaults to sandbox and switches to production explicitly', () => {
    expect(getPolarEnvironment()).toBe('sandbox')
    process.env.POLAR_ENVIRONMENT = 'production'
    expect(getPolarEnvironment()).toBe('production')
  })

  it('throws when POLAR_PRO_PRODUCT_ID is missing', () => {
    expect(() => getProProductId()).toThrow('POLAR_PRO_PRODUCT_ID')
    process.env.POLAR_PRO_PRODUCT_ID = 'prod-x'
    expect(getProProductId()).toBe('prod-x')
  })
})
