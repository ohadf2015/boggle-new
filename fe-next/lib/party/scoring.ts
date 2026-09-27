import { calculateWordScore } from '@/shared/utils/scoring';
import type { FoundWord, PartyPlayer, PlayerRoundResult, RankedPlayer } from './types';

function normalize(word: string): string {
  return word.trim().toLocaleLowerCase();
}

export interface ScoreTurnInput {
  words: string[];
  claimedByEarlier: ReadonlySet<string>;
  alreadyFoundThisTurn: ReadonlySet<string>;
}

export interface ScoreTurnResult {
  accepted: FoundWord[];
  rejectedDuplicates: string[];
  roundScore: number;
}

/**
 * Sequential unique-word scoring: a word scores only if no earlier player
 * in this round already found it. Intra-turn duplicates are rejected.
 */
export function scoreTurn({
  words,
  claimedByEarlier,
  alreadyFoundThisTurn,
}: ScoreTurnInput): ScoreTurnResult {
  const seen = new Set(
    [...alreadyFoundThisTurn].map((w) => normalize(w)).filter(Boolean),
  );
  const claimed = new Set(
    [...claimedByEarlier].map((w) => normalize(w)).filter(Boolean),
  );
  const accepted: FoundWord[] = [];
  const rejectedDuplicates: string[] = [];

  for (const raw of words) {
    const word = normalize(raw);
    if (!word) continue;
    if (seen.has(word)) {
      rejectedDuplicates.push(word);
      continue;
    }
    seen.add(word);
    const unique = !claimed.has(word);
    const score = unique ? calculateWordScore(word) : 0;
    accepted.push({ word, score, unique });
  }

  const roundScore = accepted.filter((w) => w.unique).reduce((sum, w) => sum + w.score, 0);
  return { accepted, rejectedDuplicates, roundScore };
}

export function totalsAfterRound(
  prev: Record<string, number>,
  round: PlayerRoundResult[],
): Record<string, number> {
  const next = { ...prev };
  for (const row of round) {
    next[row.playerId] = (next[row.playerId] ?? 0) + row.roundScore;
  }
  return next;
}

/** Olympic ranking: ties share a place, the next place skips. */
export function rankPlayers(
  players: readonly PartyPlayer[],
  totals: Record<string, number>,
): RankedPlayer[] {
  const scored = players.map((player, index) => ({
    player,
    score: totals[player.id] ?? 0,
    index,
  }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const ranked: RankedPlayer[] = [];
  let place = 1;
  for (let i = 0; i < scored.length; i += 1) {
    const current = scored[i]!;
    if (i > 0 && current.score < scored[i - 1]!.score) {
      place = i + 1;
    }
    ranked.push({ player: current.player, score: current.score, place });
  }
  return ranked;
}
