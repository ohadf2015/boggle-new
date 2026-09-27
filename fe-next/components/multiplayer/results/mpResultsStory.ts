import type { Avatar } from '@/shared/types/game';
import type { WordLike } from './mpResultsView';
import type { MpStandingRow, SeriesStandingLike } from './mpStandings';

/**
 * The results "album": what the round and the series were made of, told from
 * the server's words and scores (the numbers the board already shows). Pure.
 */

interface PlayerWords {
  username: string;
  avatar?: Avatar;
  allWords?: WordLike[] | null;
}

export interface RoundAward {
  username: string;
  avatar?: Avatar;
  /** The word the award is for (top / longest); absent for "most words". */
  word?: string;
  /** Points (top), letters (longest) or word count (most). */
  value: number;
}

export interface RoundAwards {
  best: RoundAward | null;
  longest: RoundAward | null;
  most: RoundAward | null;
}

const counted = (words: WordLike[] | null | undefined) => (words ?? []).filter((w) => w && w.validated && !w.isDuplicate);

/**
 * Top word, longest word and most words of the round. Only counted words
 * (validated, not duplicate). Ties go to the higher-ranked player (the server
 * order); a longest-word tie goes to the higher-scoring word first. When the
 * longest word is the top word, there is no separate longest stamp.
 */
export function roundAwards(players: PlayerWords[]): RoundAwards {
  let best: RoundAward | null = null;
  let longest: (RoundAward & { score: number }) | null = null;
  let most: RoundAward | null = null;
  for (const p of players) {
    const words = counted(p.allWords);
    if (words.length === 0) continue;
    if (!most || words.length > most.value) most = { username: p.username, avatar: p.avatar, value: words.length };
    for (const w of words) {
      const score = w.score ?? 0;
      if (!best || score > best.value) best = { username: p.username, avatar: p.avatar, word: w.word, value: score };
      const len = [...w.word].length;
      if (!longest || len > longest.value || (len === longest.value && score > longest.score)) {
        longest = { username: p.username, avatar: p.avatar, word: w.word, value: len, score };
      }
    }
  }
  // Never the same stamp twice: the top word already covers its own length.
  const repeat = !!longest && !!best && longest.username === best.username && longest.word === best.word;
  const longestOut = longest && !repeat ? { username: longest.username, avatar: longest.avatar, word: longest.word, value: longest.value } : null;
  return { best, longest: longestOut, most };
}

export interface SeriesGridRow {
  username: string;
  avatar?: Avatar;
  isBot?: boolean;
  isMe: boolean;
  /** Points per round, round 1 first; the last cell is the server's live round score. */
  cells: number[];
  /** The series total the board shows for this row. */
  total: number;
}

export interface SeriesGrid {
  rounds: number;
  rows: SeriesGridRow[];
  /** Each round's top score (null when nobody scored that round). */
  top: (number | null)[];
}

/**
 * The series, round by round, in the final ladder's order. Earlier rounds come
 * from the tracker; the round just played is the server's live score (the same
 * rebuild `buildMpStandings` does for the total), so each row sums to the total
 * on the board. Null before round 2 or without a ladder.
 */
export function seriesGrid({ ladder, standings, rounds }: {
  ladder: MpStandingRow[] | null;
  standings: SeriesStandingLike[] | undefined;
  rounds: number;
}): SeriesGrid | null {
  if (!ladder || ladder.length === 0 || rounds < 2) return null;
  const byName = new Map((standings ?? []).map((s) => [s.username, s]));
  const rows = ladder.map((r) => {
    const earlier = (byName.get(r.username)?.roundScores ?? []).slice(0, rounds - 1);
    while (earlier.length < rounds - 1) earlier.push(0);
    return {
      username: r.username,
      avatar: r.avatar,
      isBot: r.isBot,
      isMe: r.isMe,
      cells: [...earlier, r.roundScore ?? 0],
      total: r.score,
    };
  });
  const top = Array.from({ length: rounds }, (_, i) => {
    const max = Math.max(...rows.map((r) => r.cells[i]));
    return max > 0 ? max : null;
  });
  return { rounds, rows, top };
}
