import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createCheckout = vi.fn()
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ createCheckout }),
  getProProductId: () => process.env.POLAR_PRO_PRODUCT_ID,
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
    })
  })
})
