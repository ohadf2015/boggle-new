/**
 * Education server telemetry — payload builders + a host-tagging emitter.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every real classroom practice completion is written by the Socket.IO backend
 * (`classroomGamePersistence.ts`), not by the browser. The React-side
 * `edu_practice_complete` / `edu_error` calls in `PracticeSessionProvider` only
 * run on `/[locale]/student/lessons/[id]`, a route that saw 5 pageviews from 2
 * users in 180 days and has never produced a completed session. So the
 * education funnel was instrumented on the dead surface and blind on the live
 * one. This module instruments the live one.
 *
 * THE `$host` RULE — do not remove it
 * -----------------------------------
 * This PostHog project is shared by ~12 apps, so EVERY dashboard, funnel and
 * saved query filters `properties.$host = 'www.lexiclash.live'`. posthog-js
 * derives `$host` from the browser; posthog-node does NOT set it at all.
 * Measured on production 2026-09-15: 2,419 `mp_player_dropped` and 4
 * `email_subscribed` events — the only server-emitted events with volume — have
 * `$host = NULL`, i.e. the whole backend channel is invisible to every query
 * that has ever been run against it. Emitting through `captureEduServerEvents`
 * is what keeps education events out of that hole; a bare
 * `getPostHogServer()?.capture()` puts them straight back into it.
 *
 * Shape follows `mpDropTelemetry.ts`: pure builders (trivially unit-testable),
 * with the single I/O function kept thin and non-throwing — analytics must
 * never break a live classroom.
 */

import { getPostHogServer } from '@/lib/posthog';
// Extensionless relative specifiers on purpose. Anything under `backend/` that
// becomes reachable from an `app/api/**/route.ts` gets webpack-bundled, and a
// `.js` relative specifier passes tsx, tsc, vitest and eslint while breaking
// ONLY `npm run build` — the slowest possible place to find out.
import type { ClassroomGame } from '../modules/classroomGameManager';
import logger from './logger';

/**
 * The host every LexiClash dashboard filters on. Derived from the deployed app
 * URL so a preview deployment tags itself honestly rather than masquerading as
 * production, with the production hostname as the fallback.
 */
function resolveAnalyticsHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return 'www.lexiclash.live';
  try {
    return new URL(raw).hostname || 'www.lexiclash.live';
  } catch {
    return 'www.lexiclash.live';
  }
}

export const EDU_ANALYTICS_HOST = resolveAnalyticsHost();

export interface EduServerEvent {
  distinctId: string;
  event: string;
  properties: Record<string, unknown>;
}

export interface EduEventContext {
  /**
   * Whether this actor is a QA/automation account. Rides the event so the
   * teacher funnel can exclude test traffic with a property filter instead of
   * the hand-built email patterns that the 2026-09-12 purge had to reconstruct
   * by hand. See `.claude/rules/70-test-accounts.md`.
   */
  isTestAccount: boolean;
}

/**
 * Per-player outcome the completion event reports.
 *
 * The `...Count` suffixes are load-bearing, not verbosity. The
 * `practice_sessions.results` blob written a few lines away in
 * `classroomGamePersistence.ts` has its OWN `lessonWordsFound` and
 * `lessonWordsAsked`, and there they are `string[]`. Naming these the same
 * would leave a repo-wide grep showing one identifier as both a number and a
 * string array, which reads as "the type changed under me" to whoever finds it
 * while debugging something else entirely.
 */
export interface ClassroomPlayerOutcome {
  userId: string;
  score: number;
  xpEarned: number;
  /** How many lesson words this player found. */
  lessonWordsFoundCount: number;
  /** How many lesson words the game actually put in front of them. */
  lessonWordsAskedCount: number;
}

function gameModeOf(game: ClassroomGame): string {
  return game.settings?.gameMode ?? 'classic';
}

/**
 * `edu_classroom_game_started` — the moment a teacher's class actually starts
 * playing. Keyed on the teacher, because the question this answers is "which
 * modes do teachers run in class, and how big are the classes".
 *
 * Returns null for a game with no classroom, rather than emitting an event whose
 * `classroom_id` is empty — a null classroom_id in the funnel is worse than no
 * row, because it looks like data.
 */
export function buildClassroomGameStartedEvent(
  game: ClassroomGame,
  ctx: EduEventContext
): EduServerEvent | null {
  if (!game?.classroomId) return null;

  return {
    distinctId: game.teacherId,
    event: 'edu_classroom_game_started',
    properties: {
      classroom_id: game.classroomId,
      game_code: game.gameCode,
      game_mode: gameModeOf(game),
      player_count: game.players?.length ?? 0,
      lesson_count: game.lessonIds?.length ?? 0,
      is_test_account: ctx.isTestAccount,
    },
  };
}

