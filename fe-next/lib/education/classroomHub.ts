import { computeClassStreak } from './classroomPlayStreak';

/**
 * Persistence the class hub needs, narrow on purpose so the rules are testable
 * without a database. The Supabase adapter lives in the route.
 */
export interface ClassHubStore {
  isMember(classroomId: string, studentId: string): Promise<boolean>;
  /** UTC dates (YYYY-MM-DD) on which the class completed a live round, newest window only. */
  fetchRoundDays(classroomId: string, sinceIso: string): Promise<string[]>;
  hasRematchToday(classroomId: string, studentId: string, todayIso: string): Promise<boolean>;
  /** 'duplicate' when the unique (class, student, day) row already exists. */
  insertRematch(classroomId: string, studentId: string, todayIso: string): Promise<'inserted' | 'duplicate'>;
}

export interface ClassHubState {
  streak: number;
  playedToday: boolean;
  rematchRequestedToday: boolean;
}

const STREAK_WINDOW_DAYS = 60;
const DAY_MS = 86_400_000;

export async function loadClassHubState(
  store: ClassHubStore,
  classroomId: string,
  studentId: string,
  todayIso: string
): Promise<ClassHubState> {
  if (!(await store.isMember(classroomId, studentId))) {
    throw new Error('NOT_A_MEMBER');
  }
  const since = new Date(Date.parse(`${todayIso}T00:00:00Z`) - STREAK_WINDOW_DAYS * DAY_MS).toISOString();

  let days: string[] = [];
  try {
    days = await store.fetchRoundDays(classroomId, since);
  } catch {
    // Missing relation or a read blip: show an honest zero rather than a broken hub.
    days = [];
  }
  const { streak, playedToday } = computeClassStreak(days, todayIso);
  const rematchRequestedToday = await store.hasRematchToday(classroomId, studentId, todayIso);
  return { streak, playedToday, rematchRequestedToday };
}

export async function requestClassRematch(
  store: ClassHubStore,
  classroomId: string,
  studentId: string,
  todayIso: string
): Promise<'requested' | 'already' | 'not_member'> {
  if (!(await store.isMember(classroomId, studentId))) return 'not_member';
  const result = await store.insertRematch(classroomId, studentId, todayIso);
  return result === 'duplicate' ? 'already' : 'requested';
}
