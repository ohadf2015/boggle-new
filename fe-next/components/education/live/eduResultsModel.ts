import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import { podiumWithoutHost, standingsWithoutHost } from '@/lib/education/roundEndPodium';
import { lessonWordsLanded } from '@/components/education/results/lessonTally';

export interface ClassStats {
  students: number;
  words: number;
  avgScore: number;
  lesson: { found: number; total: number } | null;
}

function studentsOnly(players: PlayerResult[] | undefined, teacherName: string): PlayerResult[] {
  return standingsWithoutHost((players ?? []).filter((p) => !p.isHost), teacherName);
}

function wordsOf(p: PlayerResult): number {
  return p.wordsFoundCount ?? p.allWords?.length ?? 0;
}

export function classStats(summary: ClassroomSummary, players: PlayerResult[] | undefined): ClassStats {
  const students = studentsOnly(players, summary.teacherName);
  const total = students.reduce((sum, p) => sum + (p.score ?? 0), 0);
  return {
    students: students.length,
    words: students.reduce((sum, p) => sum + wordsOf(p), 0),
    avgScore: students.length ? Math.round(total / students.length) : 0,
    lesson: lessonWordsLanded(summary) ? { found: summary.classFoundCount, total: summary.totalWords } : null,
  };
}

export interface PodiumSeat {
  username: string;
  score: number;
  rank: number;
  avatar?: PlayerResult['avatar'];
}

/** Server ranks when the round carries them (host removed); otherwise the top three scores. */
export function hostPodium(summary: ClassroomSummary, players: PlayerResult[] | undefined): PodiumSeat[] {
  const students = studentsOnly(players, summary.teacherName);
  const avatarOf = new Map(students.map((p) => [p.username, p.avatar]));
  const server = podiumWithoutHost(summary.podium, summary.teacherName);
  const seats = server.length
    ? server.map((p) => ({ username: p.username, score: p.score, rank: p.rank }))
    : [...students].sort((a, b) => b.score - a.score).map((p, i) => ({ username: p.username, score: p.score, rank: i + 1 }));
  return seats.slice(0, 3).map((s) => ({ ...s, avatar: avatarOf.get(s.username) }));
}

export function studentPlacing(players: PlayerResult[] | undefined, username: string, teacherName: string) {
  const sorted = [...studentsOnly(players, teacherName)].sort((a, b) => b.score - a.score);
  const index = sorted.findIndex((p) => p.username === username);
  if (index < 0) return null;
  return { rank: index + 1, total: sorted.length, score: sorted[index].score };
}
