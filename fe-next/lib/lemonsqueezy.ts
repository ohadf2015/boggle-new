/**
 * Lemon Squeezy Client
 * Handles checkout URL generation and webhook signature validation.
 * Ported from standalone teacher-dashboard repo.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { FREE_TIER_LIMITS } from './education/freeTierLimits'

// ---- Types ----

export interface CheckoutAttributes {
  url: string
  [key: string]: unknown
}

export interface CheckoutResponse {
  data: {
    id: string
    attributes: CheckoutAttributes
  }
}

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string
    custom_data?: {
      user_id?: string
    }
    [key: string]: unknown
  }
  data: {
    id: string
    type: string
    attributes: Record<string, unknown>
    relationships?: Record<string, unknown>
  }
  [key: string]: unknown
}

// ---- Tier configuration ----

export type TierId = 'free' | 'pro'

export interface TierConfig {
  id: TierId
  name: string
  price_monthly_usd: number
  classes_limit: number | null // null = unlimited
  students_limit_per_class: number | null
  features: string[]
  /** Lemon Squeezy Variant ID — set via env LEMONSQUEEZY_VARIANT_ID_<TIER> */
  variantId: string | undefined
}

const TIER_CONFIGS: Record<TierId, TierConfig> = {
  // The two caps come from lib/education/freeTierLimits.ts — the upgrade page renders them
  // too and it is a client component, so they cannot live in this file. Do not retype them.
  // Safe to tighten when it shipped (2026-08-23): max classrooms per teacher was 1 and max
  // students per classroom was 1, so no existing free teacher was pushed over the new limit.
  free: {
    id: 'free',
    name: 'Free',
    price_monthly_usd: 0,
    classes_limit: FREE_TIER_LIMITS.classes,
    students_limit_per_class: FREE_TIER_LIMITS.studentsPerClass,
    features: [
      `Up to ${FREE_TIER_LIMITS.classes} class`,
      `${FREE_TIER_LIMITS.studentsPerClass} students per class`,
      'Basic word tracking',
      'Daily progress reports',
    ],
    variantId: undefined,
  },
  pro: {
    id: 'pro',
    name: 'Teacher Pro',
    price_monthly_usd: 9,
    classes_limit: null,
    students_limit_per_class: null,
    features: [
      'Unlimited classes',
      'Unlimited students',
      'Advanced analytics',
      'Custom word lists',
      'Classroom duel mode',
    ],
    variantId: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
  },
}

export function getTierConfig(tier: TierId): TierConfig {
  return TIER_CONFIGS[tier]
}

export function getAllTiers(): TierConfig[] {
  return Object.values(TIER_CONFIGS)
}

// ---- Lemon Squeezy API Client ----

export const LEMONSQUEEZY_API_BASE = 'https://api.lemonsqueezy.com/v1'

export function getLemonSqueezyClient() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY is not configured')
  }

  return new LemonSqueezyClient(apiKey)
}

export class LemonSqueezyClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${LEMONSQUEEZY_API_BASE}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Lemon Squeezy API error: ${response.status} ${error}`)
    }

    return response.json()
  }

  /**
   * Create a checkout URL for a given tier.
   * Returns the full checkout URL that redirects the user to Lemon Squeezy.
   */
  async createCheckout({
    userId,
    tier,
    email,
    redirectUrl,
  }: {
    userId: string
    tier: TierId
    email?: string
    redirectUrl?: string
  }): Promise<string> {
    const config = getTierConfig(tier)
    const variantId = config.variantId

    if (!variantId) {
      throw new Error(`No variant ID configured for tier: ${tier}`)
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID
    if (!storeId) {
      throw new Error('LEMONSQUEEZY_STORE_ID is not configured')
    }

    const response = await this.request<CheckoutResponse>('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            product_options: {
              redirect_url: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/teacher?checkout=success`,
            },
            checkout_data: {
              ...(email ? { email } : {}),
              custom: {
                user_id: userId,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      }),
    })

    return response.data.attributes.url
  }

  /**
   * Get subscription details from Lemon Squeezy
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    return this.request(`/subscriptions/${subscriptionId}`)
  }

  /**
   * Validate a Lemon Squeezy webhook signature.
   * Uses the webhook secret from env.
   */
  static validateWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    if (!secret) {
      console.error('[LemonSqueezy] WEBHOOK_SECRET not configured — rejecting webhook')
      return false
    }

    const hmac = createHmac('sha256', secret)
    hmac.update(rawBody)
    const digest = hmac.digest('hex')

    try {
      return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
    } catch {
      return false
    }
  }
}