/**
 * Subscription management for LexiClash teachers.
 * Ported from standalone teacher-dashboard repo.
 *
 * Reads subscription state from the `subscriptions` table in Supabase.
 * Provides tier checking and limit enforcement.
 */

import { createClient } from '@/utils/supabase/server'
import { type TierConfig, getTierConfig } from './lemonsqueezy'

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'paused' | 'trialing'
export type Tier = 'free' | 'pro'

export interface TeacherSubscription {
  tier: Tier
  status: SubscriptionStatus
  classes_limit: number | null // null = unlimited
  students_limit_per_class: number | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  has_pro: boolean
}

/**
 * Check a teacher's current subscription status.
 * Defaults to 'free' tier if no record exists.
 */
export async function checkTeacherSubscription(
  userId: string
): Promise<TeacherSubscription> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  // No subscription record → free tier
  if (error || !data) {
    const freeConfig = getTierConfig('free')
    return {
      tier: 'free',
      status: 'active',
      classes_limit: freeConfig.classes_limit,
      students_limit_per_class: freeConfig.students_limit_per_class,
      current_period_end: null,
      cancel_at_period_end: false,
      has_pro: false,
    }
  }

  return {
    tier: data.tier as Tier,
    status: data.status as SubscriptionStatus,
    classes_limit: data.tier === 'pro' ? null : getTierConfig('free').classes_limit,
    students_limit_per_class: data.tier === 'pro' ? null : getTierConfig('free').students_limit_per_class,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end,
    has_pro: data.tier === 'pro' && data.status === 'active',
  }
}

/**
 * Check if a teacher can create a new class.
 * Returns { allowed, reason, currentCount, limit }.
 */
export async function canCreateClass(
  userId: string
): Promise<{
  allowed: boolean
  reason?: string
  currentCount: number
  limit: number | null
}> {
  const supabase = await createClient()
  const subscription = await checkTeacherSubscription(userId)

  // Count current classes
  const { count } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', userId)

  const currentCount = count || 0

  // Pro users have unlimited classes
  if (subscription.has_pro) {
    return { allowed: true, currentCount, limit: null }
  }

  const limit = subscription.classes_limit ?? 2

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `You've reached the free tier limit of ${limit} classes. Upgrade to Pro for unlimited classes.`,
      currentCount,
      limit,
    }
  }

  return { allowed: true, currentCount, limit }
}

/**
 * Upsert a subscription record (called from webhook handler).
 */
export async function upsertSubscription({
  userId,
  tier,
  status,
  lemonSqueezySubscriptionId,
  lemonSqueezyOrderId,
  lemonSqueezyVariantId,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  userId: string
  tier: Tier
  status: SubscriptionStatus
  lemonSqueezySubscriptionId?: string | null
  lemonSqueezyOrderId?: string | null
  lemonSqueezyVariantId?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      tier,
      status,
      lemon_squeezy_subscription_id: lemonSqueezySubscriptionId ?? null,
      lemon_squeezy_order_id: lemonSqueezyOrderId ?? null,
      lemon_squeezy_variant_id: lemonSqueezyVariantId ?? null,
      current_period_end: currentPeriodEnd ?? null,
      cancel_at_period_end: cancelAtPeriodEnd ?? false,
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    console.error('[Subscription] Failed to upsert:', error)
    throw error
  }
}

/**
 * Log a subscription event (called from webhook handler).
 */
export async function logSubscriptionEvent({
  userId,
  eventType,
  subscriptionId,
  payload,
}: {
  userId?: string | null
  eventType: string
  subscriptionId?: string | null
  payload: Record<string, unknown>
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('subscription_events').insert({
    user_id: userId ?? null,
    event_type: eventType,
    subscription_id: subscriptionId ?? null,
    payload,
  })

  if (error) {
    console.error('[Subscription] Failed to log event:', error)
  }
}