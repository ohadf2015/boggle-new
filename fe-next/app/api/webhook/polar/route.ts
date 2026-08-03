/**
 * Polar.sh Webhook Handler
 * Standard Webhooks signature verification, then entitlement lifecycle:
 *
 *   subscription.created / subscription.active    → grant Pro
 *   subscription.updated                          → sync status / period end
 *   subscription.canceled                         → cancel at period end (keeps Pro until then)
 *   subscription.revoked                          → revoke Pro immediately
 *   order.created / order.paid (lifetime product) → grant Pro (lifetime, no period end)
 *   checkout.updated (succeeded) / checkout.completed → log only; grants happen above
 *
 * User identity: checkout metadata { user_id } is copied by Polar onto the
 * resulting order/subscription; we fall back to customer external_id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { PolarClient, getPolarProductKind } from '@/lib/polar'
import { upsertSubscription, logSubscriptionEvent, type SubscriptionStatus } from '@/lib/subscriptions'

// Polar payload shapes are large; we only touch a handful of fields.
type PolarPayload = any

/** Extract our app user id from any Polar event payload. */
function getUserId(p: PolarPayload): string | undefined {
  return (
    p?.data?.metadata?.user_id ??
    p?.data?.checkout?.metadata?.user_id ??
    p?.data?.customer?.external_id ??
    p?.data?.customer?.metadata?.user_id ??
    undefined
  )
}

/** Map Polar subscription status onto our internal status enum. */
function mapSubscriptionStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    default:
      return 'active'
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const valid = PolarClient.validateWebhookSignature({
      rawBody,
      webhookId: request.headers.get('webhook-id'),
      timestamp: request.headers.get('webhook-timestamp'),
      signatureHeader: request.headers.get('webhook-signature'),
    })
    if (!valid) {
      console.error('[Polar] Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload: PolarPayload = JSON.parse(rawBody)
    const eventType = payload?.type as string
    const userId = getUserId(payload)

    console.log(`[Polar] Event: ${eventType}`, { userId })

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.active':
        await handleSubscriptionGrant(payload, userId)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(payload, userId)
        break
      case 'subscription.canceled':
        await handleSubscriptionCanceled(payload, userId)
        break
      case 'subscription.revoked':
        await handleSubscriptionRevoked(payload, userId)
        break
      case 'order.created':
      case 'order.paid':
        await handleOrderPaid(payload, userId)
        break
      case 'checkout.updated':
      case 'checkout.completed':
        // Log-only: entitlement grants happen on the order/subscription events.
        break
      default:
        console.log(`[Polar] Unhandled event: ${eventType}`)
    }

    await logSubscriptionEvent({
      userId,
      eventType: `polar:${eventType}`,
      subscriptionId: String(payload?.data?.id ?? ''),
      payload: { type: eventType, user_id: userId },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Polar] Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleSubscriptionGrant(p: PolarPayload, userId?: string) {
  if (!userId) {
    console.warn('[Polar] subscription grant — no user_id on payload')
    return
  }
  const kind = getPolarProductKind(p?.data?.product_id)
  if (kind && kind !== 'pro') return // lifetime grants happen on order events

  await upsertSubscription({
    userId,
    tier: 'pro',
    status: mapSubscriptionStatus(p?.data?.status),
    polarSubscriptionId: String(p?.data?.id ?? ''),
    polarCustomerId: p?.data?.customer_id ?? null,
    polarProductId: p?.data?.product_id ?? null,
    currentPeriodEnd: p?.data?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(p?.data?.cancel_at_period_end ?? false),
  })
}

async function handleSubscriptionUpdated(p: PolarPayload, userId?: string) {
  if (!userId) return
  const status = mapSubscriptionStatus(p?.data?.status)

  await upsertSubscription({
    userId,
    tier: status === 'canceled' ? 'free' : 'pro',
    status,
    polarSubscriptionId: String(p?.data?.id ?? ''),
    polarCustomerId: p?.data?.customer_id ?? null,
    polarProductId: p?.data?.product_id ?? null,
    currentPeriodEnd: p?.data?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(p?.data?.cancel_at_period_end ?? false),
  })
}

async function handleSubscriptionCanceled(p: PolarPayload, userId?: string) {
  if (!userId) return
  // Polar fires canceled when the customer cancels — access runs until
  // current_period_end; `revoked` (below) is the immediate termination.
  await upsertSubscription({
    userId,
    tier: 'pro',
    status: 'active',
    polarSubscriptionId: String(p?.data?.id ?? ''),
    polarCustomerId: p?.data?.customer_id ?? null,
    polarProductId: p?.data?.product_id ?? null,
    currentPeriodEnd: p?.data?.current_period_end ?? null,
    cancelAtPeriodEnd: true,
  })
}

async function handleSubscriptionRevoked(p: PolarPayload, userId?: string) {
  if (!userId) return
  await upsertSubscription({
    userId,
    tier: 'free',
    status: 'canceled',
    polarSubscriptionId: String(p?.data?.id ?? ''),
    polarCustomerId: p?.data?.customer_id ?? null,
    polarProductId: p?.data?.product_id ?? null,
    cancelAtPeriodEnd: true,
  })
}

async function handleOrderPaid(p: PolarPayload, userId?: string) {
  if (!userId) {
    console.warn('[Polar] order paid — no user_id on payload')
    return
  }
  // Only one-time lifetime purchases grant here; subscription orders are
  // covered by the subscription.* events.
  const kind = getPolarProductKind(p?.data?.product_id)
  if (kind !== 'lifetime') return

  await upsertSubscription({
    userId,
    tier: 'pro',
    status: 'active',
    polarCustomerId: p?.data?.customer_id ?? null,
    polarProductId: p?.data?.product_id ?? null,
    polarOrderId: String(p?.data?.id ?? ''),
    currentPeriodEnd: null, // lifetime — never expires
    cancelAtPeriodEnd: false,
  })
}
