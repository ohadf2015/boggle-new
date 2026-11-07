/** Paid and trial steps join the same browser person the checkout events went to (Polar metadata carries its id). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const signature = vi.hoisted(() => ({ valid: true }))
vi.mock('@/lib/polar', () => ({
  PolarClient: { validateWebhookSignature: () => signature.valid },
}))
const upsertSubscription = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: (...args: unknown[]) => upsertSubscription(...args),
  grantProFromOrder: vi.fn(),
  grantProFromCheckout: vi.fn(),
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

describe('polar webhook — browser identity from checkout metadata', () => {
  beforeEach(() => {
    upsertSubscription.mockReset()
    capture.mockReset()
    signature.valid = true
    process.env.POLAR_PRO_PRODUCT_ID = PRO
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })
  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('Given metadata.posthog_distinct_id, When the subscription goes active, Then every paid step is that browser person and keeps teacher_id', async () => {
    await POST(polarEvent('subscription.active', sub({ metadata: { user_id: 'u1', posthog_distinct_id: 'anon-b1' } })))
    expect(capture.mock.calls.length).toBeGreaterThan(0)
    for (const [ev] of capture.mock.calls) {
      expect(ev.distinctId).toBe('anon-b1')
      expect(ev.properties.teacher_id).toBe('u1')
      expect(ev.properties.analytics_identity_source).toBe('polar_metadata')
    }
  })

  it('Given a trialing subscription with the browser id, When it starts, Then the trial steps are that browser person too', async () => {
    await POST(polarEvent('subscription.active', sub({ status: 'trialing', metadata: { user_id: 'u1', trial: true, posthog_distinct_id: 'anon-b1' } })))
    expect(capture.mock.calls.length).toBeGreaterThan(0)
    for (const [ev] of capture.mock.calls) expect(ev.distinctId).toBe('anon-b1')
  })

  it('Given a payload whose signature fails, When it carries a browser id, Then nothing is captured under that id', async () => {
    signature.valid = false
    const res = await POST(polarEvent('subscription.active', sub({ metadata: { user_id: 'u1', posthog_distinct_id: 'anon-b1' } })))
    expect(res.status).toBe(401)
    expect(capture.mock.calls.some(([ev]) => ev.distinctId === 'anon-b1')).toBe(false)
  })

  it('Given an older subscription with no browser id or the cookieless sentinel, When active, Then events stay on the user id', async () => {
    await POST(polarEvent('subscription.active', sub()))
    await POST(polarEvent('subscription.active', sub({ id: 'sub_2', metadata: { user_id: 'u1', posthog_distinct_id: '$posthog_cookieless' } })))
    for (const [ev] of capture.mock.calls) expect(ev.distinctId).toBe('u1')
  })
})
