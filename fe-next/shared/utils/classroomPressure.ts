/**
 * The pressure dials, normalized in ONE place.
 *
 * Three consumers read the same raw value: the server merging it into the
 * startGame payload, the quiz engine deciding whether speed counts, and every
 * client deciding what to render. Three independent "what does `hidden` mean"
 * interpretations is recurring pitfall class 3 — so the defaults and the
 * tolerance for garbage (an old client, a hand-edited Redis record) live here
 * and nowhere else.
 *
 * The default is the HYPED game-show on purpose: calm is what Pro unlocks, so
 * a missing or corrupt value must always resolve back to loud, never to calm.
 */

import type { ClassroomPressure, ResolvedClassroomPressure } from '@/shared/types/classroom';

export const DEFAULT_CLASSROOM_PRESSURE: ResolvedClassroomPressure = {
  leaderboard: 'full',
  timer: 'full',
  speedScoring: true,
};

const LEADERBOARD_CHOICES = new Set(['full', 'top3', 'hidden']);
const TIMER_CHOICES = new Set(['full', 'gentle', 'off']);

export function normalizeClassroomPressure(raw: unknown): ResolvedClassroomPressure {
  const input = (raw && typeof raw === 'object' ? raw : {}) as ClassroomPressure;
  return {
    leaderboard: LEADERBOARD_CHOICES.has(input.leaderboard as string)
      ? (input.leaderboard as ResolvedClassroomPressure['leaderboard'])
      : DEFAULT_CLASSROOM_PRESSURE.leaderboard,
    timer: TIMER_CHOICES.has(input.timer as string)
      ? (input.timer as ResolvedClassroomPressure['timer'])
      : DEFAULT_CLASSROOM_PRESSURE.timer,
    speedScoring:
      typeof input.speedScoring === 'boolean'
        ? input.speedScoring
        : DEFAULT_CLASSROOM_PRESSURE.speedScoring,
  };
}

/**
 * Read the dials off a classroom game `settings` record (or anything shaped
 * like one). The settings type itself lives in a file under separate
 * ownership, so this takes `unknown` and does the narrowing once.
 */
export function readClassroomPressure(settings: unknown): ResolvedClassroomPressure {
  const pressure =
    settings && typeof settings === 'object'
      ? (settings as { pressure?: unknown }).pressure
      : undefined;
  return normalizeClassroomPressure(pressure);
}

/**
 * The client-side read of a startGame payload. Presence is the signal: a
 * payload with no `pressure` is a non-classroom room and must read as "no
 * dials" (null), not as the loud defaults — otherwise every casual game
 * would render classroom affordances.
 */
export function pressureFromStartPayload(payload: unknown): ResolvedClassroomPressure | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = (payload as { pressure?: unknown }).pressure;
  if (raw === undefined || raw === null) return null;
  return normalizeClassroomPressure(raw);
}

/** Hidden = no standings anywhere until results. top3 still shows a podium. */
export function isLeaderboardHidden(pressure: ResolvedClassroomPressure): boolean {
  return pressure.leaderboard === 'hidden';
}

/** Off = no student-facing clock at all. Gentle still counts down. */
export function isStudentTimerHidden(pressure: ResolvedClassroomPressure): boolean {
  return pressure.timer === 'off';
}

/**
 * Gentle clamps the red-pulse escalation; off must suppress too, because a
 * hidden countdown that still drives the screen-glow vignette is an anxiety
 * artifact with no clock attached to it.
 */
export function shouldSuppressTimerUrgency(pressure: ResolvedClassroomPressure): boolean {
  return pressure.timer !== 'full';
}

/**
 * top3 trims a full standings list to the podium. Hidden deliberately does
 * NOT trim — the caller swaps the list for the "your teacher will reveal
 * results" beat, so an empty list here would read as "no scores yet".
 */
export function trimLeaderboardForPressure<T>(
  leaderboard: T[],
  pressure: ResolvedClassroomPressure
): T[] {
  return pressure.leaderboard === 'top3' ? leaderboard.slice(0, 3) : leaderboard;
}
