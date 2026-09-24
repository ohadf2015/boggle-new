/**
 * `edu_pro_checkout_started` — the funnel step between "clicked Upgrade" and
 * "paid". Server-side, so it MUST carry `$host` (posthog-node sets none and
 * every dashboard filters on it). Analytics only: the response is unchanged,
 * and a broken PostHog can never break checkout.
 */
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
    expect(capture).toHaveBeenCalledTimes(1)
    const arg = capture.mock.calls[0][0]
    expect(arg.distinctId).toBe('u1')
    expect(arg.event).toBe('edu_pro_checkout_started')
    expect(arg.properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('Given Polar fails, When the route answers 500, Then nothing is counted as started', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1' })
    createCheckout.mockRejectedValue(new Error('polar down'))
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(capture).not.toHaveBeenCalled()
  })

  it('Given an unauthenticated caller, When refused, Then nothing fires', async () => {
    getAuthedUser.mockResolvedValue(null)
    await POST(req())
    expect(capture).not.toHaveBeenCalled()
  })

  it('Given PostHog itself throws, When a checkout is created, Then the teacher still gets the same checkout url', async () => {
    posthogThrows = true
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue('https://polar.sh/checkout/u1')
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://polar.sh/checkout/u1' })
  })
})
