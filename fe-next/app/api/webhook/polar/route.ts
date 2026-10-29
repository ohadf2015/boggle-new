/**
 * Polar Webhook Handler
 * Processes subscription lifecycle events and updates Supabase.
 * Replaces the Lemon Squeezy webhook (store permanently rejected at KYC, 2026-08-09).
 *
 * Configure in Polar dashboard → Settings → Webhooks:
 *   URL: https://<app-domain>/api/webhook/polar
 *   Secret → POLAR_WEBHOOK_SECRET (Standard Webhooks; `whsec_` secrets are decoded)
 * Events handled: subscription.* (Teacher Pro product only), order.paid,
 *   checkout.completed, checkout.updated (status succeeded/confirmed/complete).
 */

import { NextRequest, NextResponse } from 'next/server'
import { PolarClient } from '@/lib/polar'
import { upsertSubscription, logSubscriptionEvent, grantProFromOrder, grantProFromCheckout, type Tier, type SubscriptionStatus } from '@/lib/subscriptions'
import { maybeSendPaymentFailedEmail } from '@/lib/education/dunning'
import { buildPolarCheckoutStatusEvent, buildPolarOrderPaidEvent, buildPolarSubscriptionEndedEvent, polarRevenueProps, withRevenue } from '@/lib/education/polarRevenue'
import { buildProCheckoutSucceededEvent, buildProTrialSucceededEvent, buildTrialActivatedEvent, buildTrialStartEvent, buildTeacherTrialStartedEvent, buildCheckoutCompleteEvent, buildPaidEvent, buildTeacherTrialConvertedEvent, buildTrialExpiredEvent, buildTrialStartedEvent, buildTeacherProUpgradedEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer'
import { isPolarTrialLapse } from '@/lib/education/polarTrial'

// Polar payloads are large; we only read a handful of fields.
type WebhookPayload = any

/** Map Polar subscription statuses onto our internal union. Anything unrecognised fails closed. */
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
      return 'canceled'
    default:
      console.error(`[Polar] Unknown subscription status "${status}" — recording as paused`)
      return 'paused'
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

/** True when the event names a product other than Teacher Pro (the endpoint is shared with other products). */
function isForeignProduct(p: WebhookPayload): boolean {
  const productId = getProductId(p)
  return productId !== undefined && productId !== process.env.POLAR_PRO_PRODUCT_ID
}

/** Polar sends modified_at null on an object that was never modified; created_at is then its last change. */
function getEventAt(p: WebhookPayload): string | null {
  for (const at of [p?.data?.modified_at, p?.data?.created_at]) {
    if (typeof at === 'string' && Number.isFinite(Date.parse(at))) return at
  }
  return null
}

/** Polar order totals are in cents; only a positive charge is a payment. */
function isPaidOrder(p: WebhookPayload): boolean {
  const data = p?.data ?? {}
  const amount = data.total_amount ?? data.net_amount ?? data.amount
  return typeof amount === 'number' && amount > 0
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
  if (eventType === 'order.paid') return true
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

    if (eventType.startsWith('subscription.') && isForeignProduct(payload)) {
      console.log(`[Polar] Ignoring ${eventType} for non-Teacher-Pro product ${getProductId(payload)}`, { userId })
      return NextResponse.json({ received: true, ignored: 'foreign_product' })
    }

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
        trackSubscriptionEnded('canceled', payload, userId)
        break
      case 'subscription.revoked':
        await handleSubscriptionRevoked(payload, userId)
        trackTrialExpired(payload, userId)
        trackSubscriptionEnded('revoked', payload, userId)
        break
      case 'order.created':
        break
      case 'order.paid':
        await handleOrderPaid(payload, userId)
        trackOrderPaid(payload, userId)
        break
      case 'checkout.created':
        trackCheckoutStatus(eventType, payload, userId)
        break
      case 'checkout.completed':
      case 'checkout.updated':
        trackCheckoutStatus(eventType, payload, userId)
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
      payload: { event_type: eventType, user_id: userId, trial: marker.trial, trial_end: marker.trial_end, ...polarRevenueProps(payload?.data) },
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
    captureProFunnelServerEvent(withRevenue(buildProCheckoutSucceededEvent(userId, subId), payload?.data))
    captureProFunnelServerEvent(withRevenue(buildCheckoutCompleteEvent(userId, subId), payload?.data))
    captureProFunnelServerEvent(withRevenue(buildPaidEvent(userId, subId), payload?.data))
    captureProFunnelServerEvent(withRevenue(buildTeacherProUpgradedEvent(userId, subId, getLocale(payload)), payload?.data))
    if (trialMarker(payload?.data).trial) {
      captureProFunnelServerEvent(withRevenue(buildTeacherTrialConvertedEvent(userId, subId), payload?.data))
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
    captureProFunnelServerEvent(withRevenue(buildProTrialSucceededEvent(userId, subId), payload?.data))
    captureProFunnelServerEvent(withRevenue(buildTrialActivatedEvent(userId, subId), payload?.data))
    captureProFunnelServerEvent(withRevenue(buildTrialStartEvent(userId, subId), payload?.data))
    captureProFunnelServerEvent(withRevenue(buildTeacherTrialStartedEvent(userId, subId), payload?.data))
    captureProFunnelServerEvent(withRevenue(buildTrialStartedEvent(userId, subId, getLocale(payload)), payload?.data))
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
    captureProFunnelServerEvent(withRevenue(buildTrialExpiredEvent(userId, subId), data))
  } catch (err) {
    console.error('[Polar] trial_expired telemetry threw:', err)
  }
}

/**
 * `polar_order_paid` — every paid Pro order (first payment and renewals) with
 * amount/currency/product and `revenue` in major units. Never throws.
 */
function trackOrderPaid(payload: WebhookPayload, userId?: string) {
  try {
    if (!userId || getTierFromProductId(getProductId(payload)) !== 'pro') return
    captureProFunnelServerEvent(buildPolarOrderPaidEvent(userId, payload?.data))
  } catch (err) {
    console.error('[Polar] order telemetry threw:', err)
  }
}

/** `polar_subscription_canceled|revoked` for any Pro cancel, trial or paid. Never throws. */
function trackSubscriptionEnded(kind: 'canceled' | 'revoked', payload: WebhookPayload, userId?: string) {
  try {
    if (!userId || getTierFromProductId(getProductId(payload)) !== 'pro') return
    const data = payload?.data ?? {}
    captureProFunnelServerEvent(buildPolarSubscriptionEndedEvent(kind, userId, data, trialMarker(data).trial))
  } catch (err) {
    console.error('[Polar] cancel telemetry threw:', err)
  }
}

/**
 * `polar_checkout_status` — Polar-side checkout state (open/confirmed/succeeded/
 * failed/expired), so a started checkout that never paid shows where it died.
 * Pro product only. Never throws.
 */
function trackCheckoutStatus(eventType: string, payload: WebhookPayload, userId?: string) {
  try {
    if (getTierFromProductId(getProductId(payload)) !== 'pro') return
    captureProFunnelServerEvent(buildPolarCheckoutStatusEvent(userId, eventType, payload?.data))
  } catch (err) {
    console.error('[Polar] checkout status telemetry threw:', err)
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
    eventAt: getEventAt(payload),
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
    eventAt: getEventAt(payload),
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
    eventAt: getEventAt(payload),
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
    eventAt: getEventAt(payload),
  })
}

/**
 * Belt-and-braces Pro grant from a paid order. `order.created` is ignored: it fires
 * before payment. A $0 order (trial start) may only stamp an existing row; the
 * subscription events own trialing.
 */
async function handleOrderPaid(payload: WebhookPayload, userId?: string) {
  if (!userId) return
  const data = payload?.data ?? {}
  if (getTierFromProductId(getProductId(payload)) !== 'pro') return
  await grantProFromOrder({ userId, providerOrderId: String(data.id ?? ''), allowGrant: isPaidOrder(payload) })
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
