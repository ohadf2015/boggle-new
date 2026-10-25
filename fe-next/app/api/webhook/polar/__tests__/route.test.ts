import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Signature validation is covered by lib/__tests__/polar.test.ts — here we test event mapping.
let signatureValid = true
vi.mock('@/lib/polar', () => ({
  PolarClient: { validateWebhookSignature: () => signatureValid },
}))
const upsertSubscription = vi.fn()
const grantProFromOrder = vi.fn()
const grantProFromCheckout = vi.fn()
const logSubscriptionEvent = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: (...args: unknown[]) => upsertSubscription(...args),
  grantProFromOrder: (...args: unknown[]) => grantProFromOrder(...args),
  grantProFromCheckout: (...args: unknown[]) => grantProFromCheckout(...args),
  logSubscriptionEvent: (...args: unknown[]) => logSubscriptionEvent(...args),
}))
const maybeSendPaymentFailedEmail = vi.fn()
vi.mock('@/lib/education/dunning', () => ({
  maybeSendPaymentFailedEmail: (...args: unknown[]) => maybeSendPaymentFailedEmail(...args),
}))

// static import is safe: vitest hoists the vi.mock calls above it
import { POST } from '../route'

const PRO_PRODUCT_ID = 'prod-pro-1'

function polarEvent(type: string, data: Record<string, unknown>) {
  return new Request('https://www.lexiclash.live/api/webhook/polar', {
    method: 'POST',
    headers: {
      'webhook-id': 'msg_1',
      'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      'webhook-signature': 'v1,whatever',
    },
    body: JSON.stringify({ type, data }),
  }) as never
}

const subscriptionData = {
  id: 'sub_1',
  status: 'active',
  product_id: PRO_PRODUCT_ID,
  current_period_end: '2026-09-09T00:00:00Z',
  cancel_at_period_end: false,
  metadata: { user_id: 'u1' },
}

