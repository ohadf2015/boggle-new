import type { ClassroomGame } from './classroomGameTypes';

type RosterRecord = Pick<ClassroomGame, 'teacherId'> & Partial<Pick<ClassroomGame, 'players' | 'rosterUserIds'>>;

/** Distinct students who were in the room by any door: the class-page list plus everyone seated through `join`. */
export function classroomRosterCount(game: RosterRecord | null | undefined): number {
  if (!game) return 0;
  const ids = new Set<string>([...(game.players ?? []).map((p) => p.userId), ...(game.rosterUserIds ?? [])]);
  ids.delete(game.teacherId);
  return ids.size;
}
