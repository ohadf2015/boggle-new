/**
 * Trial → paid conversion proof (writer-key ≠ reader-key fix, audit 2026-11-23).
 *
 * The funnel's terminal step used to listen ONLY on the `subscription.active`
 * envelope. Polar does not re-send it when a trial flips to paid — the
 * conversion arrives inside the catch-all `subscription.updated` (and the
 * period roll fires `subscription.cycled`). So `teacher_trial_converted` /
 * `teacher_subscription_active` could never fire and the funnel read 0
 * conversions forever. The unified key is the stored trialing→active
 * transition, detected before the entitlement upsert.
 *
 * The sequence test below replays the exact webhook envelopes a real Teacher
 * Pro trial signup produces and asserts every funnel step lands under the
 * same user key with the exact event_type strings the readout
 * (supabase/reports/teacher_trial_funnel.sql) queries — writer key = reader key.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

vi.mock('@/lib/polar', () => ({
  PolarClient: { validateWebhookSignature: () => true },
}))
const upsertSubscription = vi.fn()
const logSubscriptionEvent = vi.fn()
const subscriptionRowIsPastDue = vi.fn().mockResolvedValue(false)
const subscriptionRowStatus = vi.fn().mockResolvedValue(null)
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: (...args: unknown[]) => upsertSubscription(...args),
  grantProFromOrder: vi.fn(),
  grantProFromCheckout: vi.fn(),
  logSubscriptionEvent: (...args: unknown[]) => logSubscriptionEvent(...args),
  subscriptionRowIsPastDue: (...args: unknown[]) => subscriptionRowIsPastDue(...args),
  subscriptionRowStatus: (...args: unknown[]) => subscriptionRowStatus(...args),
}))
vi.mock('@/lib/education/dunning', () => ({ maybeSendPaymentFailedEmail: vi.fn() }))
const capture = vi.fn()
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (...a: unknown[]) => capture(...a) }),
}))

import { POST } from '../route'

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
const TRIAL_DATA = {
  status: 'trialing',
  metadata: { user_id: 'u1', trial: true },
  trial_end: '2026-12-07T00:00:00.000Z',
}

const durableTypes = () => logSubscriptionEvent.mock.calls.map((c) => c[0].eventType)
const capturedEvents = () => capture.mock.calls.map((c) => c[0].event)

describe('polar webhook — trial → paid conversion (unified transition key)', () => {
  beforeEach(() => {
    upsertSubscription.mockReset()
    logSubscriptionEvent.mockReset()
    capture.mockReset()
    subscriptionRowIsPastDue.mockReset()
    subscriptionRowIsPastDue.mockResolvedValue(false)
    subscriptionRowStatus.mockReset()
    subscriptionRowStatus.mockResolvedValue(null)
    process.env.POLAR_PRO_PRODUCT_ID = PRO
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })
  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('Given a real trial sequence (active-trialing → updated-active), When replayed, Then every funnel step lands under one user key and the conversion fires exactly once', async () => {
    // 1. Polar grants the 14-day trial: subscription.active, status=trialing.
    let res = await POST(polarEvent('subscription.active', sub(TRIAL_DATA)))
    expect(res.status).toBe(200)
    expect(durableTypes()).toContain('teacher_trial_started')
    expect(durableTypes()).not.toContain('teacher_subscription_active')
    expect(capturedEvents()).toContain('teacher_trial_started')
    expect(capturedEvents()).not.toContain('teacher_trial_converted')

    // 2. Fourteen days later the card charges: the trial flips to paid. Polar
    // delivers this as subscription.updated (status active) — NOT a second
    // subscription.active. The stored row still reads trialing.
    logSubscriptionEvent.mockClear()
    capture.mockClear()
    subscriptionRowStatus.mockResolvedValue('trialing')
    res = await POST(polarEvent('subscription.updated', sub({
      status: 'active',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-12-07T00:00:00.000Z',
    })))
    expect(res.status).toBe(200)

    // The terminal step lands durably, flagged as a trial conversion, once.
    const terminalWrites = logSubscriptionEvent.mock.calls.filter(
      (c) => c[0].eventType === 'teacher_subscription_active',
    )
    expect(terminalWrites).toHaveLength(1)
    expect(terminalWrites[0][0]).toMatchObject({
      userId: 'u1',
      subscriptionId: 'sub_1',
      payload: expect.objectContaining({ trial_converted: true, via: 'subscription.updated' }),
    })
    // And every conversion analytics event fires exactly once.
    expect(capturedEvents()).toEqual([
      'edu_pro_checkout_succeeded',
      'checkout_complete',
      'paid',
      'teacher_pro_upgraded',
      'teacher_trial_converted',
    ])

    // 3. Polar then rolls the period (subscription.cycled, same status) and may
    // redeliver the updated event. The stored row is active now — silence.
    logSubscriptionEvent.mockClear()
    capture.mockClear()
    subscriptionRowStatus.mockResolvedValue('active')
    res = await POST(polarEvent('subscription.cycled', sub({ status: 'active' })))
    expect(res.status).toBe(200)
    res = await POST(polarEvent('subscription.updated', sub({ status: 'active' })))
    expect(res.status).toBe(200)
    expect(durableTypes()).not.toContain('teacher_subscription_active')
    expect(capturedEvents()).toEqual([])
  })

  it('Given a plain renewal (stored active → active), When updated, Then it is not counted as a conversion', async () => {
    subscriptionRowStatus.mockResolvedValue('active')
    const res = await POST(polarEvent('subscription.updated', sub({ status: 'active' })))
    expect(res.status).toBe(200)
    expect(capturedEvents()).toEqual([])
    expect(durableTypes()).not.toContain('teacher_subscription_active')
  })

  it('Given a dunning recovery (stored past_due → active), When updated, Then payment_recovered fires but no trial conversion', async () => {
    subscriptionRowStatus.mockResolvedValue('past_due')
    subscriptionRowIsPastDue.mockResolvedValue(true)
    const res = await POST(polarEvent('subscription.updated', sub({ status: 'active' })))
    expect(res.status).toBe(200)
    expect(capturedEvents()).toEqual(['payment_recovered'])
    expect(durableTypes()).not.toContain('teacher_subscription_active')
  })

  it('Given a first-ever paid checkout with no stored row, When subscription.active arrives, Then the direct-conversion path still fires', async () => {
    subscriptionRowStatus.mockResolvedValue(null)
    const res = await POST(polarEvent('subscription.active', sub()))
    expect(res.status).toBe(200)
    expect(capturedEvents()).toEqual([
      'edu_pro_checkout_succeeded',
      'checkout_complete',
      'paid',
      'teacher_pro_upgraded',
    ])
    expect(durableTypes()).toContain('teacher_subscription_active')
  })

  it('Given every durable step the sequence writes, When matched against the SQL readout, Then every writer key is a reader key', async () => {
    const report = readFileSync(
      path.join(__dirname, '../../../../../supabase/reports/teacher_trial_funnel.sql'),
      'utf8',
    )
    subscriptionRowStatus.mockResolvedValue('trialing')
    await POST(polarEvent('subscription.active', sub(TRIAL_DATA)))
    await POST(polarEvent('subscription.updated', sub({
      status: 'active',
      metadata: { user_id: 'u1', trial: true },
      trial_end: '2026-12-07T00:00:00.000Z',
    })))
    const written = new Set(durableTypes())
    expect(written.has('teacher_trial_started')).toBe(true)
    expect(written.has('teacher_subscription_active')).toBe(true)
    // Writer-key = reader-key: every CANONICAL funnel row the code writes must
    // be countable by the report. (Raw Polar envelope types like
    // 'subscription.updated' are logged as envelopes, not funnel rows — the
    // report reads them only through its explicit legacy branches.)
    const canonical = [...written].filter((t) => t.startsWith('teacher_') || t === 'checkout_started')
    expect(canonical.length).toBeGreaterThan(0)
    for (const eventType of canonical) {
      expect(report).toContain(eventType)
    }
  })
})
