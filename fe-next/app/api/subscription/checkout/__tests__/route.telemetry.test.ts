/**
 * `edu_pro_checkout_started` — the funnel step between "clicked Upgrade" and
 * "paid". Server-side, so it MUST carry `$host` (posthog-node sets none and
 * every dashboard filters on it). Analytics only: the response is unchanged,
 * and a broken PostHog can never break checkout.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createCheckout = vi.fn()
const probeCheckoutUrl = vi.fn(async () => ({ ok: true, status: 200 }))
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ createCheckout }),
  getProProductId: () => process.env.POLAR_PRO_PRODUCT_ID,
  probeCheckoutUrl: (...args: unknown[]) => probeCheckoutUrl(...args),
}))
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => null,
}))
const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => getAuthedUser(...args),
}))
const capture = vi.fn()
let posthogThrows = false
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => {
    if (posthogThrows) throw new Error('posthog init failed')
    return { capture: (...a: unknown[]) => capture(...a) }
  },
}))

import { POST } from '../route'
import { EDU_ANALYTICS_HOST } from '@/backend/utils/educationTelemetry'

const req = () => new Request('http://localhost/api/subscription/checkout', { method: 'POST' }) as never

describe('POST /api/subscription/checkout — edu_pro_checkout_started', () => {
  beforeEach(() => {
    createCheckout.mockReset()
    getAuthedUser.mockReset()
    capture.mockReset()
    probeCheckoutUrl.mockReset()
    probeCheckoutUrl.mockResolvedValue({ ok: true, status: 200 })
    posthogThrows = false
    process.env.POLAR_ACCESS_TOKEN = 'polar-token'
    process.env.POLAR_PRO_PRODUCT_ID = 'prod-pro-1'
  })
  afterEach(() => {
    delete process.env.POLAR_ACCESS_TOKEN
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('Given a checkout is created, When the route answers, Then it fires once for the user with $host', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')

    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(capture).toHaveBeenCalledTimes(3)
    const events = capture.mock.calls.map((c) => c[0].event)
    expect(events).toEqual(['edu_pro_checkout_started', 'checkout_started', 'checkout_url_reachable'])
    const arg = capture.mock.calls[0][0]
    expect(arg.distinctId).toBe('u1')
    expect(arg.event).toBe('edu_pro_checkout_started')
    expect(arg.properties.$host).toBe(EDU_ANALYTICS_HOST)
    expect(capture.mock.calls[1][0].event).toBe('checkout_started')
    expect(capture.mock.calls[1][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
    expect(capture.mock.calls[2][0].event).toBe('checkout_url_reachable')
    expect(capture.mock.calls[2][0].properties.http_status).toBe(200)
    expect(capture.mock.calls[2][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('Given Polar fails, When the route answers 500, Then nothing is counted as started, but edu_pro_checkout_failed fires for the user', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1' })
    createCheckout.mockRejectedValue(new Error('polar down'))
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(capture).toHaveBeenCalledTimes(1)
    const arg = capture.mock.calls[0][0]
    expect(arg).toMatchObject({ distinctId: 'u1', event: 'edu_pro_checkout_failed' })
    expect(arg.properties.reason).toBe('server_error')
    expect(arg.properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('Given an unauthenticated caller, When refused, Then nothing fires', async () => {
    getAuthedUser.mockResolvedValue(null)
    await POST(req())
    expect(capture).not.toHaveBeenCalled()
  })

  it('Given Polar env vars are missing, When the route answers 503, Then edu_pro_checkout_failed fires with that reason', async () => {
    delete process.env.POLAR_ACCESS_TOKEN
    const res = await POST(req())
    expect(res.status).toBe(503)
    expect(capture).toHaveBeenCalledTimes(1)
    const arg = capture.mock.calls[0][0]
    expect(arg).toMatchObject({ distinctId: 'anonymous', event: 'edu_pro_checkout_failed' })
    expect(arg.properties.reason).toBe('polar_not_configured')
    expect(getAuthedUser).not.toHaveBeenCalled()
  })

  it('Given PostHog itself throws, When a checkout is created, Then the teacher still gets the same checkout url', async () => {
    posthogThrows = true
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://polar.sh/checkout/u1' })
  })

  it('Given the Polar checkout page itself 503s, When the route answers, Then checkout_url_error and edu_pro_checkout_failed fire with status 503 but the teacher still gets the url', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    probeCheckoutUrl.mockResolvedValue({ ok: false, status: 503 })

    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://polar.sh/checkout/u1' })
    const events = capture.mock.calls.map((c) => c[0].event)
    expect(events).toEqual([
      'edu_pro_checkout_started',
      'checkout_started',
      'checkout_url_error',
      'edu_pro_checkout_failed',
    ])
    const errArg = capture.mock.calls[2][0]
    expect(errArg.distinctId).toBe('u1')
    expect(errArg.properties.http_status).toBe(503)
    expect(errArg.properties.status).toBe(503)
    const failedArg = capture.mock.calls[3][0]
    expect(failedArg.distinctId).toBe('u1')
    expect(failedArg.properties.reason).toBe('checkout_page_503')
  })

  it('Given the probe cannot reach Polar at all (network error), When the route answers, Then checkout_url_error fires with status 0 and the teacher still gets the url', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    probeCheckoutUrl.mockResolvedValue(null)

    const res = await POST(req())
    expect(res.status).toBe(200)
    const events = capture.mock.calls.map((c) => c[0].event)
    expect(events).toEqual(['edu_pro_checkout_started', 'checkout_started', 'checkout_url_error'])
    expect(capture.mock.calls[2][0].properties.http_status).toBe(0)
  })

  it('Given { trial: true }, When Polar creates checkout, Then it fires edu_pro_trial_started, checkout_started, and checkout_url_reachable', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/trial')
    const res = await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial: true }),
    }) as never)
    expect(res.status).toBe(200)
    const events = capture.mock.calls.map((c) => c[0].event)
    expect(events).toEqual(['edu_pro_trial_started', 'checkout_started', 'checkout_url_reachable'])
    expect(capture.mock.calls[0][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
    expect(capture.mock.calls[1][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
    expect(capture.mock.calls[2][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
  })
  it('Given a scripted call from a QA alias, When a checkout is created, Then every start event is tagged as test + script + url-created', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'someone+lexitest1020@gmail.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    const res = await POST(req())
    expect(res.status).toBe(200)
    for (const [arg] of capture.mock.calls) {
      expect(arg.properties).toMatchObject({
        stage: 'checkout_url_created',
        trial: false,
        checkout_mode: 'paid',
        is_test_account: true,
        test_reason: 'test_alias',
        client_kind: 'script',
        product: 'teacher_pro',
        provider: 'polar',
      })
    }
  })

  it('Given a real teacher in a browser, When a trial checkout is created, Then the tags say browser and not test', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/trial')
    // Request() strips Sec-* (forbidden header names); a browser request to the server carries them.
    const browserReq = {
      headers: new Headers({ 'content-type': 'application/json', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin' }),
      text: async () => JSON.stringify({ trial: true }),
    }
    const res = await POST(browserReq as never)
    expect(res.status).toBe(200)
    expect(capture.mock.calls[0][0].event).toBe('edu_pro_trial_started')
    for (const [arg] of capture.mock.calls) {
      expect(arg.properties).toMatchObject({ trial: true, checkout_mode: 'trial', is_test_account: false, test_reason: null, client_kind: 'browser' })
    }
  })
})
