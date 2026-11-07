/**
 * Server checkout/trial events must land on the teacher's browser person, or the Pro funnel
 * shows "checkout started" by people with no pageviews. The browser id comes from the
 * posthog-js cookie on the same request.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createCheckout = vi.fn()
vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({ createCheckout }),
  getProProductId: () => process.env.POLAR_PRO_PRODUCT_ID,
  probeCheckoutUrl: async () => ({ ok: true, status: 200 }),
}))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => null }))
const getAuthedUser = vi.fn()
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => getAuthedUser(...args),
}))
const capture = vi.fn()
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (...a: unknown[]) => capture(...a) }),
}))

import { POST } from '../route'

const phCookie = (value: Record<string, unknown>) =>
  `ph_phc_test_posthog=${encodeURIComponent(JSON.stringify(value))}`

// A test Request drops the Cookie header (forbidden in fetch), so the route gets a request-shaped object.
const req = (cookie?: string, body?: unknown) => {
  const headers = new Headers(body ? { 'content-type': 'application/json' } : {})
  if (cookie) headers.set('cookie', cookie)
  return { headers, text: async () => (body ? JSON.stringify(body) : '') } as never
}

describe('POST /api/subscription/checkout — browser identity', () => {
  beforeEach(() => {
    createCheckout.mockReset()
    getAuthedUser.mockReset()
    capture.mockReset()
    process.env.POLAR_ACCESS_TOKEN = 'polar-token'
    process.env.POLAR_PRO_PRODUCT_ID = 'prod-pro-1'
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'teacher@example.com' })
    createCheckout.mockResolvedValue({ url: 'https://polar.sh/checkout/u1', id: 'chk-1' })
  })
  afterEach(() => {
    delete process.env.POLAR_ACCESS_TOKEN
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('Given an anonymous browser cookie, When a trial checkout is created, Then every server event is the browser person and keeps teacher_id', async () => {
    const res = await POST(req(phCookie({ distinct_id: 'anon-b1', $sesid: [1, 'sess-b1', 1], $user_state: 'anonymous' }), { trial: true }))
    expect(res.status).toBe(200)
    expect(capture.mock.calls.length).toBeGreaterThanOrEqual(3)
    for (const [ev] of capture.mock.calls) {
      expect(ev.distinctId).toBe('anon-b1')
      expect(ev.properties.teacher_id).toBe('u1')
      expect(ev.properties.$session_id).toBe('sess-b1')
      expect(ev.properties.analytics_identity_source).toBe('browser_cookie')
    }
    expect(capture.mock.calls.map(([ev]) => ev.event)).toContain('edu_pro_trial_started')
  })

  it('Given a browser cookie, When the checkout is created, Then Polar metadata carries the browser id for the webhook', async () => {
    await POST(req(phCookie({ distinct_id: 'anon-b1', $user_state: 'anonymous' })))
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ analyticsDistinctId: 'anon-b1' }))
  })

  it('Given a cookie identified as another account, When the checkout is created, Then events stay on the teacher id', async () => {
    await POST(req(phCookie({ distinct_id: 'someone-else', $user_state: 'identified' })))
    for (const [ev] of capture.mock.calls) expect(ev.distinctId).toBe('u1')
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ analyticsDistinctId: 'u1' }))
  })

  it('Given Polar fails for a signed-in teacher, When the route answers 500, Then the failure is the browser person too', async () => {
    createCheckout.mockRejectedValue(new Error('polar down'))
    const res = await POST(req(phCookie({ distinct_id: 'anon-b1', $user_state: 'anonymous' })))
    expect(res.status).toBe(500)
    expect(capture.mock.calls[0][0]).toMatchObject({ distinctId: 'anon-b1', event: 'edu_pro_checkout_failed' })
  })
})
