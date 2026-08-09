/**
 * Polar.sh Client
 * Handles checkout session creation, customer portal sessions, and webhook
 * signature validation (Standard Webhooks spec).
 *
 * Replaces the Lemon Squeezy integration (store permanently rejected at KYC,
 * 2026-08-09). Tier limits/config stay in ./lemonsqueezy (provider-agnostic data).
 *
 * Env:
 * - POLAR_ACCESS_TOKEN       Organization access token (sandbox or production)
 * - POLAR_PRO_PRODUCT_ID     Product ID for Teacher Pro ($9/mo)
 * - POLAR_WEBHOOK_SECRET     Webhook endpoint secret from Polar dashboard
 * - POLAR_ENVIRONMENT        'sandbox' (default) | 'production'
 */

import { createHmac, timingSafeEqual } from 'crypto'

// ---- Environment ----

export const POLAR_API_BASES = {
  sandbox: 'https://sandbox-api.polar.sh',
  production: 'https://api.polar.sh',
} as const

export type PolarEnvironment = keyof typeof POLAR_API_BASES

export function getPolarEnvironment(): PolarEnvironment {
  return process.env.POLAR_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
}

export function getProProductId(): string {
  const productId = process.env.POLAR_PRO_PRODUCT_ID
  if (!productId) {
    throw new Error('POLAR_PRO_PRODUCT_ID is not configured')
  }
  return productId
}

// ---- API Client ----

export function getPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is not configured')
  }
  return new PolarClient(accessToken, getPolarEnvironment())
}

export class PolarClient {
  private accessToken: string
  private baseUrl: string

  constructor(accessToken: string, environment: PolarEnvironment = 'sandbox') {
    this.accessToken = accessToken
    this.baseUrl = POLAR_API_BASES[environment]
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
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
   * Create a checkout session for a product. Returns the URL to redirect the
   * user to. `external_customer_id` + `metadata.user_id` both carry our user
   * id; Polar copies checkout metadata onto the resulting subscription, which
   * is how the webhook maps events back to a teacher.
   */
  async createCheckout({
    userId,
    productId,
    email,
    redirectUrl,
  }: {
    userId: string
    productId: string
    email?: string
    redirectUrl?: string
  }): Promise<string> {
    const response = await this.request<{ url: string }>('/v1/checkouts/', {
      method: 'POST',
      body: JSON.stringify({
        products: [productId],
        success_url:
          redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/teacher?checkout=success`,
        ...(email ? { customer_email: email } : {}),
        external_customer_id: userId,
        metadata: { user_id: userId },
      }),
    })

    return response.url
  }

  /**
   * Create a customer portal session for a customer by their external id
   * (our user id, set at checkout time). Returns the portal URL.
   */
  async createCustomerPortalUrl(externalCustomerId: string): Promise<string | null> {
    const response = await this.request<{ customer_portal_url: string }>(
      '/v1/customer-sessions/',
      {
        method: 'POST',
        body: JSON.stringify({ external_customer_id: externalCustomerId }),
      }
    )
    return response.customer_portal_url ?? null
  }

  /**
   * Validate a Polar webhook signature (Standard Webhooks spec).
   *
   * Signed content: `${webhook-id}.${webhook-timestamp}.${rawBody}`
   * Header `webhook-signature` is a space-delimited list of `v1,<base64>` pairs
   * (multiple during secret rotation).
   *
   * Gotcha per Polar docs: the secret configured on Polar must be base64
   * encoded before being used as the HMAC key. We also accept the raw secret
   * as a fallback so a dashboard/format change fails soft, never open.
   */
  static validateWebhookSignature(
    rawBody: string,
    {
      id,
      timestamp,
      signature,
    }: { id: string | null; timestamp: string | null; signature: string | null }
  ): boolean {
    const secret = process.env.POLAR_WEBHOOK_SECRET
    if (!secret) {
      console.error('[Polar] POLAR_WEBHOOK_SECRET not configured — rejecting webhook')
      return false
    }
    if (!id || !timestamp || !signature) return false

    // Replay protection: reject events older than 5 minutes.
    const timestampSeconds = Number(timestamp)
    if (!Number.isFinite(timestampSeconds)) return false
    if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false

    const signedContent = `${id}.${timestamp}.${rawBody}`
    const candidates = [
      Buffer.from(secret).toString('base64'), // documented: base64-encoded secret
      secret, // fallback: raw secret bytes
    ]

    const presented = signature
      .split(' ')
      .map((part) => part.split(','))
      .filter(([version]) => version === 'v1')
      .map(([, sig]) => sig)
      .filter(Boolean)

    for (const key of candidates) {
      const expected = createHmac('sha256', key).update(signedContent).digest('base64')
      for (const sig of presented) {
        try {
          if (timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return true
        } catch {
          // length mismatch — keep checking other candidates
        }
      }
    }
    return false
  }
}
