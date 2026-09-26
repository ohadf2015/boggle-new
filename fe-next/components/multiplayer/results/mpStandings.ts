import type { Avatar } from '@/shared/types/game';
import { pickBestWord, type WordLike } from './mpResultsView';

/**
 * One standings row for the results / intermission screens.
 *
 * Built in the server's order with the server's round score as the big number
 * — the same numbers the live leaderboard showed a second ago (pitfall class 3:
 * one side is the source of truth, the other displays it). Series totals are a
 * labelled secondary line, only from round 2 on. The FINAL screen of a series
 * re-ranks these rows into the series ladder (`seriesLadder`): there the big
 * number is the series total and `roundScore` keeps the server's round score.
 */
export interface MpStandingRow {
  username: string;
  avatar?: Avatar;
  isBot?: boolean;
  isMe: boolean;
  /**
   * 1-based competition rank over the server order: equal scores share a rank
   * (1, 2, 2, 4) — the same rule the live HUD roster uses (`toMpRoster`), so a
   * player never reads #2 live and #3 a second later on results.
   */
  rank: number;
  score: number;
  /** Series total incl. this round's live score; null on round 1 / no series. */
  seriesTotal: number | null;
  /** Series rank movement since last round (+ = climbed). */
  seriesDelta: number;
  /** Series ladder only: the server's score for the round just played. */
  roundScore?: number;
  /** This player's best counted word of the round (the word reel), if any. */
  bestWord?: { word: string; score: number } | null;
}

interface ScoreLike {
  username: string;
  score: number;
  avatar?: Avatar;
  isBot?: boolean;
  allWords?: WordLike[] | null;
}

export interface SeriesStandingLike {
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

  const rows: MpStandingRow[] = [];
  sortedScores.forEach((p, i) => {
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
    const prev = rows[i - 1];
    rows.push({
      username: p.username,
      avatar: p.avatar,
      isBot: p.isBot,
      isMe: !!me && normalizeUsername(p.username) === me,
      rank: prev && prev.score === score ? prev.rank : i + 1,
      score,
      seriesTotal,
      seriesDelta,
      bestWord: pickBestWord(p.allWords),
    });
  });
  return rows;
}

/**
 * Podium colour/crown tier (1-3) or null. Points are required: a 0-point row
 * is never crowned or podium-coloured, so an all-zero room crowns no one.
 */
export function podiumTier({ rank, score }: Pick<MpStandingRow, 'rank' | 'score'>): 1 | 2 | 3 | null {
  return score > 0 && rank >= 1 && rank <= 3 ? (rank as 1 | 2 | 3) : null;
}
