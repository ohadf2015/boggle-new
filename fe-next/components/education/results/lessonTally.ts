import type { ClassroomSummary, ClassroomPodiumEntry } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

/** Score counts every valid word; lesson numbers only mean something once one lesson word landed. */
export function lessonWordsLanded(summary: Pick<ClassroomSummary, 'totalWords' | 'classFoundCount'>): boolean {
  return summary.totalWords > 0 && summary.classFoundCount > 0;
}

export function podiumLessonCount(
  entry: Pick<ClassroomPodiumEntry, 'wordsFound' | 'totalWords'>,
  landed: boolean
): { found: number; total: number } | null {
  if (!landed) return null;
  if (typeof entry.wordsFound !== 'number' || typeof entry.totalWords !== 'number') return null;
  if (entry.wordsFound <= 0) return null;
  return { found: entry.wordsFound, total: entry.totalWords };
}

export interface ClassWord {
  word: string;
  foundBy: string[];
}

/** The class's best valid finds — students only, deduped across players, longest first. */
export function classFoundWords(
  players: PlayerResult[] | undefined,
  { exclude = [], limit = 10 }: { exclude?: string[]; limit?: number } = {}
): ClassWord[] {
  const skip = new Set(exclude.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const byKey = new Map<string, ClassWord>();
  for (const player of players ?? []) {
    if (player.isBot || player.isHost || skip.has(player.username.trim().toLowerCase())) continue;
    for (const detail of player.allWords ?? []) {
      if (!detail?.validated || typeof detail.word !== 'string') continue;
      const key = detail.word.trim().toLowerCase();
      if (!key) continue;
      const entry = byKey.get(key) ?? { word: key, foundBy: [] };
      if (!entry.foundBy.includes(player.username)) entry.foundBy.push(player.username);
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.word.length - a.word.length || b.foundBy.length - a.foundBy.length || a.word.localeCompare(b.word))
    .slice(0, limit);
}
