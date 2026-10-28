import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const createCheckout = vi.fn()
const probeCheckoutUrl = vi.fn(async () => ({ ok: true, status: 200 }))
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ createCheckout }),
  getProProductId: () => process.env.POLAR_PRO_PRODUCT_ID,
  probeCheckoutUrl: (...args: unknown[]) => probeCheckoutUrl(...args),
}))

const { maybeSingle, limitEvents } = vi.hoisted(() => ({
  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  limitEvents: vi.fn(async () => ({ data: [], error: null })),
}))
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingle(),
          contains: () => ({ limit: () => limitEvents() }),
        }),
      }),
    }),
  }),
}))

const { logSubscriptionEvent } = vi.hoisted(() => ({ logSubscriptionEvent: vi.fn(async () => undefined) }))
vi.mock('@/lib/subscriptions', () => ({ logSubscriptionEvent }))

const { accessTrialExpiryAny } = vi.hoisted(() => ({ accessTrialExpiryAny: vi.fn(async (): Promise<string | null> => null) }))
vi.mock('@/lib/education/accessTrialServer', () => ({ accessTrialExpiryAny }))

const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => getAuthedUser(...args),
}))

import { POST } from '../route'

describe('POST /api/subscription/checkout', () => {
  beforeEach(() => {
    createCheckout.mockReset()
    getAuthedUser.mockReset()
    logSubscriptionEvent.mockReset()
    logSubscriptionEvent.mockResolvedValue(undefined)
    probeCheckoutUrl.mockReset()
    probeCheckoutUrl.mockResolvedValue({ ok: true, status: 200 })
    maybeSingle.mockReset()
    limitEvents.mockReset()
    maybeSingle.mockResolvedValue({ data: null, error: null })
    limitEvents.mockResolvedValue({ data: [], error: null })
    accessTrialExpiryAny.mockReset()
    accessTrialExpiryAny.mockResolvedValue(null)
    process.env.POLAR_ACCESS_TOKEN = 'polar-token'
    process.env.POLAR_PRO_PRODUCT_ID = 'prod-pro-1'
  })

  afterEach(() => {
    delete process.env.POLAR_ACCESS_TOKEN
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('returns 503 when Polar access token is missing', async () => {
    delete process.env.POLAR_ACCESS_TOKEN
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/Polar billing is not configured/)
    expect(body.missing).toEqual(['POLAR_ACCESS_TOKEN'])
  })

  it('returns 503 when Polar product id is missing', async () => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/Polar billing is not configured/)
    expect(body.missing).toEqual(['POLAR_PRO_PRODUCT_ID'])
  })

  it('503s naming POLAR_ENVIRONMENT when Railway production is pointed at sandbox', async () => {
    const prevRailway = process.env.RAILWAY_ENVIRONMENT_NAME
    const prevVercel = process.env.VERCEL_ENV
    const prevPolar = process.env.POLAR_ENVIRONMENT
    delete process.env.VERCEL_ENV
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production'
    process.env.POLAR_ENVIRONMENT = 'sandbox'
    try {
      const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.missing).toEqual(['POLAR_ENVIRONMENT'])
      expect(createCheckout).not.toHaveBeenCalled()
    } finally {
      if (prevRailway === undefined) delete process.env.RAILWAY_ENVIRONMENT_NAME
      else process.env.RAILWAY_ENVIRONMENT_NAME = prevRailway
      if (prevVercel === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = prevVercel
      if (prevPolar === undefined) delete process.env.POLAR_ENVIRONMENT
      else process.env.POLAR_ENVIRONMENT = prevPolar
    }
  })

  it('503s when the live host would be sent a sandbox checkout URL', async () => {
    const prevPolar = process.env.POLAR_ENVIRONMENT
    process.env.POLAR_ENVIRONMENT = 'production'
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://sandbox.polar.sh/checkout/u1')
    try {
      const res = await POST(new Request('http://www.lexiclash.live/api/subscription/checkout', {
        method: 'POST',
        headers: { 'x-forwarded-host': 'www.lexiclash.live' },
      }))
      expect(res.status).toBe(503)
      expect(createCheckout).toHaveBeenCalled()
      expect(logSubscriptionEvent).not.toHaveBeenCalled()
    } finally {
      if (prevPolar === undefined) delete process.env.POLAR_ENVIRONMENT
      else process.env.POLAR_ENVIRONMENT = prevPolar
    }
  })

  it('returns 503 when Polar checkout URL creation times out', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockRejectedValue(new Error('Polar API error: 504 Polar request timed out'))
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'Polar checkout URL creation timed out' })
  })

  it('503s naming POLAR_ENVIRONMENT when a production deploy is pointed at sandbox', async () => {
    const prevVercel = process.env.VERCEL_ENV
    const prevPolar = process.env.POLAR_ENVIRONMENT
    process.env.VERCEL_ENV = 'production'
    process.env.POLAR_ENVIRONMENT = 'sandbox'
    try {
      const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.missing).toEqual(['POLAR_ENVIRONMENT'])
      expect(body.error).toContain('POLAR_ENVIRONMENT')
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = prevVercel
      if (prevPolar === undefined) delete process.env.POLAR_ENVIRONMENT
      else process.env.POLAR_ENVIRONMENT = prevPolar
    }
  })

  it('returns 401 when user is not authenticated', async () => {
    getAuthedUser.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 with checkout url when Polar is configured and user is authenticated', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')

    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://polar.sh/checkout/u1' })
    expect(createCheckout).toHaveBeenCalledWith({
      userId: 'u1',
      productId: 'prod-pro-1',
      email: 'teacher@example.com',
      allowTrial: false,
      locale: 'en',
    })
  })

  it('prefills the hosted checkout with the teacher display name from profiles', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    maybeSingle.mockResolvedValue({ data: { is_test_account: false, display_name: 'Ms Rivera' }, error: null })
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ms Rivera', email: 'teacher@example.com' }))
  })

  it('checkout still works when the profile lookup fails (no name prefill, till stays open)', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    maybeSingle.mockRejectedValue(new Error('db down'))
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ name: undefined }))
  })

  it('records when a checkout started, for the abandoned-checkout email', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: true, locale: 'he' }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: 'checkout_started',
      payload: { mode: 'trial', locale: 'he', client_kind: 'script' },
    })
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: 'checkout_url_reachable',
      payload: {
        http_status: 200,
        status: 200,
        mode: 'trial',
        locale: 'he',
        client_kind: 'script',
        is_test_account: true,
        test_reason: 'test_domain',
      },
    })
    for (const [callArg] of logSubscriptionEvent.mock.calls) {
      expect(callArg.payload).not.toHaveProperty('trial')
    }
  })

  it('records checkout_url_error with HTTP status as a durable event when Polar checkout URL probe fails', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    probeCheckoutUrl.mockResolvedValueOnce({ ok: false, status: 502 })

    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: 'checkout_url_error',
      payload: {
        http_status: 502,
        status: 502,
        mode: 'paid',
        locale: 'en',
        client_kind: 'script',
        is_test_account: false,
        test_reason: null,
      },
    })
  })

  it('records checkout_url_error with status 0 when Polar checkout URL probe times out or errors', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@school.org' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    probeCheckoutUrl.mockResolvedValueOnce(null)

    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: 'checkout_url_error',
      payload: expect.objectContaining({
        http_status: 0,
        status: 0,
        mode: 'paid',
      }),
    })
  })

  it('still returns the checkout url when recording the start fails', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    logSubscriptionEvent.mockRejectedValue(new Error('db down'))
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://polar.sh/checkout/u1' })
  })

  it('does not hold the checkout url behind a hanging start record', async () => {
    vi.useFakeTimers()
    try {
      getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
      createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
      logSubscriptionEvent.mockReturnValue(new Promise(() => {}))
      const pending = POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
      await vi.advanceTimersByTimeAsync(2_000)
      const res = await pending
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ url: 'https://polar.sh/checkout/u1' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('records nothing when the checkout could not be created', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockRejectedValue(new Error('polar down'))
    await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(logSubscriptionEvent).not.toHaveBeenCalled()
  })

  it('uses the locale from the JSON body', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    const res = await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: false, locale: 'he' }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ locale: 'he' }))
  })

  it('rejects an unsupported body locale and falls back to the boggle_language cookie', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    // `cookie` is a forbidden header name for plain Request construction
    // (silently dropped), so seed it via NextRequest.cookies.
    const request = new NextRequest('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: false, locale: 'xx' }),
      headers: { 'Content-Type': 'application/json' },
    })
    request.cookies.set('boggle_language', 'sv')
    const res = await POST(request)
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ locale: 'sv' }))
  })

  it('defaults to en when neither body nor cookie carries a supported locale', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    const res = await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: false, locale: 'xx' }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }))
  })

  it('an empty JSON body stays on the paid checkout', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    const res = await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: false }))
  })

  it('posts allowTrial only when the body is { trial: true }', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/trial')
    const res = await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: true }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: true }))

    createCheckout.mockClear()
    await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: 'true' }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: false }))
  })

  it('downgrades a trial request to paid when they already have Pro or already used a trial', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/paid')
    maybeSingle.mockResolvedValue({
      data: { tier: 'pro', status: 'active', source: 'polar', current_period_end: '2026-11-01T00:00:00Z' },
      error: null,
    })
    const trialBody = {
      method: 'POST',
      body: JSON.stringify({ trial: true }),
      headers: { 'Content-Type': 'application/json' },
    }
    await POST(new Request('http://localhost/api/subscription/checkout', trialBody))
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: false }))

    createCheckout.mockClear()
    maybeSingle.mockResolvedValue({
      data: { tier: 'free', status: 'canceled', source: 'polar', current_period_end: null },
      error: null,
    })
    limitEvents.mockResolvedValue({ data: [{ id: 'e1' }], error: null })
    await POST(new Request('http://localhost/api/subscription/checkout', trialBody))
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: false }))
  })

  it('gives a teacher with no free access window the full 14-day trial', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/trial')
    await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: true }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: true, trialDays: 14 }))
  })

  it('inside the free access window, the Polar trial ends when the free trial ends (no second 14 days)', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/trial')
    accessTrialExpiryAny.mockResolvedValue(new Date(Date.now() + 5.5 * 24 * 60 * 60 * 1000).toISOString())
    await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: true }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: true, trialDays: 6 }))
  })

  it('a paid checkout never carries trial days, access window or not', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/paid')
    accessTrialExpiryAny.mockResolvedValue(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString())
    await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: false, trialDays: undefined }))
  })

  it('free access trial already ended: a straight $9/mo checkout, no Polar trial', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/paid')
    accessTrialExpiryAny.mockResolvedValue(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
    const res = await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: true }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: false, trialDays: undefined }))
  })

  it('a slow access-window lookup falls back to the standard trial instead of failing checkout', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/trial')
    accessTrialExpiryAny.mockRejectedValue(new Error('db down'))
    const res = await POST(new Request('http://localhost/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ trial: true }),
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(res.status).toBe(200)
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ allowTrial: true, trialDays: 14 }))
  })
})
