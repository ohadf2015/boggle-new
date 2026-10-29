/**
 * Revenue + Polar-side lifecycle telemetry: amount/currency/product on the
 * conversion and trial events, `polar_order_paid` for every paid order
 * (renewals too), `polar_checkout_status` for checkout.created/updated, and
 * revenue fields in the subscription_events log. Analytics only — never 500s.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/polar', () => ({ PolarClient: { validateWebhookSignature: () => true } }))
const logSubscriptionEvent = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: vi.fn(),
  grantProFromOrder: vi.fn(),
  grantProFromCheckout: vi.fn(),
  logSubscriptionEvent: (...a: unknown[]) => logSubscriptionEvent(...a),
}))
vi.mock('@/lib/education/dunning', () => ({ maybeSendPaymentFailedEmail: vi.fn() }))
const capture = vi.fn()
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: (...a: unknown[]) => capture(...a) }) }))

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
const events = () => capture.mock.calls.map((c) => c[0])

describe('polar webhook — revenue telemetry', () => {
  beforeEach(() => {
    capture.mockReset()
    logSubscriptionEvent.mockReset()
    process.env.POLAR_PRO_PRODUCT_ID = PRO
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })
  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('stamps amount, currency, product and interval on paid', async () => {
    await POST(polarEvent('subscription.active', {
      id: 'sub_1', status: 'active', product_id: PRO, metadata: { user_id: 'u1' },
      amount: 900, currency: 'usd', recurring_interval: 'month',
    }))
    const paid = events().find((e) => e.event === 'paid')
    expect(paid.properties).toMatchObject({
      amount_cents: 900, currency: 'USD', polar_product_id: PRO, interval: 'month', subscription_id: 'sub_1', product: 'teacher_pro',
    })
    expect(paid.properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('stamps revenue props on trial_started too', async () => {
    await POST(polarEvent('subscription.created', {
      id: 'sub_2', status: 'trialing', product_id: PRO, metadata: { user_id: 'u2' }, amount: 900, currency: 'usd',
    }))
    expect(events().find((e) => e.event === 'trial_started').properties).toMatchObject({ amount_cents: 900, currency: 'USD' })
  })

  it('fires polar_order_paid with revenue in major units for a renewal', async () => {
    const res = await POST(polarEvent('order.paid', {
      id: 'ord_1', product_id: PRO, subscription_id: 'sub_1', metadata: { user_id: 'u1' },
      total_amount: 900, net_amount: 900, currency: 'usd', billing_reason: 'subscription_cycle',
    }))
    expect(res.status).toBe(200)
    const ev = events().find((e) => e.event === 'polar_order_paid')
    expect(ev).toBeTruthy()
    expect(ev.distinctId).toBe('u1')
    expect(ev.properties).toMatchObject({ revenue: 9, amount_cents: 900, currency: 'USD', billing_reason: 'subscription_cycle', order_id: 'ord_1', subscription_id: 'sub_1' })
    expect(ev.properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('ignores orders for other products', async () => {
    await POST(polarEvent('order.paid', { id: 'ord_x', product_id: 'other', metadata: { user_id: 'u1' }, total_amount: 500, currency: 'usd' }))
    expect(events().some((e) => e.event === 'polar_order_paid')).toBe(false)
  })

  it.each(['open', 'confirmed', 'failed', 'expired', 'succeeded'])('reports Polar checkout status %s', async (status) => {
    const type = status === 'open' ? 'checkout.created' : 'checkout.updated'
    const res = await POST(polarEvent(type, {
      id: 'co_1', status, product_id: PRO, metadata: { user_id: 'u3' }, amount: 900, currency: 'usd',
    }))
    expect(res.status).toBe(200)
    const ev = events().find((e) => e.event === 'polar_checkout_status')
    expect(ev.distinctId).toBe('u3')
    expect(ev.properties).toMatchObject({ status, checkout_id: 'co_1', webhook_event: type, has_user: true, amount_cents: 900 })
  })

  it('keeps checkout status for anonymous checkouts under a checkout-scoped id', async () => {
    await POST(polarEvent('checkout.updated', { id: 'co_9', status: 'expired', product_id: PRO }))
    const ev = events().find((e) => e.event === 'polar_checkout_status')
    expect(ev.distinctId).toBe('polar_checkout:co_9')
    expect(ev.properties.has_user).toBe(false)
  })

  it('logs amount, currency and product in subscription_events', async () => {
    await POST(polarEvent('order.paid', { id: 'ord_2', product_id: PRO, metadata: { user_id: 'u1' }, total_amount: 900, currency: 'usd' }))
    expect(logSubscriptionEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ amount_cents: 900, currency: 'USD', polar_product_id: PRO }),
    }))
  })

  it('never puts customer email or name on an event', async () => {
    await POST(polarEvent('order.paid', {
      id: 'ord_3', product_id: PRO, metadata: { user_id: 'u1' }, total_amount: 900, currency: 'usd',
      customer: { email: 'someone@example.com', name: 'Some One' },
    }))
    expect(JSON.stringify(events())).not.toContain('example.com')
    expect(JSON.stringify(events())).not.toContain('Some One')
  })
})
