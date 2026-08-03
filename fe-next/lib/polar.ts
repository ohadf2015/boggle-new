/**
 * Polar.sh Client
 * Merchant-of-record replacement for Lemon Squeezy (store rejected 2026-08-02).
 *
 * - Checkout URL generation (subscriptions + one-time lifetime purchases)
 * - Customer portal sessions ("Manage subscription")
 * - Webhook signature validation per the Standard Webhooks spec
 *   (webhook-id / webhook-timestamp / webhook-signature headers,
 *    HMAC-SHA256 over `${id}.${timestamp}.${body}`, base64 secret w/ whsec_ prefix)
 *
 * Plain fetch — no @polar-sh/sdk dependency, mirrors the LS client style.
 */

import { createHmac, timingSafeEqual } from 'crypto'

export type PolarProductKind = 'pro' | 'lifetime'

export function getPolarApiBase(): string {
  return process.env.POLAR_SERVER === 'production'
    ? 'https://api.polar.sh'
    : 'https://sandbox-api.polar.sh'
}

/** Product IDs are created by Ohad in the Polar dashboard and injected via env. */
export function getPolarProductId(kind: PolarProductKind): string | undefined {
  if (kind === 'lifetime') return process.env.POLAR_LIFETIME_PRODUCT_ID
  return process.env.POLAR_PRO_PRODUCT_ID
}

/** Map a Polar product ID back to our internal product kind (null = unknown). */
export function getPolarProductKind(productId: string | undefined | null): PolarProductKind | null {
  if (!productId) return null
  if (productId === process.env.POLAR_PRO_PRODUCT_ID) return 'pro'
  if (productId === process.env.POLAR_LIFETIME_PRODUCT_ID) return 'lifetime'
  return null
}

export function getPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is not configured')
  }
  return new PolarClient(accessToken)
}

export class PolarClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${getPolarApiBase()}${path}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Polar API error: ${response.status} ${error}`)
    }

    return response.json()
  }

  /**
   * Create a checkout for a product. Returns the hosted checkout URL.
   * user_id rides in metadata, which Polar copies onto the resulting
   * order/subscription — the webhook handler reads it back from there.
   * external_id also tags the customer as a fallback identity path.
   */
  async createCheckout({
    userId,
    product,
    email,
    successUrl,
  }: {
    userId: string
    product: PolarProductKind
    email?: string
    successUrl?: string
  }): Promise<string> {
    const productId = getPolarProductId(product)
    if (!productId) {
      throw new Error(`No Polar product ID configured for: ${product}`)
    }

    const response = await this.request<{ url: string }>('/v1/checkouts/', {
      method: 'POST',
      body: JSON.stringify({
        products: [productId],
        success_url:
          successUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/teacher?checkout=success`,
        ...(email ? { customer_email: email } : {}),
        customer_external_id: userId,
        metadata: { user_id: userId },
      }),
    })

    return response.url
  }

  /**
   * Create a customer portal session for "Manage subscription".
   * Returns a short-lived portal URL.
   */
  async createCustomerPortalSession(customerId: string): Promise<string | null> {
    const response = await this.request<{ customer_portal_url?: string }>(
      '/v1/customer-sessions/',
      {
        method: 'POST',
        body: JSON.stringify({ customer_id: customerId }),
      }
    )
    return response.customer_portal_url ?? null
  }

  /**
   * Validate a Polar webhook delivery (Standard Webhooks spec).
   * Fails closed when POLAR_WEBHOOK_SECRET is missing or the timestamp is
   * outside the 5-minute replay window.
   */
  static validateWebhookSignature({
    rawBody,
    webhookId,
    timestamp,
    signatureHeader,
    toleranceSeconds = 300,
    nowSeconds,
  }: {
    rawBody: string
    webhookId: string | null
    timestamp: string | null
    signatureHeader: string | null
    toleranceSeconds?: number
    /** Injectable for tests; defaults to Date.now(). */
    nowSeconds?: number
  }): boolean {
    const secret = process.env.POLAR_WEBHOOK_SECRET
    if (!secret) {
      console.error('[Polar] POLAR_WEBHOOK_SECRET not configured — rejecting webhook')
      return false
    }
    if (!webhookId || !timestamp || !signatureHeader) return false

    const ts = Number(timestamp)
    const now = nowSeconds ?? Math.floor(Date.now() / 1000)
    if (!Number.isFinite(ts) || Math.abs(now - ts) > toleranceSeconds) return false

    // Standard Webhooks: secret may carry a whsec_ prefix; remainder is base64.
    const key = secret.startsWith('whsec_')
      ? Buffer.from(secret.slice('whsec_'.length), 'base64')
      : Buffer.from(secret, 'utf8')

    const expected = createHmac('sha256', key)
      .update(`${webhookId}.${timestamp}.${rawBody}`)
      .digest('base64')

    // Header can carry multiple space-separated "v1,<sig>" entries (rotation).
    const candidates = signatureHeader
      .split(' ')
      .map((part) => part.split(','))
      .filter(([version]) => version === 'v1')
      .map(([, sig]) => sig)
      .filter(Boolean)

    const expectedBuf = Buffer.from(expected)
    return candidates.some((sig) => {
      const sigBuf = Buffer.from(sig)
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
    })
  }
}
