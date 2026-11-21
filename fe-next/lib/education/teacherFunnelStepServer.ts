/**
 * Server builder for teacher_funnel_step.
 *
 * Emission goes through captureEduServerEvents so $host is stamped and the
 * growth: twin rides the same chokepoint as signup_completed. Never import
 * this from a 'use client' module — posthog-node must stay out of the client
 * graph. Client gates beacon /api/education/teacher/funnel-step instead.
 */
import { captureEduServerEvents, type EduServerEvent } from '@/backend/utils/educationTelemetry';
import {
  TEACHER_FUNNEL_STEP_EVENT,
  TEACHER_FUNNEL_STEP_INDEX,
  type TeacherFunnelStep,
} from './teacherFunnelStep';

export interface TeacherFunnelStepArgs {
  teacherId: string;
  step: TeacherFunnelStep;
  isTestAccount: boolean;
  locale?: string | null;
  classroomId?: string | null;
}

export function buildTeacherFunnelStepEvent(args: TeacherFunnelStepArgs): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: TEACHER_FUNNEL_STEP_EVENT,
    properties: {
      step: args.step,
      step_index: TEACHER_FUNNEL_STEP_INDEX[args.step],
      is_test_account: args.isTestAccount,
      ...(args.locale ? { locale: args.locale } : {}),
      ...(args.classroomId ? { classroom_id: args.classroomId } : {}),
    },
  };
}

/** Analytics must never take a teacher write down with it. */
export function emitTeacherFunnelStep(args: TeacherFunnelStepArgs): void {
  try {
    captureEduServerEvents([buildTeacherFunnelStepEvent(args)]);
  } catch {
    /* captureEduServerEvents already swallows transport errors */
  }
}
