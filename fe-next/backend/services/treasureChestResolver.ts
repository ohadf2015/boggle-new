/**
 * Treasure Chest Resolver
 *
 * Pure, deterministic outcomes for Gold-Quest-style chests in the live vocab
 * quiz. Seed: `${gameCode}:${questionIndex}:${username}:${chest}` — the chest
 * the student taps is part of the seed, so the three chests really do differ.
 *
 * Runs AFTER the answer was scored: `player.score` already contains this
 * question's points, and every outcome is a delta on top of it. (An earlier
 * version rebuilt the score from "score before the answer", which silently
 * erased the answer's points on every chest except double.)
 *
 * Outcomes (scale matches 100–250 points per correct answer):
 * - gain:       +20..+60
 * - double:     + the answer's points again
 * - steal:      ~15% of the leader's score (min 10), moved to the actor
 * - swap:       trade totals with the leader — only when that is an upgrade
 * - small-loss: -10..-25, floored at 0
 *
 * Kindness rules: steal and swap never punish the actor. With nobody worth
 * stealing from, or when the actor already leads, they become a gain.
 */

import type { QuizPlayer, VocabQuizSession } from './vocabQuizEngine';
import {
  VOCAB_QUIZ_CHEST_REVEAL_BEAT_MS,
  type TreasureChestOutcome,
  type TreasureChestState,
  type VocabQuizStanding,
} from '@/shared/types/vocabQuiz';
import { sortStandings } from '@/lib/education/vocabQuizScoring';

