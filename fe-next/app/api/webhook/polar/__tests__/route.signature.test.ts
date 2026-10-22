/**
 * Real signature path — not the mocked flag in route.test.ts.
 * A bad HMAC must 401 before any grant. A Standard Webhooks `whsec_` signature
 * on checkout.completed must grant Teacher Pro.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'

vi.mock('@/lib/education/proFunnelServer', () => ({
  buildProCheckoutSucceededEvent: () => ({}),
  buildProTrialSucceededEvent: () => ({}),
  buildTrialActivatedEvent: () => ({}),
  buildTrialStartEvent: () => ({}),
  buildTeacherTrialStartedEvent: () => ({}),
  buildCheckoutCompleteEvent: () => ({}),
  buildPaidEvent: () => ({}),
  buildTeacherTrialConvertedEvent: () => ({}),
  buildTrialExpiredEvent: () => ({}),
  buildTrialStartedEvent: () => ({}),
  buildTeacherProUpgradedEvent: () => ({}),
  captureProFunnelServerEvent: () => {},
}))
vi.mock('@/lib/education/dunning', () => ({ maybeSendPaymentFailedEmail: vi.fn() }))

const grantProFromCheckout = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: vi.fn(),
  grantProFromOrder: vi.fn(),
  grantProFromCheckout: (...args: unknown[]) => grantProFromCheckout(...args),
  logSubscriptionEvent: vi.fn(),
}))

import { POST } from '../route'

const PRO = 'prod-pro-1'
const SECRET = 'whsec_' + Buffer.from('teacher-pro-webhook-key').toString('base64')

function signed(body: string, secret = SECRET, signature?: string) {
  const id = 'msg_checkout_1'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const sig = signature ?? createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
  return new Request('https://www.lexiclash.live/api/webhook/polar', {
    method: 'POST',
    headers: {
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${sig}`,
    },
    body,
  }) as never
}

describe('polar webhook signature + checkout.completed grant', () => {
  beforeEach(() => {
    grantProFromCheckout.mockClear()
    process.env.POLAR_WEBHOOK_SECRET = SECRET
    process.env.POLAR_PRO_PRODUCT_ID = PRO
  })

  afterEach(() => {
    delete process.env.POLAR_WEBHOOK_SECRET
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('rejects a bad signature and does not grant Teacher Pro', async () => {
    const body = JSON.stringify({
      type: 'checkout.completed',
      data: { id: 'chk_bad', status: 'succeeded', product_id: PRO, metadata: { user_id: 'u1' } },
    })
    const res = await POST(signed(body, SECRET, 'bm90LXRoZS1rZXk='))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Invalid signature' })
    expect(grantProFromCheckout).not.toHaveBeenCalled()
  })

  it('grants Teacher Pro on a checkout.completed signed with POLAR_WEBHOOK_SECRET', async () => {
    const body = JSON.stringify({
      type: 'checkout.completed',
      data: {
        id: 'chk_ok',
        status: 'succeeded',
        product_id: PRO,
        subscription_id: 'sub_paid',
        metadata: { user_id: 'teacher-1' },
      },
    })
    const res = await POST(signed(body))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ received: true })
    expect(grantProFromCheckout).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'teacher-1',
      status: 'active',
      providerSubscriptionId: 'sub_paid',
      providerProductId: PRO,
    }))
  })
})
