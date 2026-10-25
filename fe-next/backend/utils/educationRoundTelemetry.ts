/**
 * Server-side education events for classroom lifecycle and live rounds.
 *
 * Pure builders only. Emission goes through `captureEduServerEvents` in
 * educationTelemetry.ts, which stamps `$host` (see that module's header).
 */
import { createHash } from 'node:crypto';
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

/** Keyed by a hash of the link, so repeat opens of one report count as one viewer without naming the child. */
export function buildParentReportViewedEvent(args: {
  token: string;
  classroomId: string;
  locale: string;
  isTestAccount: boolean;
}): EduServerEvent {
  return {
    distinctId: `parent_report:${createHash('sha256').update(args.token).digest('hex').slice(0, 24)}`,
    event: 'parent_report_viewed',
    properties: { classroom_id: args.classroomId, locale: args.locale, is_test_account: args.isTestAccount },
  };
}

/** First invite copy/share as the server saved it; the browser copy events have been seen to never arrive. */
export function buildJoinCodeCopyRecordedEvent(args: { teacherId: string; isTestAccount: boolean }): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: EDU_EVENTS.joinCodeCopyRecorded,
    properties: { is_test_account: args.isTestAccount },
  };
}

export function buildFirstStudentJoinedEvent(args: {
  teacherId: string;
  classroomId: string;
  isTestAccount: boolean;
}): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: EDU_EVENTS.firstStudentJoined,
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
  isTestAccount: boolean;
}): EduServerEvent | null {
  if (!args.game?.classroomId) return null;
  return {
    distinctId: args.game.teacherId,
    event: EDU_EVENTS.liveRoundCompleted,
    properties: {
      ...roundProps(args.game),
      duration_seconds: args.durationSeconds,
      player_count: args.playerCount,
      is_test_account: args.isTestAccount,
    },
  };
}

/** Independent of practice writes, so a started game whose class bounced is still visible. */
export function buildLiveGameEndedEvent(
  game: ClassroomGame,
  ctx: { isTestAccount: boolean; now: Date }
): EduServerEvent | null {
  if (!game?.classroomId) return null;
  const startedMs = game.startedAt ? new Date(game.startedAt).getTime() : NaN;
  return {
    distinctId: game.teacherId,
    event: EDU_EVENTS.liveGameEnded,
    properties: {
      ...roundProps(game),
      player_count: game.players?.length ?? 0,
      had_started: Number.isFinite(startedMs),
      duration_seconds: Number.isFinite(startedMs)
        ? Math.max(0, Math.round((ctx.now.getTime() - startedMs) / 1000))
        : null,
      is_test_account: ctx.isTestAccount,
    },
  };
}

export type StudentReturnSurface = 'live' | 'practice' | 'assignment' | 'duel';

const RETENTION_MILESTONES = [7, 3, 1] as const;

/**
 * One event per student whose first classroom join is at least a full day old.
 * `day_n` is the raw day count; `retention_day` is the last D1/D3/D7 milestone reached.
 */
export function buildStudentReturnedEvents(args: {
  classroomId: string | null;
  now: Date;
  gameMode: string;
  surface: StudentReturnSurface;
  students: { userId: string; joinedAt: string | null; isTestAccount: boolean }[];
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
      properties: {
        classroom_id: args.classroomId,
        day_n: dayN,
        retention_day: RETENTION_MILESTONES.find((m) => dayN >= m) ?? null,
        game_mode: args.gameMode,
        surface: args.surface,
        is_test_account: s.isTestAccount,
      },
    });
  }
  return events;
}

export function buildTeacherFirstLiveGameEvent(args: {
  teacherId: string;
  classroomId: string;
  gameMode: string;
  playerCount: number;
  isTestAccount: boolean;
}): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: EDU_EVENTS.teacherFirstLiveGame,
    properties: {
      classroom_id: args.classroomId,
      game_mode: args.gameMode,
      player_count: args.playerCount,
      is_test_account: args.isTestAccount,
    },
  };
}

const utcDay = (ms: number) => Math.floor(ms / DAY_MS);

/** Whole UTC days since the teacher's first real round, when this real round is their first on a later day. */
export function secondLiveGameDaysSinceFirst(args: {
  firstRealRoundAt: string | null;
  secondDayReached: boolean;
  isRealRound: boolean;
  now: Date;
}): number | null {
  if (!args.isRealRound || args.secondDayReached || !args.firstRealRoundAt) return null;
  const firstMs = new Date(args.firstRealRoundAt).getTime();
  if (!Number.isFinite(firstMs)) return null;
  const days = utcDay(args.now.getTime()) - utcDay(firstMs);
  return days >= 1 ? days : null;
}

export function startOfNextUtcDay(iso: string): string {
  return new Date((utcDay(new Date(iso).getTime()) + 1) * DAY_MS).toISOString();
}

export function buildTeacherSecondLiveGameDayEvent(args: {
  teacherId: string;
  classroomId: string;
  gameMode: string;
  playerCount: number;
  daysSinceFirst: number;
  isTestAccount: boolean;
}): EduServerEvent {
  return {
    distinctId: args.teacherId,
    event: EDU_EVENTS.teacherSecondLiveGameDay,
    properties: {
      classroom_id: args.classroomId,
      game_mode: args.gameMode,
      player_count: args.playerCount,
      days_since_first: args.daysSinceFirst,
      is_test_account: args.isTestAccount,
    },
  };
}
