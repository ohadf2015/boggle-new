/**
 * Polar Webhook Handler
 * Processes subscription lifecycle events and updates Supabase.
 * Replaces the Lemon Squeezy webhook (store permanently rejected at KYC, 2026-08-09).
 *
 * Configure in Polar dashboard → Settings → Webhooks:
 *   URL: https://<app-domain>/api/webhook/polar
 *   Secret → POLAR_WEBHOOK_SECRET
 * Events handled: subscription.*, order.created
 */

import { NextRequest, NextResponse } from 'next/server'
import { PolarClient } from '@/lib/polar'
import { upsertSubscription, logSubscriptionEvent, type Tier, type SubscriptionStatus } from '@/lib/subscriptions'

// Polar payloads are large; we only read a handful of fields.
type WebhookPayload = any

/** Map Polar subscription statuses onto our internal union */
function mapStatus(polarStatus: unknown): SubscriptionStatus {
  const status = String(polarStatus ?? 'active')
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'paused':
      return status
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'past_due'
    default:
      return 'active'
  }
}

function getProductId(p: WebhookPayload): string | undefined {
  const pid = p?.data?.product_id ?? p?.data?.product?.id
  return pid != null ? String(pid) : undefined
}

/** Map Polar product IDs to tier names */
function getTierFromProductId(productId: string | undefined): Tier {
  if (!productId) return 'free'
  const proProductId = process.env.POLAR_PRO_PRODUCT_ID
  if (proProductId && productId === proProductId) return 'pro'
  return 'free'
}

/**
 * Find our user id. Checkout sets both `external_customer_id` and
 * `metadata.user_id`; Polar copies checkout metadata onto the subscription.
 */
function getUserId(p: WebhookPayload): string | undefined {
  const fromMetadata = p?.data?.metadata?.user_id
  if (fromMetadata) return String(fromMetadata)
  const fromCustomer = p?.data?.customer?.external_id
  if (fromCustomer) return String(fromCustomer)
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signatureValid = PolarClient.validateWebhookSignature(rawBody, {
      id: request.headers.get('webhook-id'),
      timestamp: request.headers.get('webhook-timestamp'),
      signature: request.headers.get('webhook-signature'),
    })
    if (!signatureValid) {
      console.error('[Polar] Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload: WebhookPayload = JSON.parse(rawBody)
    const eventType = String(payload?.type ?? '')
    const userId = getUserId(payload)

    console.log(`[Polar] Event: ${eventType}`, { userId })

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.uncanceled':
      case 'subscription.resumed':
        await handleSubscriptionActive(payload, userId)
        break
      case 'subscription.updated':
      case 'subscription.cycled':
      case 'subscription.past_due':
      case 'subscription.paused':
        await handleSubscriptionUpdated(payload, userId)
        break
      case 'subscription.canceled':
        await handleSubscriptionCanceled(payload, userId)
        break
      case 'subscription.revoked':
        await handleSubscriptionRevoked(payload, userId)
        break
      case 'order.created':
        await handleOrderCreated(payload, userId)
        break
      default:
        console.log(`[Polar] Unhandled event: ${eventType}`)
    }

    await logSubscriptionEvent({
      userId,
      eventType,
      subscriptionId: String(payload?.data?.id ?? ''),
      payload: { event_type: eventType, user_id: userId },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Polar] Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleSubscriptionActive(payload: WebhookPayload, userId?: string) {
  if (!userId) {
    console.warn('[Polar] subscription active — no user_id in metadata/customer.external_id')
    return
  }
  const data = payload?.data ?? {}
  await upsertSubscription({
    userId,
    tier: getTierFromProductId(getProductId(payload)),
    status: mapStatus(data.status),
    providerSubscriptionId: String(data.id ?? ''),
    providerProductId: getProductId(payload),
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end ?? false),
  })
}

async function handleSubscriptionUpdated(payload: WebhookPayload, userId?: string) {
  if (!userId) return
  const data = payload?.data ?? {}
  await upsertSubscription({
    userId,
    tier: getTierFromProductId(getProductId(payload)),
    status: mapStatus(data.status),
    providerSubscriptionId: String(data.id ?? ''),
    providerProductId: getProductId(payload),
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end ?? false),
  })
}

/**
 * End-of-period cancellation: status stays 'active' until the period ends,
 * so we keep Pro and only record cancel_at_period_end. The later
 * subscription.revoked event performs the actual downgrade.
 */
async function handleSubscriptionCanceled(payload: WebhookPayload, userId?: string) {
  if (!userId) return
  const data = payload?.data ?? {}
  await upsertSubscription({
    userId,
    tier: getTierFromProductId(getProductId(payload)),
    status: mapStatus(data.status),
    providerSubscriptionId: String(data.id ?? ''),
    providerProductId: getProductId(payload),
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: true,
  })
}

async function handleSubscriptionRevoked(payload: WebhookPayload, userId?: string) {
  if (!userId) return
  const data = payload?.data ?? {}
  await upsertSubscription({
    userId,
    tier: 'free',
    status: 'canceled',
    providerSubscriptionId: String(data.id ?? ''),
    cancelAtPeriodEnd: false,
  })
}

/** One-off purchases / first subscription order — belt-and-braces Pro grant. */
async function handleOrderCreated(payload: WebhookPayload, userId?: string) {
  if (!userId) return
  const data = payload?.data ?? {}
  const productId = getProductId(payload)
  if (getTierFromProductId(productId) !== 'pro') return
  await upsertSubscription({
    userId,
    tier: 'pro',
    status: 'active',
    providerOrderId: String(data.id ?? ''),
    providerProductId: productId,
  })
}
