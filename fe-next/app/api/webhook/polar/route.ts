/**
 * Polar Webhook Handler
 * Processes subscription lifecycle events and updates Supabase.
 * Replaces the Lemon Squeezy webhook (store permanently rejected at KYC, 2026-08-09).
 *
 * Configure in Polar dashboard → Settings → Webhooks:
 *   URL: https://<app-domain>/api/webhook/polar
 *   Secret → POLAR_WEBHOOK_SECRET (Standard Webhooks; `whsec_` secrets are decoded)
 * Events handled: subscription.*, order.created, order.paid,
 *   checkout.completed, checkout.updated (status succeeded/confirmed/complete).
 */

import { NextRequest, NextResponse } from 'next/server'
import { PolarClient } from '@/lib/polar'
import { upsertSubscription, logSubscriptionEvent, grantProFromOrder, grantProFromCheckout, type Tier, type SubscriptionStatus } from '@/lib/subscriptions'
import { maybeSendPaymentFailedEmail } from '@/lib/education/dunning'
import { buildProCheckoutSucceededEvent, buildProTrialSucceededEvent, buildTrialActivatedEvent, buildTrialStartEvent, buildTeacherTrialStartedEvent, buildCheckoutCompleteEvent, buildPaidEvent, buildTeacherTrialConvertedEvent, buildTrialExpiredEvent, buildTrialStartedEvent, buildTeacherProUpgradedEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer'
import { isPolarTrialLapse } from '@/lib/education/polarTrial'

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
  // Checkout events carry this on the checkout object itself, not under customer.
  const fromExternal = p?.data?.external_customer_id
  if (fromExternal) return String(fromExternal)
  const fromCustomer = p?.data?.customer?.external_id
  if (fromCustomer) return String(fromCustomer)
  return undefined
}

const CHECKOUT_SUCCESS_STATUSES = new Set(['succeeded', 'confirmed', 'complete', 'completed'])

/**
 * Polar's current completion signal is `checkout.updated` with status
 * `succeeded`. Older dashboards and this task's contract also send
 * `checkout.completed`. An empty status on `checkout.completed` is itself
 * the success signal; `checkout.updated` with status open/expired is not.
 */
function isCheckoutSuccess(eventType: string, payload: WebhookPayload): boolean {
  if (eventType !== 'checkout.completed' && eventType !== 'checkout.updated') return false
  const status = payload?.data?.status
  if (status == null || status === '') return eventType === 'checkout.completed'
  return CHECKOUT_SUCCESS_STATUSES.has(String(status))
}

/**
 * Events that write a tier. Without POLAR_PRO_PRODUCT_ID every product maps
 * to free and a 200 ack drops the payment on the floor — Polar will not retry.
 */
function eventRequiresProProductId(eventType: string, payload: WebhookPayload): boolean {
  if (eventType === 'subscription.revoked') return false
  if (eventType.startsWith('subscription.')) return true
  if (eventType === 'order.created' || eventType === 'order.paid') return true
  return isCheckoutSuccess(eventType, payload)
}

/** UI locale stamped at checkout (polar.ts metadata.locale) — undefined for pre-locale subscriptions. */
function getLocale(p: WebhookPayload): string | undefined {
  const fromMetadata = p?.data?.metadata?.locale
  return typeof fromMetadata === 'string' && fromMetadata ? fromMetadata : undefined
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
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      console.error('[Polar] POLAR_WEBHOOK_SECRET is not configured')
      return NextResponse.json(
        { error: 'POLAR_WEBHOOK_SECRET is not configured', missing: ['POLAR_WEBHOOK_SECRET'] },
        { status: 503 },
      )
    }

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

    if (eventRequiresProProductId(eventType, payload) && !process.env.POLAR_PRO_PRODUCT_ID) {
      console.error(`[Polar] POLAR_PRO_PRODUCT_ID is not configured — refusing to ack ${eventType}`)
      return NextResponse.json(
        { error: 'POLAR_PRO_PRODUCT_ID is not configured', missing: ['POLAR_PRO_PRODUCT_ID'] },
        { status: 503 },
      )
    }

    console.log(`[Polar] Event: ${eventType}`, { userId })

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.uncanceled':
      case 'subscription.resumed':
        await handleSubscriptionActive(payload, userId)
        if (eventType === 'subscription.active') trackProConversion(payload, userId)
        trackProTrial(payload, userId)
        break
      case 'subscription.updated':
      case 'subscription.cycled':
      case 'subscription.paused':
        await handleSubscriptionUpdated(payload, userId)
        trackProTrial(payload, userId)
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
        trackTrialExpired(payload, userId)
        break
      case 'subscription.revoked':
        await handleSubscriptionRevoked(payload, userId)
        trackTrialExpired(payload, userId)
        break
      case 'order.created':
      case 'order.paid':
        await handleOrderCreated(payload, userId)
        break
      case 'checkout.completed':
      case 'checkout.updated':
        if (isCheckoutSuccess(eventType, payload)) {
          await handleCheckoutCompleted(payload, userId)
          trackCheckoutGrant(payload, userId)
        }
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

