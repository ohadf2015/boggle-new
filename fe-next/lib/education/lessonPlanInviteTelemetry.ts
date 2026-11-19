/**
 * "Plan your first class" after a rehearsal, step by step, so the twice-weekly check can read
 * rehearsal -> booked -> real class:
 *   growth:lesson_plan_prompt_shown { source }        step shown (LessonPlanPrompt)
 *   growth:lesson_planned { hours_ahead, source }      date set (LessonPlanPrompt)
 *   growth:lesson_plan_invite_added { target, source } calendar invite added
 *   growth:lesson_plan_link_copied { source }          class join link copied
 * Never sends the join code or the link.
 */
import { trackGrowthEvent } from '@/utils/growthTracking';

export type LessonPlanInviteSource = 'practice_results' | 'class_setup' | 'teacher_home';

export function trackLessonPlanInviteAdded(args: { target: 'google' | 'ics'; source: LessonPlanInviteSource }): void {
  trackGrowthEvent('lesson_plan_invite_added', { target: args.target, source: args.source });
}

export function trackLessonPlanLinkCopied(args: { source: LessonPlanInviteSource }): void {
  trackGrowthEvent('lesson_plan_link_copied', { source: args.source });
}
