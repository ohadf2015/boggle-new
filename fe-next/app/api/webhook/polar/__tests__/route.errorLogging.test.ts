/**
 * A mid-handler throw is the payment path's darkest spot: it used to log a bare
 * console line with no event, no delivery id and no user, so a failed grant was
 * indistinguishable from noise. Pin that every throw reaches the structured
 * logger with enough context to find the Polar delivery — and that nothing
 * from the payload (email, name, metadata) rides along.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let signatureValid = true
vi.mock('@/lib/polar', () => ({
  PolarClient: { validateWebhookSignature: () => signatureValid },
}))

const logSubscriptionEvent = vi.fn()
vi.mock('@/lib/subscriptions', () => ({
  upsertSubscription: vi.fn(),
  grantProFromOrder: vi.fn(),
  grantProFromCheckout: vi.fn(),
  logSubscriptionEvent: (...args: unknown[]) => logSubscriptionEvent(...args),
  subscriptionRowIsPastDue: vi.fn().mockResolvedValue(false),
}))
vi.mock('@/lib/education/dunning', () => ({ maybeSendPaymentFailedEmail: vi.fn() }))
vi.mock('@/backend/utils/educationTelemetry', () => ({ captureEduServerEvents: vi.fn() }))

const loggerError = vi.fn()
vi.mock('@/backend/utils/logger', () => ({
  default: {
    error: (...args: unknown[]) => loggerError(...args),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { POST } from '../route'

const PRO_PRODUCT_ID = 'prod-pro-1'
const TEACHER_EMAIL = 'teacher@school.example'

function request(body: string) {
  return new Request('https://www.lexiclash.live/api/webhook/polar', {
    method: 'POST',
    headers: {
      'webhook-id': 'msg_delivery_7',
      'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      'webhook-signature': 'v1,whatever',
    },
    body,
  }) as never
}

/** Everything the logger was handed, as Sentry would serialize it. */
function loggedPayloads(): string {
  return JSON.stringify(loggerError.mock.calls)
}

describe('polar webhook structured error logging', () => {
  beforeEach(() => {
    loggerError.mockClear()
    logSubscriptionEvent.mockReset()
    signatureValid = true
    process.env.POLAR_PRO_PRODUCT_ID = PRO_PRODUCT_ID
    process.env.POLAR_WEBHOOK_SECRET = 'test-webhook-secret'
  })

  afterEach(() => {
    delete process.env.POLAR_PRO_PRODUCT_ID
    delete process.env.POLAR_WEBHOOK_SECRET
  })

  it('logs event context and returns 500 when processing throws', async () => {
    logSubscriptionEvent.mockRejectedValue(new Error('supabase upsert failed'))

    const res = await POST(
      request(
        JSON.stringify({
          type: 'subscription.active',
          data: {
            id: 'sub_42',
            status: 'active',
            product_id: PRO_PRODUCT_ID,
            customer: { email: TEACHER_EMAIL, name: 'Dana Teacher' },
            metadata: { user_id: 'u1', email: TEACHER_EMAIL },
          },
        }),
      ),
    )

    expect(res.status).toBe(500)
    expect(loggerError).toHaveBeenCalledWith(
      'POLAR_WEBHOOK',
      expect.stringContaining('supabase upsert failed'),
      expect.objectContaining({
        errorName: 'Error',
        errorMessage: 'supabase upsert failed',
        eventType: 'subscription.active',
        webhookId: 'msg_delivery_7',
        objectId: 'sub_42',
        userId: 'u1',
        stack: expect.stringContaining('Error: supabase upsert failed'),
      }),
    )
  })

  it('logs a malformed payload with the delivery id and still returns 500', async () => {
    const res = await POST(request('{ not json'))

    expect(res.status).toBe(500)
    expect(loggerError).toHaveBeenCalledWith(
      'POLAR_WEBHOOK',
      expect.any(String),
      expect.objectContaining({ errorName: 'SyntaxError', webhookId: 'msg_delivery_7' }),
    )
  })

  it('never logs payload PII', async () => {
    logSubscriptionEvent.mockRejectedValue(new Error('network timeout'))

    await POST(
      request(
        JSON.stringify({
          type: 'order.paid',
          data: {
            id: 'ord_9',
            product_id: PRO_PRODUCT_ID,
            total_amount: 900,
            customer: { email: TEACHER_EMAIL, name: 'Dana Teacher' },
            metadata: { user_id: 'u1', email: TEACHER_EMAIL },
          },
        }),
      ),
    )

    expect(loggerError).toHaveBeenCalled()
    expect(loggedPayloads()).not.toContain(TEACHER_EMAIL)
    expect(loggedPayloads()).not.toContain('Dana Teacher')
  })
})
