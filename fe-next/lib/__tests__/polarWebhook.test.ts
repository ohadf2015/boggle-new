import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Simulated end-to-end of the Polar entitlement lifecycle:
 * signed webhook delivery -> route handler -> entitlement grant/revoke.
 * The subscriptions persistence layer is mocked; the signature verification
 * and event mapping run for real. (Live sandbox E2E runs against Polar's
 * sandbox org once product IDs exist — see PR test plan.)
 */

const upsertSubscription = vi.hoisted(() => vi.fn())
const logSubscriptionEvent = vi.hoisted(() => vi.fn())

vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription,
  logSubscriptionEvent,
}))

import { POST } from '@/app/api/webhook/polar/route'

const RAW_SECRET = 'dGVzdC1zZWNyZXQta2V5LWJ5dGVz'
const SECRET = `whsec_${RAW_SECRET}`
const PRO_PRODUCT = 'prod_pro_123'
const LIFETIME_PRODUCT = 'prod_life_456'
const USER_ID = 'user-abc-123'

function signedRequest(payload: object): NextRequest {
  const body = JSON.stringify(payload)
  const id = 'msg_test_1'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const key = Buffer.from(RAW_SECRET, 'base64')
  const sig = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
  return new NextRequest('http://localhost:3000/api/webhook/polar', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${sig}`,
    },
    body,
  })
}

describe('POST /api/webhook/polar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.POLAR_WEBHOOK_SECRET = SECRET
    process.env.POLAR_PRO_PRODUCT_ID = PRO_PRODUCT
    process.env.POLAR_LIFETIME_PRODUCT_ID = LIFETIME_PRODUCT
  })

  afterEach(() => {
    delete process.env.POLAR_WEBHOOK_SECRET
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_LIFETIME_PRODUCT_ID
  })

  it('rejects an unsigned/forged delivery with 401 and grants nothing', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhook/polar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'subscription.created', data: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(upsertSubscription).not.toHaveBeenCalled()
  })

  it('subscription.created grants Pro (monthly)', async () => {
    const res = await POST(
      signedRequest({
        type: 'subscription.created',
        data: {
          id: 'sub_1',
          status: 'active',
          product_id: PRO_PRODUCT,
          customer_id: 'cust_1',
          current_period_end: '2026-09-03T00:00:00Z',
          cancel_at_period_end: false,
          metadata: { user_id: USER_ID },
        },
      })
    )
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        tier: 'pro',
        status: 'active',
        polarSubscriptionId: 'sub_1',
        polarCustomerId: 'cust_1',
        polarProductId: PRO_PRODUCT,
        currentPeriodEnd: '2026-09-03T00:00:00Z',
        cancelAtPeriodEnd: false,
      })
    )
    expect(logSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, eventType: 'polar:subscription.created' })
    )
  })

  it('subscription.canceled keeps Pro until period end (cancel_at_period_end)', async () => {
    const res = await POST(
      signedRequest({
        type: 'subscription.canceled',
        data: {
          id: 'sub_1',
          status: 'canceled',
          product_id: PRO_PRODUCT,
          customer_id: 'cust_1',
          current_period_end: '2026-09-03T00:00:00Z',
          metadata: { user_id: USER_ID },
        },
      })
    )
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        tier: 'pro',
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: '2026-09-03T00:00:00Z',
      })
    )
  })

  it('subscription.revoked downgrades to free immediately', async () => {
    const res = await POST(
      signedRequest({
        type: 'subscription.revoked',
        data: {
          id: 'sub_1',
          status: 'revoked',
          product_id: PRO_PRODUCT,
          customer_id: 'cust_1',
          metadata: { user_id: USER_ID },
        },
      })
    )
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, tier: 'free', status: 'canceled' })
    )
  })

  it('order.paid on the lifetime product grants Pro with no period end', async () => {
    const res = await POST(
      signedRequest({
        type: 'order.paid',
        data: {
          id: 'order_1',
          product_id: LIFETIME_PRODUCT,
          customer_id: 'cust_1',
          metadata: { user_id: USER_ID },
        },
      })
    )
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        tier: 'pro',
        status: 'active',
        polarOrderId: 'order_1',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
    )
  })

  it('order.paid on the subscription product does NOT double-grant', async () => {
    const res = await POST(
      signedRequest({
        type: 'order.paid',
        data: {
          id: 'order_2',
          product_id: PRO_PRODUCT,
          customer_id: 'cust_1',
          metadata: { user_id: USER_ID },
        },
      })
    )
    expect(res.status).toBe(200)
    expect(upsertSubscription).not.toHaveBeenCalled()
  })

  it('falls back to customer external_id when metadata is absent', async () => {
    const res = await POST(
      signedRequest({
        type: 'subscription.created',
        data: {
          id: 'sub_9',
          status: 'active',
          product_id: PRO_PRODUCT,
          customer_id: 'cust_9',
          customer: { external_id: USER_ID },
        },
      })
    )
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, tier: 'pro' })
    )
  })

  it('grants nothing when no user identity is present (and still 200s)', async () => {
    const res = await POST(
      signedRequest({
        type: 'subscription.created',
        data: { id: 'sub_x', status: 'active', product_id: PRO_PRODUCT },
      })
    )
    expect(res.status).toBe(200)
    expect(upsertSubscription).not.toHaveBeenCalled()
  })
})
