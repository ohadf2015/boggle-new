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
 * - POLAR_ENVIRONMENT        'production' (default) | 'sandbox' (local/dev opt-in)
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays'

// ---- Environment ----

export const POLAR_API_BASES = {
  sandbox: 'https://sandbox-api.polar.sh',
  production: 'https://api.polar.sh',
} as const

export type PolarEnvironment = keyof typeof POLAR_API_BASES

/**
 * Production is the default: an unset/typo'd POLAR_ENVIRONMENT used to route
 * real teachers at sandbox-api.polar.sh, where checkout returns 201 and
 * collects nothing. Sandbox is opt-in only.
 */
export function getPolarEnvironment(): PolarEnvironment {
  return process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production'
}

export function getProProductId(): string {
  const productId = process.env.POLAR_PRO_PRODUCT_ID
  if (!productId) {
    throw new Error('POLAR_PRO_PRODUCT_ID is not configured')
  }
  return productId
}

/** Teacher Pro introductory trial. Paid checkouts send `allow_trial: false`. */
export const POLAR_PRO_TRIAL_DAYS = TEACHER_PRO_TRIAL_DAYS

// ---- API Client ----

export function getPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is not configured')
  }
  return new PolarClient(accessToken, getPolarEnvironment())
}

export class PolarApiError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`Polar API error: ${status} ${body}`)
  }
}

export class PolarClient {
  private accessToken: string
  private baseUrl: string

  constructor(accessToken: string, environment: PolarEnvironment) {
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
      throw new PolarApiError(response.status, error)
    }

    return response.json()
  }

  /**
   * Create a checkout session for a product. Returns the URL to redirect the
   * user to. `external_customer_id` + `metadata.user_id` both carry our user
   * id; Polar copies checkout metadata onto the resulting subscription, which
   * is how the webhook maps events back to a teacher.
   *
   * `allowTrial` defaults off. A paid checkout must send `allow_trial: false`
   * so it does not inherit a product-level Polar trial. The trial path sends
   * a 14-day day-interval and `metadata.trial: true`.
   */
  async createCheckout({
    userId,
    productId,
    email,
    redirectUrl,
    locale,
    allowTrial = false,
  }: {
    userId: string
    productId: string
    email?: string
    redirectUrl?: string
    /** Locale prefix for the fallback success_url (validated by callers). */
    locale?: string
    allowTrial?: boolean
  }): Promise<string> {
    const trial = allowTrial === true
    const successLocale = locale ?? 'en'
    const payload = {
      products: [productId],
      success_url:
        redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/${successLocale}/teacher?checkout=success`,
      external_customer_id: userId,
      metadata: { user_id: userId, trial, locale: successLocale },
      // Paid path must not inherit a trial configured on the Polar product.
      allow_trial: trial,
      ...(trial
        ? { trial_interval: 'day', trial_interval_count: POLAR_PRO_TRIAL_DAYS }
        : {}),
    }
    const post = (customerEmail?: string) =>
      this.request<{ url: string }>('/v1/checkouts/', {
        method: 'POST',
        body: JSON.stringify({ ...payload, ...(customerEmail ? { customer_email: customerEmail } : {}) }),
      })

    let response: { url: string }
    try {
      response = await post(email)
    } catch (err) {
      // Polar 422s an email whose domain does not resolve; the email is only a prefill, so a
      // teacher with such an address must still reach checkout.
      if (!email || !(err instanceof PolarApiError) || err.status !== 422 || !err.body.includes('customer_email')) throw err
      response = await post()
    }

    return response.url
  }

  /**
   * List subscriptions. Used by the Teacher Pro churn-watch cron so a missed
   * webhook cannot silently drop the only paying teacher.
   *
   * Polar's `active` filter is a tri-state: omit it and the API still tends to
   * return live rows only, so callers that need canceled/past_due must pass
   * `active: false` as a second page and merge.
   */
  async listSubscriptions(opts: {
    productId?: string
    active?: boolean
    limit?: number
  } = {}): Promise<{ items: Array<Record<string, unknown>> }> {
    const q = new URLSearchParams()
    if (opts.productId) q.set('product_id', opts.productId)
    if (opts.active !== undefined) q.set('active', String(opts.active))
    q.set('limit', String(opts.limit ?? 100))
    return this.request(`/v1/subscriptions/?${q.toString()}`)
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
   * Polar issues POLAR_WEBHOOK_SECRET as `whsec_<base64>`. The HMAC key is that
   * base64 payload DECODED to raw bytes — re-encoding the whole secret string
   * 401s every real delivery even when the env var is set correctly. Raw-string
   * and base64(secret) keys stay as fallbacks so a dashboard format change
   * fails soft, never open.
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
    const stripped = secret.replace(/^whsec_/, '')
    const candidates: Array<string | Buffer> = [
      Buffer.from(stripped, 'base64'), // spec: whsec_ secret, base64-decoded to raw key bytes
      Buffer.from(secret).toString('base64'), // legacy misread of the Polar docs
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
