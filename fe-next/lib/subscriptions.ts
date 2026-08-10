/**
 * Subscription management for LexiClash.
 *
 * Teacher subscriptions: reads from the `subscriptions` table in Supabase.
 * Consumer (player) subscriptions: reads from the same `subscriptions` table
 * but uses a different tier value ('consumer_pro') so one table serves both
 * revenue streams. A user can hold at most one active subscription; if they
 * buy Teacher Pro and Consumer Pro, the latest purchase wins ('pro' or
 * 'consumer_pro').
 */

import { createClient } from '@/utils/supabase/server'
import { type TierConfig, getTierConfig } from './lemonsqueezy'

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'paused' | 'trialing'
export type Tier = 'free' | 'pro' | 'consumer_pro'

// ── Teacher subscription types ──

export interface TeacherSubscription {
  tier: Tier
  status: SubscriptionStatus
  classes_limit: number | null // null = unlimited
  students_limit_per_class: number | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  has_pro: boolean
}

// ── Consumer subscription types ──

/** Consumer Pro feature flags derived from the subscription tier. */
export interface ConsumerProFeatures {
  /** Remove all banner + rewarded video ads */
  adFree: boolean
  /** Extra avatar slots beyond the free limit */
  extraAvatarSlots: boolean
  /** Access to Pro-exclusive board themes */
  proBoardThemes: boolean
  /** Extended game history and cognitive score trends */
  extendedHistory: boolean
}

export interface ConsumerSubscription {
  tier: Tier
  status: SubscriptionStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
  has_consumer_pro: boolean
  features: ConsumerProFeatures
}

// ── Teacher subscription helpers ──

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

// ── Consumer subscription helpers ──

/**
 * Check a player's Consumer Pro subscription status.
 * Defaults to 'free' tier with all features disabled if no record exists.
 */
export async function checkConsumerSubscription(
  userId: string
): Promise<ConsumerSubscription> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  const hasConsumerPro = !error && data?.tier === 'consumer_pro' && data?.status === 'active'

  if (!hasConsumerPro) {
    return {
      tier: 'free',
      status: 'active',
      current_period_end: null,
      cancel_at_period_end: false,
      has_consumer_pro: false,
      features: {
        adFree: false,
        extraAvatarSlots: false,
        proBoardThemes: false,
        extendedHistory: false,
      },
    }
  }

  return {
    tier: 'consumer_pro',
    status: data.status as SubscriptionStatus,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end,
    has_consumer_pro: true,
    features: {
      adFree: true,
      extraAvatarSlots: true,
      proBoardThemes: true,
      extendedHistory: true,
    },
  }
}

/**
 * Check whether a player has Consumer Pro (for quick checks where granular
 * features aren't needed).
 */
export async function hasConsumerPro(userId: string): Promise<boolean> {
  const sub = await checkConsumerSubscription(userId)
  return sub.has_consumer_pro
}

// ── Shared helpers ──

/**
 * Check if a teacher can create a new class.
 *
 * Grandfathering rule: caps apply only to NEW classes going forward.
 * A free teacher with 0-1 classes can create up to 2.
 * A free teacher at 2+ classes is blocked from adding more, but keeps their existing count.
 * (This is equivalent to: allow iff currentCount < freeLimit, since at enforcement time
 * currentCount is their actual existing count.)
 *
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
    .from('classrooms')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', userId)

  const currentCount = count || 0

  // Pro users (active subscription) have unlimited classes
  if (subscription.has_pro) {
    return { allowed: true, currentCount, limit: null }
  }

  const limit = subscription.classes_limit ?? 2

  // Grandfathering: allow creation only if under the free limit
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
 * Check if a teacher can add a student to a classroom.
 *
 * Grandfathering rule: caps apply only to NEW students going forward.
 * A free teacher's classroom can have 0-29 students and accept one more.
 * A free teacher's classroom at 30+ students is blocked from adding more.
 *
 * Returns { allowed, reason, currentCount, limit }.
 */
export async function canAddStudent(
  classroomId: string
): Promise<{
  allowed: boolean
  reason?: string
  currentCount: number
  limit: number | null
}> {
  const supabase = await createClient()

  // Get the classroom to find its teacher
  const { data: classroomData, error: classroomError } = await supabase
    .from('classrooms')
    .select('teacher_id')
    .eq('id', classroomId)

  if (classroomError || !classroomData || classroomData.length === 0) {
    return {
      allowed: false,
      reason: 'Classroom not found',
      currentCount: 0,
      limit: 30,
    }
  }

  const teacherId = classroomData[0].teacher_id
  const subscription = await checkTeacherSubscription(teacherId)

  // Count current students in this classroom
  const { count } = await supabase
    .from('classroom_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', classroomId)

  const currentCount = count || 0

  // Pro users (active subscription) have unlimited students
  if (subscription.has_pro) {
    return { allowed: true, currentCount, limit: null }
  }

  const limit = subscription.students_limit_per_class ?? 30

  // Grandfathering: allow addition only if under the free limit
  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `This classroom has reached the free tier limit of ${limit} students.`,
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