import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/polar', () => ({
  PolarClient: { validateWebhookSignature: () => true },
}))
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: vi.fn(),
  grantProFromOrder: vi.fn(),
  grantProFromCheckout: vi.fn(),
  logSubscriptionEvent: vi.fn(),
  subscriptionRowIsPastDue: vi.fn().mockResolvedValue(false),
}))
vi.mock('@/lib/education/dunning', () => ({ maybeSendPaymentFailedEmail: vi.fn() }))
const capture = vi.fn()
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (...a: unknown[]) => capture(...a) }),
}))

import { POST } from '../route'
import { resetWebhookTelemetryOnce } from '@/lib/education/pro/webhookTelemetryOnce'

const PRO = 'prod-pro-1'
function polarEvent(type: string, data: Record<string, unknown>) {
  return new Request('https://www.lexiclash.live/api/webhook/polar', {
    method: 'POST',
    headers: { 'webhook-id': 'm', 'webhook-timestamp': '1', 'webhook-signature': 'v1,x' },
    body: JSON.stringify({ type, data }),
  }) as never
}
const trialSub = (id = 'sub_t') => ({ id, status: 'trialing', product_id: PRO, metadata: { user_id: 'u1' } })
const trialCheckout = (subscriptionId = 'sub_t') => ({
  id: 'co_1', status: 'succeeded', subscription_id: subscriptionId, product_id: PRO, trial_end: '2026-12-06T00:00:00Z', metadata: { user_id: 'u1' },
})
const count = (event: string) => capture.mock.calls.filter((c) => c[0].event === event).length

describe('polar webhook — one trial or paid conversion per subscription', () => {
  beforeEach(() => {
    capture.mockReset()
    resetWebhookTelemetryOnce()
    process.env.POLAR_PRO_PRODUCT_ID = PRO
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })
  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('Given created, active, updated and checkout.updated for one trial, When all are handled, Then each trial step fires once', async () => {
    await POST(polarEvent('subscription.created', trialSub()))
    await POST(polarEvent('subscription.active', trialSub()))
    await POST(polarEvent('subscription.updated', trialSub()))
    await POST(polarEvent('checkout.updated', trialCheckout()))
    for (const e of ['edu_pro_trial_succeeded', 'trial_activated', 'trial_start', 'teacher_trial_started', 'trial_started', 'teacher_funnel_step']) {
      expect(count(e)).toBe(1)
    }
  })

  it('Given two different trial subscriptions, When each arrives, Then each counts', async () => {
    await POST(polarEvent('subscription.created', trialSub('sub_a')))
    await POST(polarEvent('subscription.created', trialSub('sub_b')))
    expect(count('edu_pro_trial_succeeded')).toBe(2)
  })

  it('Given only checkout.updated for a trial, When handled, Then each trial step fires once', async () => {
    await POST(polarEvent('checkout.updated', trialCheckout()))
    expect(count('edu_pro_trial_succeeded')).toBe(1)
    expect(capture.mock.calls.find((c) => c[0].event === 'edu_pro_trial_succeeded')?.[0].properties.subscription_id).toBe('sub_t')
  })

  it('Given checkout.updated before subscription.created, When both are handled, Then the trial counts once', async () => {
    await POST(polarEvent('checkout.updated', trialCheckout()))
    await POST(polarEvent('subscription.created', trialSub()))
    expect(count('edu_pro_trial_succeeded')).toBe(1)
    expect(count('trial_started')).toBe(1)
  })

  it('Given subscription.active and checkout.completed for one paid checkout, When both are handled, Then the conversion counts once', async () => {
    await POST(polarEvent('subscription.active', { id: 'sub_p', status: 'active', product_id: PRO, metadata: { user_id: 'u1' } }))
    await POST(polarEvent('checkout.completed', { id: 'co_2', status: 'succeeded', subscription_id: 'sub_p', product_id: PRO, metadata: { user_id: 'u1' } }))
    for (const e of ['edu_pro_checkout_succeeded', 'checkout_complete', 'paid', 'teacher_pro_upgraded']) {
      expect(count(e)).toBe(1)
    }
  })

  it('Given a trial that later converts on the same subscription, When both arrive, Then both the trial and the paid conversion count', async () => {
    await POST(polarEvent('subscription.created', trialSub('sub_c')))
    await POST(polarEvent('subscription.active', { id: 'sub_c', status: 'active', product_id: PRO, metadata: { user_id: 'u1' } }))
    expect(count('edu_pro_trial_succeeded')).toBe(1)
    expect(count('edu_pro_checkout_succeeded')).toBe(1)
  })
})
