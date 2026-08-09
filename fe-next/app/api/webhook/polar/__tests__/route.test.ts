import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Signature validation is covered by lib/__tests__/polar.test.ts — here we test event mapping.
let signatureValid = true
vi.mock('@/lib/polar', () => ({
  PolarClient: { validateWebhookSignature: () => signatureValid },
}))
const upsertSubscription = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: (...args: unknown[]) => upsertSubscription(...args),
  logSubscriptionEvent: vi.fn(),
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
    signatureValid = true
    process.env.POLAR_PRO_PRODUCT_ID = PRO_PRODUCT_ID
  })

  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
  })

  it('rejects invalid signatures', async () => {
    signatureValid = false
    const res = await POST(polarEvent('subscription.active', subscriptionData))
    expect(res.status).toBe(401)
    expect(upsertSubscription).not.toHaveBeenCalled()
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
})
