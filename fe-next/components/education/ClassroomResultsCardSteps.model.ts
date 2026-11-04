import type { ClassroomSummary } from '@/shared/types/classroom';
import { standingsWithoutHost } from '@/lib/education/roundEndPodium';

export type ResultStep = 'score' | 'lesson' | 'missed';

const key = (s: string) => s.trim().toLowerCase();

function placedWords(summary: ClassroomSummary) {
  // A word the board never carried could not be found, so it is not this student's miss.
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map(key));
  const seen = new Set<string>();
  return summary.coverage.filter((c) => {
    const k = key(c.word);
    if (neverPlaced.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function studentMissedWords(summary: ClassroomSummary, username: string): string[] {
  const me = key(username);
  return placedWords(summary)
    .filter((c) => !c.foundBy.some((u) => key(u) === me))
    .map((c) => c.word);
}

export function studentLessonTally(summary: ClassroomSummary, username: string) {
  const total = placedWords(summary).length;
  return { found: total - studentMissedWords(summary, username).length, total };
}

export function studentLine(
  summary: ClassroomSummary,
  username: string,
  standings: { username: string; score: number; isBot?: boolean }[] | undefined,
): { score: number; rank: number; players: number } | null {
  const humans = standingsWithoutHost(standings, summary.teacherName).filter((p) => !p.isBot);
  const i = humans.findIndex((p) => key(p.username) === key(username));
  if (i < 0) return null;
  return { score: humans[i].score, rank: i + 1, players: humans.length };
}

export function resultSteps({ hasScore, missedCount }: { hasScore: boolean; missedCount: number }): ResultStep[] {
  const steps: ResultStep[] = hasScore ? ['score', 'lesson'] : ['lesson'];
  if (missedCount > 0) steps.push('missed');
  return steps;
}
