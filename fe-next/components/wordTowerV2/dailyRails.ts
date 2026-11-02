import type { ShellStandingRow } from '@/components/game/shell';
import { floorsAt } from '@/lib/wordTowerV2/biomes';

/** One row of `/api/word-tower/daily/score`'s leaderboard (metres grown today). */
export interface DailyBoardRow {
  rank: number;
  username: string;
  bestHeightM: number;
  isYou?: boolean;
}

const TOP = 5;

/** Floors standing now, as the top bar shows them; the run's own count also holds drops that fell. */
export function standingFloors(heightM: number): number {
  return Math.floor(floorsAt(heightM) + 0.05);
}

/** Words of the floors actually built, oldest first: the hook's word is not a floor yet. */
export function placedWords(labels: ReadonlyMap<string, string>, hangingId: string | null): string[] {
  const words: string[] = [];
  for (const [id, word] of labels) if (id !== hangingId) words.push(word);
  return words;
}

/**
 * Today's race for the rail. ShellStandings numbers rows by sorted position,
 * so the player is listed only where that position is their real rank.
 */
export function dailyStandingRows(board: readonly DailyBoardRow[] | null, myGrowthM: number, youLabel: string): ShellStandingRow[] {
  if (!board) return [];
  const mine = board.find((r) => r.isYou);
  const others = board
    .filter((r) => !r.isYou)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, TOP)
    .map((r) => ({ id: `r${r.rank}-${r.username}`, name: r.username, score: Math.round(r.bestHeightM) }));
  const myScore = Math.round(Math.max(mine?.bestHeightM ?? 0, myGrowthM));
  if (others.length === 0 && myScore === 0) return [];
  const fifth = others[TOP - 1];
  if (fifth && myScore < fifth.score) return others;
  return [...others, { id: 'me', name: mine?.username || youLabel, score: myScore, isMe: true }];
}
