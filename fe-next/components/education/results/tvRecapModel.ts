import type { ClassroomPodiumEntry, ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import { podiumWithoutHost } from '@/lib/education/roundEndPodium';
import { classStats, hostPodium, type ClassStats } from '@/components/education/live/eduResultsModel';
import type { PodiumEntry } from './ResultsPodium';
import { orderPodiumByScore } from './podiumOrder';
import { lessonWordsLanded, podiumLessonCount } from './lessonTally';
import { roundOutcome, type RoundOutcome } from './roundOutcome';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface TvRecap {
  podium: PodiumEntry[];
  outcome: RoundOutcome;
  landed: boolean;
  stats: ClassStats | null;
  /** This round's points per student, for the session climb. */
  roundScores: Record<string, number>;
}

/** The server's podium when the round carries one; otherwise the top three final scores. */
function podiumSource(summary: ClassroomSummary, players: PlayerResult[] | undefined): ClassroomPodiumEntry[] {
  const server = podiumWithoutHost(summary.podium, summary.teacherName);
  if (server.length || !players?.length) return server;
  return hostPodium(summary, players).map(({ username, score, rank }) => ({ username, score, rank }));
}

export function buildTvRecap(summary: ClassroomSummary, players: PlayerResult[] | undefined, t: Translate): TvRecap {
  const landed = lessonWordsLanded(summary);
  const podium = orderPodiumByScore(
    podiumSource(summary, players).map((p) => {
      const lesson = podiumLessonCount(p, landed);
      return {
        username: p.username,
        score: p.score,
        rank: p.rank,
        detail: lesson ? t('eduLive.results.podiumLessonWords', lesson) : undefined,
      };
    })
  );
  const hostKey = (summary.teacherName ?? '').trim().toLowerCase();
  const masteryCount = Object.keys(summary.masteryByPlayer ?? {}).filter((n) => n.trim().toLowerCase() !== hostKey).length;
  const stats = players?.length ? classStats(summary, players) : null;
  const outcome = roundOutcome(podium, Math.max(masteryCount, stats?.students ?? 0));
  const roundScores = Object.fromEntries((players ?? []).map((p) => [p.username, p.score ?? 0]));
  return { podium, outcome, landed, stats: stats && stats.students > 0 ? stats : null, roundScores };
}
