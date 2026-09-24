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
import { upsertSubscription, logSubscriptionEvent, grantProFromOrder, type Tier, type SubscriptionStatus } from '@/lib/subscriptions'
import { maybeSendPaymentFailedEmail } from '@/lib/education/dunning'

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

/**
 * While Polar says `trialing`, the row's period end is the trial end
 * (`trial_end`, else the period end Polar sent). After the trial converts,
 * the renewal date is `current_period_end` again.
 */
function subscriptionPeriodEnd(data: WebhookPayload): string | null {
  if (String(data?.status ?? '') === 'trialing') {
    if (typeof data?.trial_end === 'string' && data.trial_end) return data.trial_end
  }
  return typeof data?.current_period_end === 'string' ? data.current_period_end : null
}

/** So a later status read can tell a trial checkout from a paid one. */
function trialMarker(data: WebhookPayload): { trial: boolean; trial_end: string | null } {
  const meta = data?.metadata?.trial
  const metaTrial = meta === true || meta === 'true'
  const trialEnd = typeof data?.trial_end === 'string' && data.trial_end ? data.trial_end : null
  const trialing = String(data?.status ?? '') === 'trialing'
  return { trial: trialing || metaTrial || trialEnd !== null, trial_end: trialEnd }
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
      case 'subscription.paused':
        await handleSubscriptionUpdated(payload, userId)
        break
      case 'subscription.past_due':
        await handleSubscriptionUpdated(payload, userId)
        // Churn guard: the row flip alone tells nobody. Email the teacher a
        // one-click card-update link; deduped per subscription per 72h inside.
        // A failure here must not fail the webhook — the state write above
        // already landed, and Polar will redeliver the event.
        try {
          await maybeSendPaymentFailedEmail({ payload, userId })
        } catch (err) {
          console.error('[Polar] dunning email threw:', err)
        }
        break
      case 'subscription.canceled':
        await handleSubscriptionCanceled(payload, userId)
        break
      case 'subscription.revoked':
        await handleSubscriptionRevoked(payload, userId)
        break
      case 'order.created':
      case 'order.paid':
        await handleOrderCreated(payload, userId)
        break
      default:
        console.log(`[Polar] Unhandled event: ${eventType}`)
    }

    const marker = trialMarker(payload?.data)
    await logSubscriptionEvent({
      userId,
      eventType,
      subscriptionId: String(payload?.data?.id ?? ''),
      payload: { event_type: eventType, user_id: userId, trial: marker.trial, trial_end: marker.trial_end },
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
    currentPeriodEnd: subscriptionPeriodEnd(data),
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
    currentPeriodEnd: subscriptionPeriodEnd(data),
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
    currentPeriodEnd: subscriptionPeriodEnd(data),
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

/**
 * One-off purchases / first subscription order — belt-and-braces Pro grant.
 *
 * Delegates to grantProFromOrder: when the subscription events already wrote
 * the row (the common case — they arrive first in the same burst), this only
 * stamps the order id and leaves the provider-owned fields (renewal date,
 * subscription id) untouched.
 */
async function handleOrderCreated(payload: WebhookPayload, userId?: string) {
  if (!userId) return
  const data = payload?.data ?? {}
  const productId = getProductId(payload)
  if (getTierFromProductId(productId) !== 'pro') return
  await grantProFromOrder({ userId, providerOrderId: String(data.id ?? '') })
}
