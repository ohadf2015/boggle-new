import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'
import { LemonSqueezyClient } from '../lemonsqueezy'

describe('LemonSqueezyClient.validateWebhookSignature', () => {
  const ORIGINAL_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  afterEach(() => {
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = ORIGINAL_SECRET
  })

  it('rejects (fails closed) when the webhook secret is not configured', () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET

    // A misconfigured deploy must not accept forged webhook payloads just
    // because the secret env var is missing.
    expect(LemonSqueezyClient.validateWebhookSignature('{"any":"body"}', 'anything')).toBe(false)
  })

  describe('with a configured secret', () => {
    beforeEach(() => {
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-secret'
    })

    it('accepts a correctly signed payload', () => {
      const rawBody = '{"meta":{"event_name":"order_created"}}'
      const signature = createHmac('sha256', 'test-secret').update(rawBody).digest('hex')

      expect(LemonSqueezyClient.validateWebhookSignature(rawBody, signature)).toBe(true)
    })

    it('rejects a payload with a mismatched signature', () => {
      const rawBody = '{"meta":{"event_name":"order_created"}}'
      const wrongSignature = createHmac('sha256', 'test-secret').update('tampered').digest('hex')

      expect(LemonSqueezyClient.validateWebhookSignature(rawBody, wrongSignature)).toBe(false)
    })

    it('rejects a malformed (non-hex) signature without throwing', () => {
      expect(() => LemonSqueezyClient.validateWebhookSignature('{}', 'not-a-signature')).not.toThrow()
      expect(LemonSqueezyClient.validateWebhookSignature('{}', 'not-a-signature')).toBe(false)
    })

    it('rejects an empty signature', () => {
      expect(LemonSqueezyClient.validateWebhookSignature('{}', '')).toBe(false)
    })
  })
})
