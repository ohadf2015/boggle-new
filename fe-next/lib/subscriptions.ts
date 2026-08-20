/**
 * Subscription management for LexiClash teachers.
 * Ported from standalone teacher-dashboard repo.
 *
 * Reads subscription state from the `subscriptions` table in Supabase.
 * Provides tier checking and limit enforcement.
 */

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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
  // `subscriptions` SELECT is own-row-only, but this is called with a userId the server has
  // already authorised — self, or the teacher who owns a classroom someone is joining. In
  // that second case the reader is the STUDENT, so on the request-scoped client the teacher's
  // row is invisible and a Pro teacher silently degrades to the free 30-student cap.
  // Entitlement limits are not user data; read them with service-role where available.
  const supabase = createAdminClient() ?? (await createClient())

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
  // Service-role, not the request-scoped client. The only caller is the join route, where
  // the person being counted is by definition NOT yet a member and not the teacher — and RLS
  // answers such a user with nothing. `classroom_memberships` SELECT is
  // `auth.uid() = student_id OR is_classroom_owner(...)`, so the count came back 0 for a
  // classroom that has members and this cap never once fired. The `classrooms` read only
  // resolved via a blanket "any signed-in user may read any classroom with a join_code"
  // policy clause, which is exactly the enumeration hole we want to remove.
  //
  // This is a capacity check the server runs on the TEACHER's behalf, not a read the joining
  // student is entitled to make.
  const admin = createAdminClient()
  if (!admin) {
    return {
      allowed: false,
      reason: 'service role key not configured',
      currentCount: 0,
      limit: 30,
    }
  }

  // Get the classroom to find its teacher
  const { data: classroomData, error: classroomError } = await admin
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
  const { count } = await admin
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
 *
 * Note: the DB columns are still named `lemon_squeezy_*` (a rename migration on
 * the live DB isn't worth the risk), but they now store whichever payment
 * provider is active — Polar after the 2026-08-09 pivot.
 */
export async function upsertSubscription({
  userId,
  tier,
  status,
  providerSubscriptionId,
  providerOrderId,
  providerProductId,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  userId: string
  tier: Tier
  status: SubscriptionStatus
  providerSubscriptionId?: string | null
  providerOrderId?: string | null
  providerProductId?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      tier,
      status,
      lemon_squeezy_subscription_id: providerSubscriptionId ?? null,
      lemon_squeezy_order_id: providerOrderId ?? null,
      lemon_squeezy_variant_id: providerProductId ?? null,
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