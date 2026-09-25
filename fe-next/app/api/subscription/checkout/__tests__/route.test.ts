import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createCheckout = vi.fn()
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ createCheckout }),
  getProProductId: () => process.env.POLAR_PRO_PRODUCT_ID,
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

const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => getAuthedUser(...args),
}))

import { POST } from '../route'

describe('POST /api/subscription/checkout', () => {
  beforeEach(() => {
    createCheckout.mockReset()
    getAuthedUser.mockReset()
    maybeSingle.mockReset()
    limitEvents.mockReset()
    maybeSingle.mockResolvedValue({ data: null, error: null })
    limitEvents.mockResolvedValue({ data: [], error: null })
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
  })

  it('returns 503 when Polar product id is missing', async () => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    const res = await POST(new Request('http://localhost/api/subscription/checkout', { method: 'POST' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/Polar billing is not configured/)
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
    })
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
})
