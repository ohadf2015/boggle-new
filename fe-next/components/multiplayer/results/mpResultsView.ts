import type { MpStandingRow } from './mpStandings';

/**
 * Pure view decisions for the results screens (kept out of JSX so they are
 * testable and shared by intermission + final).
 */

/** At most `max` rows; in a big room I stay on screen (top max-1 + me). */
export function pickVisibleRows(rows: MpStandingRow[], max: number): { rows: MpStandingRow[]; hiddenCount: number } {
  if (rows.length <= max) return { rows, hiddenCount: 0 };
  const meIndex = rows.findIndex((r) => r.isMe);
  if (meIndex >= 0 && meIndex >= max) {
    return { rows: [...rows.slice(0, max - 1), rows[meIndex]], hiddenCount: rows.length - max };
  }
  return { rows: rows.slice(0, max), hiddenCount: rows.length - max };
}

export type MascotMood = 'victory' | 'cheer' | 'think' | 'oops';

export const MASCOT_SRC: Record<MascotMood, string> = {
  victory: '/mascot/victory-nobg.webp',
  cheer: '/mascot/bridge-cheer-nobg.webp',
  think: '/mascot/bridge-think-nobg.webp',
  oops: '/mascot/bridge-oops-nobg.webp',
};

export function mascotFor(rank: number, total: number): MascotMood {
  if (rank <= 1 || total <= 1) return 'victory';
  if (total >= 3 && rank >= total) return 'oops';
  return rank <= Math.ceil(total / 2) ? 'cheer' : 'think';
}

interface WordLike {
  word: string;
  score?: number;
  validated?: boolean;
  isDuplicate?: boolean;
}

/** Highest-scoring counted word; longest breaks a tie. */
export function pickBestWord(words: WordLike[] | undefined | null): { word: string; score: number } | null {
  let best: { word: string; score: number } | null = null;
  for (const w of words ?? []) {
    if (!w || !w.validated || w.isDuplicate) continue;
    const score = w.score ?? 0;
    if (!best || score > best.score || (score === best.score && w.word.length > best.word.length)) {
      best = { word: w.word, score };
    }
  }
  return best;
}

export type RivalGap = { kind: 'behind' | 'ahead'; name: string; points: number };

/** Behind: points to the player above me. Winner: margin over 2nd. */
export function rivalGap(rows: MpStandingRow[]): RivalGap | null {
  const i = rows.findIndex((r) => r.isMe);
  if (i < 0 || rows.length < 2) return null;
  if (i === 0) {
    const second = rows[1];
    return { kind: 'ahead', name: second.username, points: rows[0].score - second.score };
  }
  const above = rows[i - 1];
  return { kind: 'behind', name: above.username, points: above.score - rows[i].score };
}

interface ReadyPlayer {
  username: string;
  isHost?: boolean;
  isBot?: boolean;
}

/** Ready count for the next round: the host starts (never "readies"); bots are always ready. */
export function readyTally(players: ReadyPlayer[], readyUsernames: string[]): { ready: number; total: number; readySet: Set<string> } {
  const said = new Set(readyUsernames);
  const readySet = new Set<string>();
  let total = 0;
  for (const p of players) {
    if (p.isHost) continue;
    total++;
    if (p.isBot || said.has(p.username)) readySet.add(p.username);
  }
  return { ready: readySet.size, total, readySet };
}

/**
 * NEXT UP for this viewer. Only the host's device knows the next mode: the
 * server learns it at `startGame`, so a joiner's store still holds its
 * 'random' default. A joiner gets null ("host is picking"), never a guess
 * that would read SURPRISE MODE while the host's own card reads CLASSIC.
 */
export function nextModeForViewer<M extends string>({ isHost, hostPick }: { isHost: boolean; hostPick: M }): M | null {
  return isHost ? hostPick : null;
}
