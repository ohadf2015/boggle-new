/**
 * `edu_pro_checkout_succeeded` + `checkout_complete` + `paid` — the
 * authoritative "a teacher paid" steps, fired from the Polar webhook on
 * `subscription.active` for the Pro product (not at checkout-URL creation).
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
  grantProFromCheckout: vi.fn(),
  logSubscriptionEvent: vi.fn(),
  subscriptionRowIsPastDue: vi.fn().mockResolvedValue(false),
  subscriptionRowStatus: vi.fn().mockResolvedValue(null),
  subscriptionTrialAlreadyCounted: (...args: unknown[]) => subscriptionTrialAlreadyCounted(...args),
}))
const subscriptionTrialAlreadyCounted = vi.fn()
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
import { logSubscriptionEvent } from '@/lib/subscriptions'
import { resetWebhookTelemetryOnce } from '@/lib/education/pro/webhookTelemetryOnce'

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
    subscriptionTrialAlreadyCounted.mockReset().mockResolvedValue(false)
    capture.mockReset()
    resetWebhookTelemetryOnce()
    posthogThrows = false
    process.env.POLAR_PRO_PRODUCT_ID = PRO
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })
  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('Given subscription.active for Pro, When handled, Then it fires once with $host and the subscription id', async () => {
    const res = await POST(polarEvent('subscription.active', sub()))
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledTimes(4)
    const arg = capture.mock.calls[0][0]
    expect(arg).toMatchObject({ distinctId: 'u1', event: 'edu_pro_checkout_succeeded' })
    expect(arg.properties.subscription_id).toBe('sub_1')
    expect(arg.properties.$host).toBe(EDU_ANALYTICS_HOST)
    expect(capture.mock.calls.map((c) => c[0].event)).toEqual([
      'edu_pro_checkout_succeeded',
      'checkout_complete',
      'paid',
      'teacher_pro_upgraded',
    ])
    expect(capture.mock.calls[1][0].properties.subscription_id).toBe('sub_1')
    expect(capture.mock.calls[1][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
    expect(capture.mock.calls[2][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('Given subscription.active after a Polar trial, When handled, Then it also fires teacher_trial_converted', async () => {
    const res = await POST(polarEvent('subscription.active', sub({
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-10-01T00:00:00.000Z',
    })))
    expect(res.status).toBe(200)
    expect(capture.mock.calls.map((c) => c[0].event)).toEqual([
      'edu_pro_checkout_succeeded',
      'checkout_complete',
      'paid',
      'teacher_pro_upgraded',
      'teacher_trial_converted',
    ])
    expect(capture.mock.calls[4][0].event).toBe('teacher_trial_converted')
    expect(capture.mock.calls[4][0].properties.subscription_id).toBe('sub_1')
    expect(capture.mock.calls[4][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('Given subscription.canceled after a Polar trial, When handled, Then it fires trial_expired with $host', async () => {
    const res = await POST(polarEvent('subscription.canceled', sub({
      status: 'canceled',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-10-01T00:00:00.000Z',
      current_period_end: '2026-10-01T00:00:00.000Z',
    })))
    expect(res.status).toBe(200)
    expect(capture.mock.calls.map((c) => c[0].event)).toEqual(['trial_expired', 'polar_subscription_canceled'])
    expect(capture.mock.calls[1][0].properties.was_trial).toBe(true)
    expect(capture.mock.calls[0][0].properties.subscription_id).toBe('sub_1')
    expect(capture.mock.calls[0][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('Given a cancel while Polar still says trialing, even without cancel_at_period_end, Then it is trial_canceled with days_left, never trial_expired', async () => {
    const res = await POST(polarEvent('subscription.canceled', sub({
      status: 'trialing',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-12-06T19:21:51.009Z',
      current_period_end: '2026-12-06T19:21:51.009Z',
      customer_cancellation_reason: 'too_expensive',
      customer_cancellation_comment: 'school pays',
      canceled_at: '2026-11-23T07:45:32.000Z',
    })))
    expect(res.status).toBe(200)
    const events = capture.mock.calls.map((c) => c[0].event)
    expect(events).toContain('trial_canceled')
    expect(events).not.toContain('trial_expired')
    const canceled = capture.mock.calls.find((c) => c[0].event === 'trial_canceled')?.[0]
    expect(canceled.properties.days_left).toBeGreaterThan(0)
    expect(canceled.properties.cancel_reason).toBe('too_expensive')
    const logged = vi.mocked(logSubscriptionEvent).mock.calls.map((c) => c[0])
    expect(logged.map((e) => e.eventType)).toContain('teacher_trial_canceled')
    expect(logged.map((e) => e.eventType)).not.toContain('teacher_trial_expired')
    expect(logged.find((e) => e.eventType === 'subscription.canceled')?.payload).toMatchObject({
      customer_cancellation_reason: 'too_expensive',
      customer_cancellation_comment: 'school pays',
      canceled_at: '2026-11-23T07:45:32.000Z',
      ends_at: '2026-12-06T19:21:51.009Z',
    })
  })

  it('Given a cancel during a running trial (Pro stays until trial_end), When handled, Then it is not an expiry yet and the reason is kept', async () => {
    const res = await POST(polarEvent('subscription.canceled', sub({
      status: 'trialing',
      cancel_at_period_end: true,
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-12-06T00:00:00.000Z',
      current_period_end: '2026-12-06T00:00:00.000Z',
      customer_cancellation_reason: 'too_expensive',
      customer_cancellation_comment: 'free plan is enough',
    })))
    expect(res.status).toBe(200)
    expect(capture.mock.calls.map((c) => c[0].event)).toEqual(['trial_canceled', 'polar_subscription_canceled'])
    expect(capture.mock.calls[0][0].properties.cancel_reason).toBe('too_expensive')
    expect(capture.mock.calls[0][0].properties.days_left).toBeGreaterThan(0)
    expect(capture.mock.calls[1][0].properties).toMatchObject({
      was_trial: true,
      cancel_reason: 'too_expensive',
      cancel_comment: 'free plan is enough',
    })
    const logged = vi.mocked(logSubscriptionEvent).mock.calls.map((c) => c[0])
    expect(logged.map((e) => e.eventType)).toContain('teacher_trial_canceled')
    expect(logged.map((e) => e.eventType)).not.toContain('teacher_trial_expired')
    expect(logged.find((e) => e.eventType === 'subscription.canceled')?.payload).toMatchObject({
      cancel_reason: 'too_expensive',
      cancel_comment: 'free plan is enough',
    })
  })

  it('Given subscription.revoked on a still-trialing Pro row, When handled, Then it fires trial_expired', async () => {
    const res = await POST(polarEvent('subscription.revoked', sub({
      status: 'trialing',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-10-01T00:00:00.000Z',
      current_period_end: '2026-10-01T00:00:00.000Z',
    })))
    expect(res.status).toBe(200)
    expect(capture.mock.calls.map((c) => c[0].event)).toEqual(['trial_expired', 'polar_subscription_revoked'])
  })

  it('Given a paid cancel (period past trial_end), When canceled, Then it does not fire trial_expired', async () => {
    await POST(polarEvent('subscription.canceled', sub({
      status: 'canceled',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-10-01T00:00:00.000Z',
      current_period_end: '2026-11-08T00:00:00.000Z',
    })))
    // Not a trial lapse — only the generic cancel event, never trial_expired.
    expect(capture.mock.calls.map((c) => c[0].event)).toEqual(['polar_subscription_canceled'])
  })

  it.each(['subscription.created', 'subscription.uncanceled', 'subscription.resumed', 'subscription.updated'])(
    'Given %s, When handled, Then it is not counted as a conversion',
    async (type) => {
      await POST(polarEvent(type, sub()))
      expect(capture).not.toHaveBeenCalled()
    }
  )

  it('Given subscription.created while trialing, When handled, Then it fires edu_pro_trial_succeeded and trial_activated not a paid conversion', async () => {
    const res = await POST(polarEvent('subscription.created', sub({ status: 'trialing' })))
    expect(res.status).toBe(200)
    const events = capture.mock.calls.map((c) => c[0].event)
    expect(events).toEqual(['edu_pro_trial_succeeded', 'trial_activated', 'trial_start', 'teacher_trial_started', 'trial_started', 'teacher_funnel_step', 'growth:teacher_funnel_step'])
    expect(capture.mock.calls.find((c) => c[0].event === 'teacher_funnel_step')?.[0]).toMatchObject({
      distinctId: 'u1',
      properties: { step: 'trial_started', step_index: 6 },
    })
    expect(capture.mock.calls[0][0].properties.subscription_id).toBe('sub_1')
    expect(capture.mock.calls[0][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
    expect(capture.mock.calls[1][0].properties.$host).toBe(EDU_ANALYTICS_HOST)
  })

  it('Given subscription.active while still trialing, When handled, Then it is a trial not a paid conversion', async () => {
    await POST(polarEvent('subscription.active', sub({ status: 'trialing' })))
    const events = capture.mock.calls.map((c) => c[0].event)
    expect(events).toEqual(['edu_pro_trial_succeeded', 'trial_activated', 'trial_start', 'teacher_trial_started', 'trial_started', 'teacher_funnel_step', 'growth:teacher_funnel_step'])
  })

  it.each(['subscription.active', 'subscription.updated', 'subscription.created'])(
    'Given the row already trials this subscription, When %s arrives still trialing, Then no trial event fires again',
    async (type) => {
      subscriptionTrialAlreadyCounted.mockResolvedValue(true)
      await POST(polarEvent(type, sub({ status: 'trialing' })))
      expect(subscriptionTrialAlreadyCounted).toHaveBeenCalledWith('u1', 'sub_1')
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

  it('Given subscription.active while trialing, it durably records teacher_trial_started alongside the PostHog events', async () => {
    await POST(polarEvent('subscription.active', sub({
      status: 'trialing',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-10-01T00:00:00.000Z',
    })))
    const durable = vi.mocked(logSubscriptionEvent).mock.calls.map((c) => c[0].eventType)
    expect(durable).toContain('teacher_trial_started')
    expect(durable).toContain('subscription.active')
  })

  it('Given subscription.canceled during a Polar trial, it durably records teacher_trial_expired', async () => {
    await POST(polarEvent('subscription.canceled', sub({
      status: 'canceled',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-10-01T00:00:00.000Z',
      current_period_end: '2026-10-01T00:00:00.000Z',
    })))
    expect(vi.mocked(logSubscriptionEvent).mock.calls.map((c) => c[0].eventType)).toContain('teacher_trial_expired')
  })

  it('Given a first paid activation after a trial, it durably records teacher_subscription_active once', async () => {
    await POST(polarEvent('subscription.active', sub({
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-10-01T00:00:00.000Z',
    })))
    const durable = vi.mocked(logSubscriptionEvent).mock.calls.map((c) => c[0].eventType)
    expect(durable).toContain('teacher_subscription_active')
    expect(durable).not.toContain('teacher_trial_started')
  })

  it('Given a @lexiclash.test teacher, When the paid webhook fires, Then money events are not sent to PostHog', async () => {
    await POST(polarEvent('subscription.active', sub({
      customer: { email: 'prove@lexiclash.test' },
    })))
    expect(capture.mock.calls.map((c) => c[0].event)).not.toContain('teacher_pro_upgraded')
    expect(capture.mock.calls.map((c) => c[0].event)).not.toContain('checkout_complete')
  })

  it('Given PostHog throws, When active, Then the webhook still answers 200 and the upsert ran', async () => {
    posthogThrows = true
    const res = await POST(polarEvent('subscription.active', sub()))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(upsertSubscription).toHaveBeenCalledTimes(1)
  })
})
