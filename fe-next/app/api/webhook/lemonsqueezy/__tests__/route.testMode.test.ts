import { describe, it, expect, vi, beforeEach } from 'vitest'

// Signature validation is not what this test is about — the guard sits AFTER it, so a valid
// signature is the interesting case (an attacker doesn't need one: Ohad's own test purchase is
// signed and would still grant Pro for free).
vi.mock('@/lib/lemonsqueezy', () => ({
  LemonSqueezyClient: { validateWebhookSignature: () => true },
}))
const upsertSubscription = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: (...args: unknown[]) => upsertSubscription(...args),
  logSubscriptionEvent: vi.fn(),
}))

// static import is safe: vitest hoists the vi.mock calls above it
import { POST } from '../route'

const testModeEvent = (test_mode: boolean) =>
  new Request('https://www.lexiclash.live/api/webhook/lemonsqueezy', {
    method: 'POST',
    headers: { 'x-signature': 'whatever' },
    body: JSON.stringify({
      meta: { event_name: 'subscription_created', custom_data: { user_id: 'u1' } },
      data: { attributes: { test_mode, status: 'active', variant_id: '1910376' } },
    }),
  }) as never

describe('lemonsqueezy webhook: test-mode guard', () => {
  beforeEach(() => {
    upsertSubscription.mockClear()
    delete process.env.LEMONSQUEEZY_ALLOW_TEST_WEBHOOKS
  })

  it('grants nothing for a test-mode purchase (LS test card must not buy Pro)', async () => {
    const res = await POST(testModeEvent(true))
    expect(await res.json()).toMatchObject({ ignored: 'test_mode' })
    expect(upsertSubscription).not.toHaveBeenCalled()
  })

  it('opt-in flag lets us exercise the flow ourselves', async () => {
    process.env.LEMONSQUEEZY_ALLOW_TEST_WEBHOOKS = 'true'
    const res = await POST(testModeEvent(true))
    expect(await res.json()).not.toMatchObject({ ignored: 'test_mode' })
  })

  it('leaves live purchases alone', async () => {
    const res = await POST(testModeEvent(false))
    expect(await res.json()).not.toMatchObject({ ignored: 'test_mode' })
  })
})
