/**
 * `edu_first_game_scheduled` { classroom_id, target, hours_ahead, locale }
 *
 * Fired when a teacher with no students yet puts the first game on a calendar from the
 * class-ready screen. The return visit lands with utm_campaign=edu_first_game.
 * Client-only, never throws. Never sends the join code.
 */
import { safeCapture } from './telemetryCore';

const FIRST_GAME_SCHEDULED_EVENT = 'edu_first_game_scheduled';
export type FirstGameCalendarTarget = 'google' | 'ics';

export function trackFirstGameScheduled(args: {
  classroomId: string;
  target: FirstGameCalendarTarget;
  hoursAhead: number;
  locale: string;
}): void {
  safeCapture(FIRST_GAME_SCHEDULED_EVENT, {
    classroom_id: args.classroomId,
    target: args.target,
    hours_ahead: args.hoursAhead,
    locale: args.locale,
  });
}

/**
 * `edu_home_practice_link_sent` { classroom_id, locale }: the teacher chose "send the link now"
 * so students practise the class word list at home instead of waiting for a live game.
 */
export function trackHomePracticeLinkSent(args: { classroomId: string; locale: string }): void {
  safeCapture('edu_home_practice_link_sent', { classroom_id: args.classroomId, locale: args.locale });
}
