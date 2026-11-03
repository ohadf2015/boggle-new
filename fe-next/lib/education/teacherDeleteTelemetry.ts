/**
 * Teacher account-delete funnel telemetry (t_b5825a0a).
 *
 * The UR audit found the portfolio's only activated classroom teacher deleted
 * her account 6 minutes after the day-2 value email — and the flow emitted
 * NOTHING, so the retention funnel was blind at exactly the step that loses
 * the Teacher Pro pipeline's source audience. These are the client-side steps;
 * the server emits teacher_delete_completed / teacher_delete_failed from the
 * delete route itself (it alone knows the outcome).
 *
 * Funnel: viewed → reason_selected → (alternative_chosen | confirmed).
 * safeCapture never throws — analytics must not block a delete.
 */
import { safeCapture } from './telemetryCore';
import type { DeleteImpactSummary, TeacherDeleteReason } from '@/lib/account/deleteAccountImpact';

export type TeacherDeleteSurface = 'settings' | 'account_delete_page';

export type TeacherDeleteAlternative = 'unsubscribe_emails' | 'keep_free_account';

function impactProps(impact: DeleteImpactSummary): Record<string, unknown> {
  return {
    classroom_count: impact.classrooms.length,
    student_count: impact.totalStudents,
    rounds_played: impact.roundsPlayed,
    email_subscribed: impact.emailSubscribed,
  };
}

export function trackTeacherDeleteViewed(impact: DeleteImpactSummary, surface: TeacherDeleteSurface): void {
  safeCapture('teacher_delete_viewed', { ...impactProps(impact), surface });
}

export function trackTeacherDeleteReasonSelected(
  reason: TeacherDeleteReason,
  surface: TeacherDeleteSurface,
): void {
  safeCapture('teacher_delete_reason_selected', { reason, surface });
}

export function trackTeacherDeleteAlternativeChosen(
  alternative: TeacherDeleteAlternative,
  impact: DeleteImpactSummary,
  surface: TeacherDeleteSurface,
  extra: Record<string, unknown> = {},
): void {
  safeCapture('teacher_delete_alternative_chosen', {
    alternative,
    ...impactProps(impact),
    surface,
    ...extra,
  });
}

export function trackTeacherDeleteConfirmed(
  impact: DeleteImpactSummary,
  reason: TeacherDeleteReason | null,
  surface: TeacherDeleteSurface,
): void {
  safeCapture('teacher_delete_confirmed', {
    ...impactProps(impact),
    ...(reason ? { reason } : {}),
    surface,
  });
}
