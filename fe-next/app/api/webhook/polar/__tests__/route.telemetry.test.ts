/**
 * `edu_pro_checkout_succeeded` — the authoritative "a teacher paid" step,
 * fired from the Polar webhook on `subscription.active` for the Pro product.
 * Server-side ⇒ `$host` is mandatory. Analytics only: a PostHog failure must
 * never 500 the webhook (Polar would redeliver and re-run the state writes).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/polar', () => ({
  PolarClient: { validateWebhookSignature: () => true },
}))
const upsertSubscription = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: (...args: unknown[]) => upsertSubscription(...args),
  grantProFromOrder: vi.fn(),
  logSubscriptionEvent: vi.fn(),
}))
vi.mock('@/lib/education/dunning', () => ({ maybeSendPaymentFailedEmail: vi.fn() }))
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

const PRO = 'prod-pro-1'
function polarEvent(type: string, data: Record<string, unknown>) {
  return new Request('https://www.lexiclash.live/api/webhook/polar', {
    method: 'POST',
    headers: { 'webhook-id': 'm', 'webhook-timestamp': '1', 'webhook-signature': 'v1,x' },
    body: JSON.stringify({ type, data }),
  }) as never
}
const sub = (over: Record<string, unknown> = {}) => ({
  id: 'sub_1', status: 'active', product_id: PRO, metadata: { user_id: 'u1' }, ...over,
})

describe('polar webhook — edu_pro_checkout_succeeded', () => {
  beforeEach(() => {
    upsertSubscription.mockReset()
    capture.mockReset()
    posthogThrows = false
    process.env.POLAR_PRO_PRODUCT_ID = PRO
  })
  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('Given subscription.active for Pro, When handled, Then it fires once with $host and the subscription id', async () => {
    const res = await POST(polarEvent('subscription.active', sub()))
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledTimes(1)
    const arg = capture.mock.calls[0][0]
    expect(arg).toMatchObject({ distinctId: 'u1', event: 'edu_pro_checkout_succeeded' })
    expect(arg.properties.subscription_id).toBe('sub_1')
    expect(arg.properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it.each(['subscription.created', 'subscription.uncanceled', 'subscription.resumed', 'subscription.updated'])(
    'Given %s, When handled, Then it is not counted as a conversion',
    async (type) => {
      await POST(polarEvent(type, sub()))
      expect(capture).not.toHaveBeenCalled()
    }
  )

  it('Given a non-Pro product, When active, Then nothing fires', async () => {
    await POST(polarEvent('subscription.active', sub({ product_id: 'other' })))
    expect(capture).not.toHaveBeenCalled()
  })

  it('Given no user id, When active, Then nothing fires', async () => {
    await POST(polarEvent('subscription.active', sub({ metadata: {} })))
    expect(capture).not.toHaveBeenCalled()
  })

  it('Given the entitlement write fails, When active, Then no conversion is claimed', async () => {
    upsertSubscription.mockRejectedValueOnce(new Error('db down'))
    const res = await POST(polarEvent('subscription.active', sub()))
    expect(res.status).toBe(500)
    expect(capture).not.toHaveBeenCalled()
  })

  it('Given PostHog throws, When active, Then the webhook still answers 200 and the upsert ran', async () => {
    posthogThrows = true
    const res = await POST(polarEvent('subscription.active', sub()))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(upsertSubscription).toHaveBeenCalledTimes(1)
  })
})