/**
 * `edu_pro_checkout_succeeded` + `checkout_complete` + `paid` — analytics only,
 * after the entitlement write landed. Only `subscription.active` counts
 * (created/uncanceled/resumed are not new conversions), only for the Pro
 * product. Never throws: a 500 here would make Polar redeliver and re-run
 * the state writes.
 */
function trackProConversion(payload: WebhookPayload, userId?: string) {
  try {
    if (!userId || getTierFromProductId(getProductId(payload)) !== 'pro') return
    if (mapStatus(payload?.data?.status) === 'trialing') return
    const subId = String(payload?.data?.id ?? '')
    captureProFunnelServerEvent(buildProCheckoutSucceededEvent(userId, subId))
    captureProFunnelServerEvent(buildCheckoutCompleteEvent(userId, subId))
    captureProFunnelServerEvent(buildPaidEvent(userId, subId))
    captureProFunnelServerEvent(buildTeacherProUpgradedEvent(userId, subId, getLocale(payload)))
    if (trialMarker(payload?.data).trial) {
      captureProFunnelServerEvent(buildTeacherTrialConvertedEvent(userId, subId))
    }
  } catch (err) {
    console.error('[Polar] conversion telemetry threw:', err)
  }
}

/**
 * `edu_pro_trial_succeeded` + `trial_activated` + `teacher_trial_started` —
 * Polar granted the 14-day trial and upserted the teacher row. Distinct from
 * paid conversion. Polar's activation webhook is `subscription.active`
 * (status=trialing). Never throws.
 */
function trackProTrial(payload: WebhookPayload, userId?: string) {
  try {
    if (!userId || getTierFromProductId(getProductId(payload)) !== 'pro') return
    if (mapStatus(payload?.data?.status) !== 'trialing') return
    const subId = String(payload?.data?.id ?? '')
    captureProFunnelServerEvent(buildProTrialSucceededEvent(userId, subId))
    captureProFunnelServerEvent(buildTrialActivatedEvent(userId, subId))
    captureProFunnelServerEvent(buildTrialStartEvent(userId, subId))
    captureProFunnelServerEvent(buildTeacherTrialStartedEvent(userId, subId))
    captureProFunnelServerEvent(buildTrialStartedEvent(userId, subId, getLocale(payload)))
  } catch (err) {
    console.error('[Polar] trial telemetry threw:', err)
  }
}

/**
 * `trial_expired` — Polar Teacher Pro trial lapsed without converting.
 * Canceled/revoked only. A later paid cancel is not a lapse
 * (`isPolarTrialLapse`). Never throws.
 */
function trackTrialExpired(payload: WebhookPayload, userId?: string) {
  try {
    if (!userId || getTierFromProductId(getProductId(payload)) !== 'pro') return
    const data = payload?.data ?? {}
    const marker = trialMarker(data)
    const periodEnd = typeof data?.current_period_end === 'string' ? data.current_period_end : null
    if (!isPolarTrialLapse({
      status: String(data?.status ?? ''),
      trial: marker.trial,
      trial_end: marker.trial_end,
      current_period_end: periodEnd,
    })) return
    const subId = String(data?.id ?? '')
    captureProFunnelServerEvent(buildTrialExpiredEvent(userId, subId))
  } catch (err) {
    console.error('[Polar] trial_expired telemetry threw:', err)
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

/**
 * Checkout completion is the grant backstop when subscription.active is late
 * or not subscribed on the Polar endpoint. Does not full-upsert over a row
 * subscription.active already wrote (see grantProFromCheckout).
 */
async function handleCheckoutCompleted(payload: WebhookPayload, userId?: string) {
  if (!userId) {
    console.warn('[Polar] checkout completed — no user_id in metadata, external_customer_id, or customer.external_id')
    return
  }
  const productId = getProductId(payload)
  if (getTierFromProductId(productId) !== 'pro') return
  const data = payload?.data ?? {}
  const marker = trialMarker(data)
  const subscriptionId = data.subscription_id != null && String(data.subscription_id)
    ? String(data.subscription_id)
    : null
  const orderId = data.order_id != null && String(data.order_id) ? String(data.order_id) : null
  await grantProFromCheckout({
    userId,
    status: marker.trial ? 'trialing' : 'active',
    providerSubscriptionId: subscriptionId,
    providerOrderId: orderId,
    providerProductId: productId,
    currentPeriodEnd: marker.trial_end,
  })
}

/**
 * Same conversion events as subscription.active, so a checkout completion
 * that never gets a subscription.active still moves checkout_complete.
 * Uses subscription_id when Polar sent one (data.id on this event is the
 * checkout id). Never throws.
 */
function trackCheckoutGrant(payload: WebhookPayload, userId?: string) {
  const data = payload?.data ?? {}
  const subscriptionId = data.subscription_id != null && String(data.subscription_id)
    ? String(data.subscription_id)
    : String(data.id ?? '')
  const marker = trialMarker(data)
  const shaped = {
    ...payload,
    data: { ...data, id: subscriptionId, status: marker.trial ? 'trialing' : 'active' },
  }
  if (marker.trial) trackProTrial(shaped, userId)
  else trackProConversion(shaped, userId)
}