describe('polar webhook', () => {
  beforeEach(() => {
    upsertSubscription.mockClear()
    grantProFromOrder.mockClear()
    grantProFromCheckout.mockClear()
    logSubscriptionEvent.mockClear()
    signatureValid = true
    process.env.POLAR_PRO_PRODUCT_ID = PRO_PRODUCT_ID
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })

  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('rejects invalid signatures', async () => {
    signatureValid = false
    const res = await POST(polarEvent('subscription.active', subscriptionData))
    expect(res.status).toBe(401)
    expect(upsertSubscription).not.toHaveBeenCalled()
  })

  it('records a Polar trial as trialing Pro and stores trial_end on the row', async () => {
    await POST(polarEvent('subscription.created', {
      ...subscriptionData,
      status: 'trialing',
      trial_end: '2026-10-08T00:00:00Z',
      current_period_end: '2026-11-08T00:00:00Z',
      metadata: { user_id: 'u1', trial: true },
    }))
    expect(upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      tier: 'pro',
      status: 'trialing',
      currentPeriodEnd: '2026-10-08T00:00:00Z',
    }))
    expect(logSubscriptionEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ trial: true, trial_end: '2026-10-08T00:00:00Z' }),
    }))
  })

  it('a paid subscription.active logs trial: false and does not use a trial end', async () => {
    await POST(polarEvent('subscription.active', subscriptionData))
    expect(upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active',
      currentPeriodEnd: '2026-09-09T00:00:00Z',
    }))
    expect(logSubscriptionEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ trial: false, trial_end: null }),
    }))
  })

  it('grants Pro on subscription.active', async () => {
    const res = await POST(polarEvent('subscription.active', subscriptionData))
    expect(await res.json()).toMatchObject({ received: true })
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        tier: 'pro',
        status: 'active',
        providerSubscriptionId: 'sub_1',
        providerProductId: PRO_PRODUCT_ID,
        currentPeriodEnd: '2026-09-09T00:00:00Z',
        cancelAtPeriodEnd: false,
      })
    )
  })

  it('keeps Pro but flags cancel_at_period_end on subscription.canceled', async () => {
    const res = await POST(
      polarEvent('subscription.canceled', { ...subscriptionData, cancel_at_period_end: true })
    )
    expect(await res.json()).toMatchObject({ received: true })
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tier: 'pro', status: 'active', cancelAtPeriodEnd: true })
    )
  })

  it('downgrades to free on subscription.revoked', async () => {
    const res = await POST(
      polarEvent('subscription.revoked', { ...subscriptionData, status: 'canceled' })
    )
    expect(await res.json()).toMatchObject({ received: true })
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tier: 'free', status: 'canceled' })
    )
  })

  it('maps past_due status through', async () => {
    await POST(polarEvent('subscription.past_due', { ...subscriptionData, status: 'past_due' }))
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tier: 'pro', status: 'past_due' })
    )
  })

  it('fires the dunning email on past_due — the churn guard on a paying teacher', async () => {
    maybeSendPaymentFailedEmail.mockClear()
    await POST(
      polarEvent('subscription.past_due', {
        ...subscriptionData,
        status: 'past_due',
        customer: { email: 'teacher@school.org' },
      })
    )
    expect(maybeSendPaymentFailedEmail).toHaveBeenCalledWith({
      payload: expect.objectContaining({ type: 'subscription.past_due' }),
      userId: 'u1',
    })
  })

  it('does NOT fire dunning on a routine subscription.updated', async () => {
    maybeSendPaymentFailedEmail.mockClear()
    await POST(polarEvent('subscription.updated', subscriptionData))
    expect(maybeSendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it('a dunning failure still acks the webhook — state write already landed', async () => {
    maybeSendPaymentFailedEmail.mockRejectedValueOnce(new Error('resend down'))
    const res = await POST(polarEvent('subscription.past_due', { ...subscriptionData, status: 'past_due' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ received: true })
  })

  describe('foreign products share the endpoint and must not touch a Teacher Pro row', () => {
    for (const type of ['subscription.active', 'subscription.updated', 'subscription.canceled', 'subscription.revoked', 'subscription.past_due']) {
      it(`ignores ${type} for a non-Teacher-Pro product`, async () => {
        const res = await POST(polarEvent(type, { ...subscriptionData, product_id: 'prod-imposketch-pack' }))
        expect(res.status).toBe(200)
        expect(upsertSubscription).not.toHaveBeenCalled()
      })
    }
  })

  describe('status mapping fails closed', () => {
    it('maps an unknown provider status to a non-Pro status, never active', async () => {
      await POST(polarEvent('subscription.updated', { ...subscriptionData, status: 'something_new' }))
      const status = upsertSubscription.mock.calls[0][0].status
      expect(['active', 'trialing', 'past_due']).not.toContain(status)
    })

    it('maps a first payment that never succeeded (incomplete) to a non-Pro status', async () => {
      await POST(polarEvent('subscription.updated', { ...subscriptionData, status: 'incomplete' }))
      expect(['active', 'trialing', 'past_due']).not.toContain(upsertSubscription.mock.calls[0][0].status)
    })

    it('maps unpaid (retries exhausted) to a non-Pro status', async () => {
      await POST(polarEvent('subscription.updated', { ...subscriptionData, status: 'unpaid' }))
      expect(['active', 'trialing', 'past_due']).not.toContain(upsertSubscription.mock.calls[0][0].status)
    })
  })

  it('falls back to created_at when Polar sends modified_at null (an object never modified)', async () => {
    await POST(polarEvent('subscription.created', { ...subscriptionData, modified_at: null, created_at: '2026-10-09T09:00:00Z' }))
    expect(upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({ eventAt: '2026-10-09T09:00:00Z' }))
  })

  it('passes the provider modified_at so an older delivery cannot overwrite a newer state', async () => {
    await POST(polarEvent('subscription.updated', { ...subscriptionData, modified_at: '2026-10-09T10:00:00Z' }))
    expect(upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({ eventAt: '2026-10-09T10:00:00Z' }))
    upsertSubscription.mockClear()
    await POST(polarEvent('subscription.revoked', { ...subscriptionData, status: 'canceled', modified_at: '2026-10-09T11:00:00Z' }))
    expect(upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({ eventAt: '2026-10-09T11:00:00Z' }))
  })

  it('grants nothing when no user id is present', async () => {
    await POST(
      polarEvent('subscription.active', { ...subscriptionData, metadata: {}, customer: {} })
    )
    expect(upsertSubscription).not.toHaveBeenCalled()
  })

  it('falls back to customer.external_id when metadata is absent', async () => {
    await POST(
      polarEvent('subscription.active', {
        ...subscriptionData,
        metadata: {},
        customer: { external_id: 'u2' },
      })
    )
    expect(upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2' }))
  })

  describe('order events — belt-and-braces grant that must not own the row', () => {
    // 2026-09-09 production: order.created arrived ~1.5s after subscription.active
    // and its full upsert wiped current_period_end + the provider subscription id.
    // The route now delegates to grantProFromOrder, which stamps only the order id
    // when a provider row exists.

    it('order.created is log-only: it fires before payment, so it never grants', async () => {
      const res = await POST(
        polarEvent('order.created', { id: 'ord_1', product_id: PRO_PRODUCT_ID, total_amount: 900, metadata: { user_id: 'u1' } })
      )
      expect(await res.json()).toMatchObject({ received: true })
      expect(grantProFromOrder).not.toHaveBeenCalled()
      expect(upsertSubscription).not.toHaveBeenCalled()
    })

    it('a paid order.paid may grant via the order path', async () => {
      const res = await POST(
        polarEvent('order.paid', { id: 'ord_1', product_id: PRO_PRODUCT_ID, total_amount: 900, metadata: { user_id: 'u1' } })
      )
      expect(await res.json()).toMatchObject({ received: true })
      expect(grantProFromOrder).toHaveBeenCalledWith({ userId: 'u1', providerOrderId: 'ord_1', allowGrant: true })
    })

    it('a $0 order.paid (trial start) only stamps an existing row, never grants active Pro', async () => {
      await POST(
        polarEvent('order.paid', { id: 'ord_0', product_id: PRO_PRODUCT_ID, total_amount: 0, metadata: { user_id: 'u1' } })
      )
      expect(grantProFromOrder).toHaveBeenCalledWith({ userId: 'u1', providerOrderId: 'ord_0', allowGrant: false })
    })

    it('order.created with a non-Pro product grants nothing', async () => {
      await POST(
        polarEvent('order.created', { id: 'ord_2', product_id: 'prod-something-else', metadata: { user_id: 'u1' } })
      )
      expect(grantProFromOrder).not.toHaveBeenCalled()
      expect(upsertSubscription).not.toHaveBeenCalled()
    })
  })

  describe('checkout completion — grant Teacher Pro, never a silent 200', () => {
    it('grants Pro on checkout.completed', async () => {
      const res = await POST(polarEvent('checkout.completed', {
        id: 'chk_1',
        status: 'succeeded',
        product_id: PRO_PRODUCT_ID,
        subscription_id: 'sub_9',
        metadata: { user_id: 'u1' },
      }))
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ received: true })
      expect(grantProFromCheckout).toHaveBeenCalledWith({
        userId: 'u1',
        status: 'active',
        providerSubscriptionId: 'sub_9',
        providerOrderId: null,
        providerProductId: PRO_PRODUCT_ID,
        currentPeriodEnd: null,
      })
      expect(upsertSubscription).not.toHaveBeenCalled()
    })

    it('grants Pro on checkout.updated when Polar status is succeeded', async () => {
      await POST(polarEvent('checkout.updated', {
        id: 'chk_2',
        status: 'succeeded',
        product_id: PRO_PRODUCT_ID,
        external_customer_id: 'u3',
      }))
      expect(grantProFromCheckout).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u3',
        status: 'active',
        providerProductId: PRO_PRODUCT_ID,
      }))
    })

    it('does not grant on checkout.updated while the session is still open', async () => {
      const res = await POST(polarEvent('checkout.updated', {
        id: 'chk_3',
        status: 'open',
        product_id: PRO_PRODUCT_ID,
        metadata: { user_id: 'u1' },
      }))
      expect(res.status).toBe(200)
      expect(grantProFromCheckout).not.toHaveBeenCalled()
    })

    it('503s naming POLAR_PRO_PRODUCT_ID instead of acking a completion it cannot tier', async () => {
      delete process.env.POLAR_PRO_PRODUCT_ID
      const res = await POST(polarEvent('checkout.completed', {
        id: 'chk_4',
        status: 'succeeded',
        product_id: 'prod-anything',
        metadata: { user_id: 'u1' },
      }))
      expect(res.status).toBe(503)
      expect(await res.json()).toMatchObject({
        error: 'POLAR_PRO_PRODUCT_ID is not configured',
        missing: ['POLAR_PRO_PRODUCT_ID'],
      })
      expect(grantProFromCheckout).not.toHaveBeenCalled()
    })

    it('503s naming POLAR_WEBHOOK_SECRET when the secret is unset (Polar retries 5xx, not 401)', async () => {
      delete process.env.POLAR_WEBHOOK_SECRET
      const res = await POST(polarEvent('checkout.completed', {
        id: 'chk_5',
        status: 'succeeded',
        product_id: PRO_PRODUCT_ID,
        metadata: { user_id: 'u1' },
      }))
      expect(res.status).toBe(503)
      expect(await res.json()).toMatchObject({ missing: ['POLAR_WEBHOOK_SECRET'] })
      expect(grantProFromCheckout).not.toHaveBeenCalled()
      expect(upsertSubscription).not.toHaveBeenCalled()
    })
  })
})
