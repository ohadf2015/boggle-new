/**
 * Server-side education events for classroom lifecycle and live rounds.
 *
 * Pure builders only. Emission goes through `captureEduServerEvents` in
 * educationTelemetry.ts, which stamps `$host` (see that module's header).
 */
import { EDU_EVENTS } from '@/lib/analytics/eduEvents';
import type { ClassroomGame } from '../modules/classroomGameManager';
import type { EduServerEvent } from './educationTelemetry';

const DAY_MS = 86_400_000;

export function isQaEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith('@lexiclash.test');
}

export function buildClassroomCreatedEvent(args: {
  teacherId: string;
  classroomId: string;
  language: string;
  isTestAccount: boolean;
}): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: EDU_EVENTS.classroomCreated,
    properties: {
      classroom_id: args.classroomId,
      language: args.language,
      is_test_account: args.isTestAccount,
    },
  };
}

export function buildStudentJoinedEvent(args: {
  studentId: string;
  classroomId: string;
  isTestAccount: boolean;
}): EduServerEvent {
  return {
    distinctId: args.studentId,
    event: EDU_EVENTS.studentJoined,
    properties: { classroom_id: args.classroomId, is_test_account: args.isTestAccount },
  };
}

function roundProps(game: ClassroomGame): Record<string, unknown> {
  return {
    classroom_id: game.classroomId,
    game_code: game.gameCode,
    game_mode: game.settings?.gameMode ?? 'classic',
    lesson_count: game.lessonIds?.length ?? 0,
  };
}

export function buildLiveRoundStartedEvent(
  game: ClassroomGame,
  ctx: { isTestAccount: boolean }
): EduServerEvent | null {
  if (!game?.classroomId) return null;
  return {
    distinctId: game.teacherId,
    event: EDU_EVENTS.liveRoundStarted,
    properties: {
      ...roundProps(game),
      player_count: game.players?.length ?? 0,
      is_test_account: ctx.isTestAccount,
    },
  };
}

export function buildLiveRoundCompletedEvent(args: {
  game: ClassroomGame;
  durationSeconds: number | null;
  playerCount: number;
}): EduServerEvent | null {
  if (!args.game?.classroomId) return null;
  return {
    distinctId: args.game.teacherId,
    event: EDU_EVENTS.liveRoundCompleted,
    properties: {
      ...roundProps(args.game),
      duration_seconds: args.durationSeconds,
      player_count: args.playerCount,
    },
  };
}

/**
 * One event per student whose classroom join is at least a full day old.
 * Measured per round; analysts take the first event per person for retention.
 */
export function buildStudentReturnedEvents(args: {
  classroomId: string;
  now: Date;
  students: { userId: string; joinedAt: string | null }[];
}): EduServerEvent[] {
  const events: EduServerEvent[] = [];
  for (const s of args.students) {
    if (!s.joinedAt) continue;
    const joinedMs = new Date(s.joinedAt).getTime();
    if (!Number.isFinite(joinedMs)) continue;
    const dayN = Math.floor((args.now.getTime() - joinedMs) / DAY_MS);
    if (dayN < 1) continue;
    events.push({
      distinctId: s.userId,
      event: EDU_EVENTS.studentReturned,
      properties: { classroom_id: args.classroomId, day_n: dayN },
    });
  }
  return events;
}

export function buildTeacherFirstLiveGameEvent(args: {
  teacherId: string;
  classroomId: string;
  gameMode: string;
  playerCount: number;
}): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: EDU_EVENTS.teacherFirstLiveGame,
    properties: {
      classroom_id: args.classroomId,
      game_mode: args.gameMode,
      player_count: args.playerCount,
    },
  };
}