/** Deterministic 0..1 from a string (FNV-1a — spreads short, similar seeds well). */
function seededRandom(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

/** Weighted draw: gain 40%, double 20%, steal 15%, swap 10%, small-loss 15%. */
export function resolveChestOutcome(seed: string): TreasureChestOutcome {
  const rand = seededRandom(seed);
  if (rand < 0.4) return 'gain';
  if (rand < 0.6) return 'double';
  if (rand < 0.75) return 'steal';
  if (rand < 0.85) return 'swap';
  return 'small-loss';
}

export interface ApplyChestInput {
  outcome: TreasureChestOutcome;
  username: string;
  players: Map<string, QuizPlayer>;
  /** Points the correct answer earned (for double). */
  answerPoints: number;
  /** 0..1 — sizes gain / steal / loss amounts. */
  amountRand: number;
}

const gainAmount = (rand: number) => 20 + Math.floor(rand * 41);

/** Highest-scoring player other than the actor, or null. */
function leaderExcept(players: Map<string, QuizPlayer>, username: string): QuizPlayer | null {
  let best: QuizPlayer | null = null;
  for (const p of players.values()) {
    if (p.username === username) continue;
    if (!best || p.score > best.score) best = p;
  }
  return best;
}

function standingsOf(players: Map<string, QuizPlayer>): VocabQuizStanding[] {
  return sortStandings(
    [...players.values()].map((p) => ({
      username: p.username,
      score: p.score,
      streak: p.streak,
      bestStreak: p.bestStreak,
      correctCount: p.correctCount,
    }))
  );
}

/**
 * Apply one outcome to the room's scores, in place. Returns the result the
 * actor sees (with `myScore`) — callers strip `myScore` before broadcasting.
 */
export function applyChestOutcome(input: ApplyChestInput): TreasureChestState {
  const { username, players, answerPoints, amountRand } = input;
  const actor = players.get(username);
  if (!actor) {
    return { actor: username, outcome: 'gain', amount: 0, standings: standingsOf(players) };
  }

  let outcome = input.outcome;
  let amount = 0;
  let targetUsername: string | undefined;

  if (outcome === 'steal') {
    const leader = leaderExcept(players, username);
    if (leader && leader.score > 0) {
      amount = Math.min(leader.score, Math.max(10, Math.round(leader.score * (0.1 + amountRand * 0.1))));
      leader.score -= amount;
      actor.score += amount;
      targetUsername = leader.username;
    } else {
      outcome = 'gain';
    }
  } else if (outcome === 'swap') {
    const leader = leaderExcept(players, username);
    if (leader && leader.score > actor.score) {
      amount = leader.score - actor.score;
      [leader.score, actor.score] = [actor.score, leader.score];
      targetUsername = leader.username;
    } else {
      outcome = 'gain';
    }
  }

  if (outcome === 'gain') {
    amount = gainAmount(amountRand);
    actor.score += amount;
  } else if (outcome === 'double') {
    amount = Math.max(0, answerPoints);
    actor.score += amount;
  } else if (outcome === 'small-loss') {
    const loss = 10 + Math.floor(amountRand * 15.99);
    const next = Math.max(0, actor.score - loss);
    amount = next - actor.score;
    actor.score = next;
  }

  return {
    actor: username,
    outcome,
    amount,
    targetUsername,
    standings: standingsOf(players),
    myScore: actor.score,
  };
}

export interface ResolveChestInput {
  gameCode: string;
  questionIndex: number;
  /** Which chest the student tapped (0..2). */
  chest: number;
  username: string;
  players: Map<string, QuizPlayer>;
  answerPoints: number;
}

/** Draw the outcome from the seed and apply it. Mutates `players` scores. */
export function resolveChestResult(input: ResolveChestInput): TreasureChestState {
  const { gameCode, questionIndex, chest, username, players, answerPoints } = input;
  const seed = `${gameCode}:${questionIndex}:${username}:${chest}`;
  return applyChestOutcome({
    outcome: resolveChestOutcome(seed),
    username,
    players,
    answerPoints,
    amountRand: seededRandom(`${seed}:amount`),
  });
}

/**
 * Per-question chest bookkeeping the session object does not carry (the engine
 * file is at its size limit): when each chest opened, and which students told
 * us their reveal has been seen. Keys are `${index}:${username}`, like
 * `session.chestResults`, so a new question never inherits an old entry.
 */
interface ChestPacing {
  openedAt: Map<string, number>;
  seen: Set<string>;
}
const pacingBySession = new WeakMap<VocabQuizSession, ChestPacing>();

function pacingOf(session: VocabQuizSession): ChestPacing {
  let pacing = pacingBySession.get(session);
  if (!pacing) {
    pacing = { openedAt: new Map(), seen: new Set() };
    pacingBySession.set(session, pacing);
  }
  return pacing;
}

/** A chest just opened: its owner gets a short beat to see the outcome. */
export function markChestOpened(session: VocabQuizSession, username: string, now: number): void {
  pacingOf(session).openedAt.set(`${session.index}:${username}`, now);
}

/** The student's phone dismissed the reveal — nothing left to wait for. */
export function markChestSeen(session: VocabQuizSession, index: number, username: string): void {
  if (index !== session.index) return;
  pacingOf(session).seen.add(`${index}:${username}`);
}

/**
 * True while the reveal should keep waiting, capped by `chestHoldEndsAt`.
 *
 * Only ELIGIBLE students count: answered the current question correctly and
 * still in the room (`isPresent`). For each of them the room waits until they
 * have opened their chest AND seen it — the phone's ack, or one
 * VOCAB_QUIZ_CHEST_REVEAL_BEAT_MS after the pick if the ack never arrives. So
 * the hold ends the moment the last eligible student has looked, instead of a
 * fixed beat after every pick, and a student who answered right and then lost
 * signal no longer holds the class to the cap.
 */
export function chestsStillOpening(
  session: VocabQuizSession,
  now: number,
  isPresent: (username: string) => boolean = () => true
): boolean {
  if (!session.treasureChestsEnabled || session.phase !== 'reveal') return false;
  if (now >= session.chestHoldEndsAt) return false;
  const pacing = pacingOf(session);
  for (const [username, answer] of session.answers) {
    if (!answer.correct || !isPresent(username)) continue;
    const key = `${session.index}:${username}`;
    if (!session.chestResults.has(key)) return true;
    if (pacing.seen.has(key)) continue;
    const openedAt = pacing.openedAt.get(key);
    if (openedAt !== undefined && now < openedAt + VOCAB_QUIZ_CHEST_REVEAL_BEAT_MS) return true;
  }
  return false;
}
