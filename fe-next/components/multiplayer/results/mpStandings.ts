import type { Avatar } from '@/shared/types/game';

/**
 * One standings row for the results / intermission screens.
 *
 * The big number is ALWAYS the server's round score, in the server's order —
 * the same numbers the live leaderboard showed a second ago (pitfall class 3:
 * one side is the source of truth, the other displays it). Series totals are a
 * labelled secondary line, only from round 2 on.
 */
export interface MpStandingRow {
  username: string;
  avatar?: Avatar;
  isBot?: boolean;
  isMe: boolean;
  /** 1-based position in the server order (same as `currentPlayerRank`). */
  rank: number;
  score: number;
  /** Series total incl. this round's live score; null on round 1 / no series. */
  seriesTotal: number | null;
  /** Series rank movement since last round (+ = climbed). */
  seriesDelta: number;
}

interface ScoreLike {
  username: string;
  score: number;
  avatar?: Avatar;
  isBot?: boolean;
}

interface SeriesStandingLike {
  username: string;
  totalScore: number;
  roundScores: number[];
  rankChange: number;
}

export interface BuildMpStandingsInput {
  sortedScores: ScoreLike[];
  username: string | undefined;
  normalizeUsername: (name: string | undefined | null) => string;
  series?: { roundNumber: number; standings: SeriesStandingLike[] | undefined } | null;
}

export function buildMpStandings({ sortedScores, username, normalizeUsername, series }: BuildMpStandingsInput): MpStandingRow[] {
  const me = normalizeUsername(username);
  const withSeries = !!series && series.roundNumber >= 2;
  const byName = new Map((series?.standings ?? []).map((s) => [s.username, s]));

  return sortedScores.map((p, i) => {
    const score = Number.isFinite(p.score) ? p.score : 0;
    let seriesTotal: number | null = null;
    let seriesDelta = 0;
    if (withSeries) {
      const s = byName.get(p.username);
      if (s) {
        // The tracker dedups a re-emitted round, so its copy of THIS round can
        // be the pre-validation number. Rebuild: earlier rounds + live score.
        const recordedThisRound = s.roundScores[s.roundScores.length - 1] ?? 0;
        seriesTotal = s.totalScore - recordedThisRound + score;
        seriesDelta = s.rankChange;
      } else {
        seriesTotal = score;
      }
    }
    return {
      username: p.username,
      avatar: p.avatar,
      isBot: p.isBot,
      isMe: !!me && normalizeUsername(p.username) === me,
      rank: i + 1,
      score,
      seriesTotal,
      seriesDelta,
    };
  });
}
