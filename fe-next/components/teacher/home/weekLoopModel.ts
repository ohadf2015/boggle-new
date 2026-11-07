import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import type { ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { parseHostMode, teacherHostHref } from '@/lib/education/teacherHostHref';
import { catalogueEntry } from '@/components/education/ClassroomModeCatalogueData';

/** The classroom-game lobby's decided-room flow (`QUICK_PRESENTATION_FLOW`); kept local so Home does not pull the provisioner. */
export const REPLAY_FLOW = 'quick';
export const READY_PCT = 80;
export const FOLLOW_UP_DAYS = 14;

export interface WeekLoopLesson {
  id: string;
  name: string;
  classroom_id: string | null;
  created_at?: string | null;
  words?: readonly unknown[] | null;
}

export interface PlayAgainTarget {
  href: string;
  mode: ClassroomCatalogueId | null;
  list: { id: string; name: string; isNew: boolean } | null;
}

export type ReadyForTest = { kind: 'counts'; ready: number; rated: number } | { kind: 'noResults' };

function currentList(game: RecentClassroomGame, lessons: readonly WeekLoopLesson[], classroomId: string): PlayAgainTarget['list'] {
  const usable = lessons.filter((l) => (l.words?.length ?? 0) > 0);
  const lastIds = game.lessonIds ?? [];
  const candidates = usable.filter((l) => l.classroom_id === classroomId || lastIds.includes(l.id));
  const newest = candidates.reduce<WeekLoopLesson | null>(
    (best, l) => (!best || (l.created_at ?? '') > (best.created_at ?? '') ? l : best),
    null,
  );
  return newest ? { id: newest.id, name: newest.name, isNew: !lastIds.includes(newest.id) } : null;
}

export function playAgainTarget({ game, lessons, classroomId, locale }: {
  game: RecentClassroomGame | null;
  lessons: readonly WeekLoopLesson[];
  classroomId: string;
  locale: string;
}): PlayAgainTarget | null {
  if (!game) return null;
  const mode = parseHostMode(game.gameMode);
  const list = currentList(game, lessons, classroomId);
  if (mode && list) {
    const query = new URLSearchParams({ flow: REPLAY_FLOW, classroomId, lessonId: list.id, mode });
    return { href: `/${locale}/education/classroom-game?${query.toString()}`, mode, list };
  }
  const base = teacherHostHref(locale, { classroomId, mode: mode ?? undefined });
  return { href: list ? `${base}&lessonId=${encodeURIComponent(list.id)}` : base, mode, list };
}

export function replayDetail(target: PlayAgainTarget, t: (key: string) => string): string {
  const modeKey = target.mode ? catalogueEntry(target.mode)?.nameKey : undefined;
  return [modeKey ? t(modeKey) : '', target.list?.name ?? ''].filter(Boolean).join(' · ');
}

/** Students on the last list at READY_PCT or more. Rows without word results (older games) are left out, never counted as 0%. */
export function followUpGame(game: RecentClassroomGame | null, nowMs: number): RecentClassroomGame | null {
  const playedMs = game ? Date.parse(game.playedAt) : NaN;
  return Number.isFinite(playedMs) && nowMs - playedMs <= FOLLOW_UP_DAYS * 86_400_000 ? game : null;
}

export function readyForTest(game: RecentClassroomGame | null): ReadyForTest | null {
  if (!game) return null;
  const rated = game.players.filter((p) => p.lessonWordsFound.length + p.lessonWordsMissed.length > 0);
  if (rated.length === 0) return { kind: 'noResults' };
  return { kind: 'counts', ready: rated.filter((p) => p.accuracyPct >= READY_PCT).length, rated: rated.length };
}

export function missedLastGame(game: RecentClassroomGame | null): string[] {
  return (game?.absentStudents ?? []).map((s) => s.name);
}
