/**
 * The owner hears about Pro money events through the admin bell: trial start, a new
 * paying customer, and the end of a subscription. Pro products only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/polar', () => ({ PolarClient: { validateWebhookSignature: () => true } }))
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: vi.fn(),
  grantProFromOrder: vi.fn(),
  grantProFromCheckout: vi.fn(),
  logSubscriptionEvent: vi.fn(),
}))
vi.mock('@/lib/education/dunning', () => ({ maybeSendPaymentFailedEmail: vi.fn() }))
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }))
const notifyAdmins = vi.fn(async (_n: unknown) => true)
vi.mock('@/lib/admin/adminNotifications', () => ({ notifyAdmins: (n: unknown) => notifyAdmins(n) }))

import { POST } from '../route'

const PRO = 'prod-pro-1'
const event = (type: string, data: Record<string, unknown>) =>
  new Request('https://www.lexiclash.live/api/webhook/polar', {
    method: 'POST',
    headers: { 'webhook-id': 'm', 'webhook-timestamp': '1', 'webhook-signature': 'v1,x' },
    body: JSON.stringify({ type, data }),
  }) as never

describe('polar webhook — admin notifications', () => {
  beforeEach(() => {
    notifyAdmins.mockClear()
    process.env.POLAR_PRO_PRODUCT_ID = PRO
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })
  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('a paid subscription is a high-priority "new paying customer", deduped by subscription', async () => {
    await POST(event('subscription.active', { id: 'sub_1', status: 'active', product_id: PRO, metadata: { user_id: 'u1' }, customer: { email: 'a@b.com' } }))
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ kind: 'pro_paid', severity: 'high', dedupeKey: 'pro:paid:sub_1', body: 'a@b.com' }))
  })

  it('a trialing subscription is a normal "trial started"', async () => {
    await POST(event('subscription.active', { id: 'sub_2', status: 'trialing', product_id: PRO, metadata: { user_id: 'u2' } }))
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ kind: 'pro_trial', severity: 'normal' }))
  })

  it('a revoked subscription says the subscription ended', async () => {
    await POST(event('subscription.revoked', { id: 'sub_3', status: 'canceled', product_id: PRO, metadata: { user_id: 'u3' } }))
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ kind: 'pro_ended', dedupeKey: 'pro:ended:sub_3' }))
  })

  it('ignores products that are not Pro', async () => {
    await POST(event('subscription.active', { id: 'sub_4', status: 'active', product_id: 'other', metadata: { user_id: 'u4' } }))
    expect(notifyAdmins).not.toHaveBeenCalled()
  })

  it('a failing notifier never fails the webhook', async () => {
    notifyAdmins.mockRejectedValueOnce(new Error('db down'))
    const res = await POST(event('subscription.active', { id: 'sub_5', status: 'active', product_id: PRO, metadata: { user_id: 'u5' } }))
    expect(res.status).toBeLessThan(500)
  })
})
