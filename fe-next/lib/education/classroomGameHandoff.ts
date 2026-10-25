/**
 * Classroom → multiplayer handoff contract.
 *
 * One module owns BOTH ends of the channel so they cannot drift apart again:
 * the URL the teacher's lobby navigates to, and the predicate the multiplayer
 * session uses to decide whether to rehydrate `lessonGameData` from
 * sessionStorage. When these lived in two files the read was gated on
 * `?fromLesson=true`, which no caller ever set — the teacher's vocabulary and
 * chosen game mode were written and silently discarded.
 */

import { sanitizeUsername } from '@/utils/consts';
import { isClassroomLivePathname } from '@/lib/education/classroomLivePath';

/**
 * Whether this multiplayer entry carries a teacher-launched lesson.
 *
 * Deliberately NOT ungated: `lessonGameData` outlives the tab's classroom game
 * when the teacher leaves without passing through results, so a casual room
 * opened afterwards would inherit the class vocabulary.
 */
export function shouldLoadLessonData(search: string, pathname?: string | null): boolean {
  if (isClassroomLivePathname(pathname)) return true;
  const params = new URLSearchParams(search);
  return params.get('classroom') === 'true' || params.get('fromLesson') === 'true';
}


/**
 * The `lessonGameData` sessionStorage payload, as written by ClassroomGameLobby
 * and read back by useMultiplayerSession.
 */
export interface LessonGameData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language?: string;
  gameMode?: string;
  targetWord?: string;
  /** Team battle: free-for-all or teams, with the teacher's team count. */
  playStyle?: 'ffa' | 'teams';
  teamCount?: number;
  /** SPED-friendly accommodations (ride the startGame payload server-side). */
  accessibility?: {
    largeText?: boolean;
    audioCues?: boolean;
    participationPoints?: boolean;
  };
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}


/**
 * teacherName on createClassroomGame is UsernameSchema (no `@`, max 30).
 * Magic-link teachers fall back to email; OAuth names can be longer than 30.
 * Either one is `Invalid payload` server-side and looks like a dead CREATE ROOM.
 */
export function socketTeacherName(
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
  displayName?: string | null,
): string {
  const meta = user?.user_metadata;
  const raw =
    (displayName && displayName.trim()) ||
    (typeof meta?.full_name === 'string' ? meta.full_name : '') ||
    (typeof meta?.name === 'string' ? meta.name : '') ||
    user?.email?.split('@')[0] ||
    '';
  return sanitizeUsername(raw) || 'Teacher';
}
