/**
 * Lemon Squeezy Webhook Handler
 * Processes subscription lifecycle events and updates Supabase.
 * Ported from standalone teacher-dashboard repo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { LemonSqueezyClient } from '@/lib/lemonsqueezy'
import { upsertSubscription, logSubscriptionEvent, type Tier } from '@/lib/subscriptions'

// Webhook payload shape — using `any` for relationships to allow flexible access
type WebhookPayload = any

/** Safely extract variant ID from various payload shapes */
function getVariantId(p: WebhookPayload): string | undefined {
  const rid =
    p?.data?.relationships?.variant?.data?.id ??
    p?.data?.attributes?.variant_id ??
    p?.data?.attributes?.first_order_item?.variant_id
  return rid != null ? String(rid) : undefined
}

/** Map Lemon Squeezy variant IDs to tier names */
function getTierFromVariantId(variantId: string | undefined): Tier {
  if (!variantId) return 'free'
  const proVariantId = process.env.LEMONSQUEEZY_VARIANT_ID_PRO
  if (proVariantId && variantId === proVariantId) return 'pro'
  return 'free'
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-signature') ?? ''

    if (!LemonSqueezyClient.validateWebhookSignature(rawBody, signature)) {
      console.error('[LemonSqueezy] Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload: WebhookPayload = JSON.parse(rawBody)
    const eventName = payload.meta?.event_name as string
    const userId = payload.meta?.custom_data?.user_id as string | undefined

    console.log(`[LemonSqueezy] Event: ${eventName}`, { userId })

    switch (eventName) {
      case 'order_created':
        await handleOrderCreated(payload, userId)
        break
      case 'subscription_created':
        await handleSubscriptionCreated(payload, userId)
        break
      case 'subscription_updated':
        await handleSubscriptionUpdated(payload, userId)
        break
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(payload, userId)
        break
      case 'subscription_expired':
        await handleSubscriptionExpired(payload, userId)
        break
      default:
        console.log(`[LemonSqueezy] Unhandled event: ${eventName}`)
    }

    await logSubscriptionEvent({
      userId,
      eventType: eventName,
      subscriptionId: String(payload?.data?.id ?? ''),
      payload: { event_name: eventName, user_id: userId },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[LemonSqueezy] Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleOrderCreated(payload: WebhookPayload, userId?: string) {
  const variantId = getVariantId(payload)
  const tier = getTierFromVariantId(variantId)
  const orderId = String(payload?.data?.id ?? '')

  if (!userId) {
    // Try to get user from order attributes
    const customData = payload?.data?.attributes?.custom_data as Record<string, unknown> | undefined
    const fallbackUserId = customData?.user_id as string | undefined
    if (!fallbackUserId) {
      console.warn('[LemonSqueezy] order_created — no user_id in custom_data')
      return
    }
    await upsertSubscription({
      userId: fallbackUserId,
      tier,
      status: 'active',
      lemonSqueezyOrderId: orderId,
      lemonSqueezyVariantId: variantId,
    })
    return
  }

  await upsertSubscription({
    userId,
    tier,
    status: 'active',
    lemonSqueezyOrderId: orderId,
    lemonSqueezyVariantId: variantId,
  })
}

async function handleSubscriptionCreated(payload: WebhookPayload, userId?: string) {
  const variantId = getVariantId(payload)
  const tier = getTierFromVariantId(variantId)
  const subscriptionId = String(payload?.data?.id ?? '')
  const attributes = payload?.data?.attributes ?? {}
  const currentPeriodEnd = attributes?.ends_at as string | null ?? null

  if (!userId) {
    const customData = attributes?.custom_data as Record<string, unknown> | undefined
    const fallbackUserId = customData?.user_id as string | undefined
    if (!fallbackUserId) {
      console.warn('[LemonSqueezy] subscription_created — no user_id')
      return
    }
    await upsertSubscription({
      userId: fallbackUserId,
      tier,
      status: 'active',
      lemonSqueezySubscriptionId: subscriptionId,
      lemonSqueezyVariantId: variantId,
      currentPeriodEnd,
    })
    return
  }

  await upsertSubscription({
    userId,
    tier,
    status: 'active',
    lemonSqueezySubscriptionId: subscriptionId,
    lemonSqueezyVariantId: variantId,
    currentPeriodEnd,
  })
}

async function handleSubscriptionUpdated(payload: WebhookPayload, userId?: string) {
  const variantId = getVariantId(payload)
  const tier = getTierFromVariantId(variantId)
  const subscriptionId = String(payload?.data?.id ?? '')
  const attributes = payload?.data?.attributes ?? {}
  const status = String(attributes?.status ?? 'active')
  const currentPeriodEnd = attributes?.ends_at as string | null ?? null
  const cancelAtPeriodEnd = Boolean(attributes?.cancelled ?? false)

  if (!userId) {
    const customData = attributes?.custom_data as Record<string, unknown> | undefined
    const fallbackUserId = customData?.user_id as string | undefined
    if (!fallbackUserId) return
    await upsertSubscription({
      userId: fallbackUserId,
      tier,
      status: status as SubscriptionStatus,
      lemonSqueezySubscriptionId: subscriptionId,
      lemonSqueezyVariantId: variantId,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    })
    return
  }

  await upsertSubscription({
    userId,
    tier,
    status: status as SubscriptionStatus,
    lemonSqueezySubscriptionId: subscriptionId,
    lemonSqueezyVariantId: variantId,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  })
}

async function handleSubscriptionCancelled(payload: WebhookPayload, userId?: string) {
  const subscriptionId = String(payload?.data?.id ?? '')
  const attributes = payload?.data?.attributes ?? {}

  if (!userId) {
    const customData = attributes?.custom_data as Record<string, unknown> | undefined
    const fallbackUserId = customData?.user_id as string | undefined
    if (!fallbackUserId) return
    await upsertSubscription({
      userId: fallbackUserId,
      tier: 'free',
      status: 'canceled',
      lemonSqueezySubscriptionId: subscriptionId,
      cancelAtPeriodEnd: true,
    })
    return
  }

  await upsertSubscription({
    userId,
    tier: 'free',
    status: 'canceled',
    lemonSqueezySubscriptionId: subscriptionId,
    cancelAtPeriodEnd: true,
  })
}

async function handleSubscriptionExpired(payload: WebhookPayload, userId?: string) {
  const subscriptionId = String(payload?.data?.id ?? '')
  const attributes = payload?.data?.attributes ?? {}

  if (!userId) {
    const customData = attributes?.custom_data as Record<string, unknown> | undefined
    const fallbackUserId = customData?.user_id as string | undefined
    if (!fallbackUserId) return
    await upsertSubscription({
      userId: fallbackUserId,
      tier: 'free',
      status: 'canceled',
      lemonSqueezySubscriptionId: subscriptionId,
    })
    return
  }

  await upsertSubscription({
    userId,
    tier: 'free',
    status: 'canceled',
    lemonSqueezySubscriptionId: subscriptionId,
  })
}