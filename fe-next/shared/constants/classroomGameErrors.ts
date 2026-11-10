import { LOBBY_LOCK_FAILED, ROOM_LOCKED } from '@/shared/types/classroomLobbyLock';

/** Every `code` a `classroomGameError` can carry. The server emits only these; clients map each one. */
export const CLASSROOM_GAME_ERROR_CODES = [
  'AUTH_REQUIRED',
  'AUTH_UNVERIFIED',
  'USER_ID_MISMATCH',
  'INVALID_PAYLOAD',
  'NOT_TEACHER',
  'NOT_A_MEMBER',
  'LOOKUP_UNAVAILABLE',
  'GAME_NOT_FOUND',
  'GAME_ENDED',
  'GAME_ALREADY_STARTED',
  ROOM_LOCKED,
  'JOIN_THREW',
  'CREATE_FAILED',
  'LIST_FAILED',
  'START_FAILED',
  'MODE_SWITCH_FAILED',
  'MODE_SWITCH_MID_ROUND',
  'PRESSURE_FAILED',
  'PRESSURE_NEEDS_PRO',
  LOBBY_LOCK_FAILED,
  'NO_QUIZ_QUESTIONS',
] as const;

export type ClassroomGameErrorCode = (typeof CLASSROOM_GAME_ERROR_CODES)[number];