/**
 * `edu_classroom_game_completed` — one event per STUDENT, so the classroom
 * session joins end to end against the browser-side events that same student
 * already emits. `distinctId` is the Supabase auth user id, which is exactly
 * what `identifyUserForAnalytics` passes to `posthog.identify()`, so the person
 * merges instead of forking into an orphan.
 */
export function buildClassroomGameCompletedEvents(
  game: ClassroomGame,
  outcomes: ClassroomPlayerOutcome[]
): EduServerEvent[] {
  if (!game?.classroomId || !outcomes?.length) return [];

  const gameMode = gameModeOf(game);

  return outcomes.map((o) => ({
    distinctId: o.userId,
    event: 'edu_classroom_game_completed',
    properties: {
      classroom_id: game.classroomId,
      game_code: game.gameCode,
      game_mode: gameMode,
      lesson_count: game.lessonIds?.length ?? 0,
      score: o.score,
      xp_earned: o.xpEarned,
      // The EVENT property names stay as they are — they are the PostHog
      // taxonomy and renaming them would orphan any query already written
      // against them. Only the TypeScript field names carry the suffix.
      lesson_words_found: o.lessonWordsFoundCount,
      lesson_words_asked: o.lessonWordsAskedCount,
      // null, never NaN — a NaN silently breaks PostHog aggregations.
      lesson_accuracy:
        o.lessonWordsAskedCount > 0
          ? o.lessonWordsFoundCount / o.lessonWordsAskedCount
          : null,
      player_count: game.players?.length ?? 0,
    },
  }));
}

/**
 * The ONLY way education server events should reach PostHog. Stamps `$host` on
 * every one (see the module header) and swallows transport failures — a dead
 * analytics endpoint must never take a classroom down with it.
 */
export function captureEduServerEvents(events: EduServerEvent[]): void {
  if (!events?.length) return;

  const client = getPostHogServer();
  if (!client) return;

  for (const ev of events) {
    try {
      client.capture({
        distinctId: ev.distinctId,
        event: ev.event,
        properties: {
          ...ev.properties,
          // Last, so a caller's property bag can never clobber the one thing
          // that decides whether this event is visible at all.
          $host: EDU_ANALYTICS_HOST,
        },
      });
    } catch (err) {
      logger.error(
        'EDU_TELEMETRY',
        `Failed to capture ${ev.event}: ${err instanceof Error ? err.message : 'unknown'}`
      );
    }
  }
}

/** Which door turned the student away. The two have different auth rules. */
export type ClassroomJoinDoor = 'join' | 'classroomBanner';

export interface ClassroomJoinRefusal {
  gameCode: string;
  /** Null when the code never resolved to a classroom in the first place. */
  classroomId: string | null;
  /** The server's own reason code, not the string the student was shown. */
  reason: string;
  door: ClassroomJoinDoor;
  /** Supabase auth id, or null for a guest student. */
  actorId: string | null;
}

/**
 * `edu_classroom_join_refused` — a student who was turned away from a live
 * classroom game.
 *
 * WHY THIS EXISTS
 * ---------------
 * A teacher reported on 2026-09-14 that a few students got an error on the same
 * code that worked for the rest of the class. Reconstructing what happened was
 * impossible: a refused student writes no row and, on a school Chromebook that
 * blocks PostHog, emits no browser event either. The 8-student roster against
 * ~5 browser-side `mp_join_outcome` events was the only evidence that anything
 * had gone wrong, and it could not say WHY.
 *
 * The server always sees the refusal, so the server is where the record has to
 * be made. It carries the server's own reason code rather than the student-
 * facing message, because several gates answer "Game not found" deliberately —
 * the seat gate and the ended-session gate both do, so that a stranger probing
 * codes learns nothing. That ambiguity is correct for the student and useless
 * for a teacher, and this is how both can be true at once.
 *
 * A guest has no auth id, so the refusal is keyed to the room instead of being
 * dropped: an un-attributed refusal still answers "how many children did not
 * get in, and which gate stopped them", which is the question that had no
 * answer at all.
 */
export function buildClassroomJoinRefusedEvent(
  refusal: ClassroomJoinRefusal
): EduServerEvent | null {
  if (!refusal?.gameCode) return null;

  return {
    distinctId: refusal.actorId ?? `anonymous-${refusal.gameCode}`,
    event: 'edu_classroom_join_refused',
    properties: {
      game_code: refusal.gameCode,
      classroom_id: refusal.classroomId,
      reason: refusal.reason,
      door: refusal.door,
      is_guest: !refusal.actorId,
    },
  };
}
