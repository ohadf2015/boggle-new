/**
 * Server-side builder for the teacher activation funnel's classroom step.
 *
 * Pure builder + plan resolver only — emission goes through
 * `captureEduServerEvents` in backend/utils/educationTelemetry.ts, which stamps
 * $host and the growth:* twin (the classroom step's Growth Radar twin therefore
 * rides the same chokepoint as every other server education event).
 *
 * SERVER-ONLY: this file imports @/lib/subscriptions (server). Never import it
 * from a 'use client' module or from teacherActivationFunnel.ts — the client
 * file must stay free of server-only imports so webpack never pulls
 * node builtins into the client graph.
 */
import { checkTeacherSubscription } from '@/lib/subscriptions';
import type { EduServerEvent } from '@/backend/utils/educationTelemetry';
import type { TeacherPlan } from './teacherOnboardingFunnel';
import {
  TEACHER_ACTIVATION_FUNNEL_EVENTS,
  TEACHER_ACTIVATION_STEP_INDEX,
  type TeacherActivationStep,
} from './teacherActivationFunnelEvents';

export interface BuildTeacherActivationStepArgs {
  teacherId: string;
  step: TeacherActivationStep;
  locale: string;
  plan: TeacherPlan;
  /** QA/automation account — rides the event so funnels can exclude test traffic. */
  isTestAccount: boolean;
}

export function buildTeacherActivationFunnelStepEvent(
  args: BuildTeacherActivationStepArgs
): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: TEACHER_ACTIVATION_FUNNEL_EVENTS.step,
    properties: {
      step: args.step,
      step_index: TEACHER_ACTIVATION_STEP_INDEX[args.step],
      locale: args.locale,
      plan: args.plan,
      is_test_account: args.isTestAccount,
    },
  };
}

/**
 * Map the subscriptions row onto the funnel's plan slice. A failed read yields
 * 'unknown' — the entitlement read must never take a classroom create down with
 * it, and 'unknown' is the honest slice when the plan could not be resolved.
 */
export async function resolveTeacherActivationPlan(userId: string): Promise<TeacherPlan> {
  try {
    const subscription = await checkTeacherSubscription(userId);
    if (!subscription.has_pro) return 'free';
    return subscription.status === 'trialing' ? 'trial' : 'pro';
  } catch {
    return 'unknown';
  }
}
