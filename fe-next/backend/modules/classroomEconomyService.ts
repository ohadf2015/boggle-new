/**
 * Economy actions a socket can trigger. Each one reads the teacher's config,
 * applies a single pure transition under the store's lock, and returns the
 * snapshot the student sees. Nothing here trusts a client-sent amount.
 */

import {
  buyPowerUp,
  isPowerUpId,
  recordCorrectWord,
  recordWrongWord,
  streakMultiplier,
  useHint,
  type EconomyState,
} from './classroomEconomy';
import { getClassroomGame } from './classroomGameManager';
import { loadConfig, mutateEconomy, readAllEconomy, type EconomyConfig } from './classroomEconomyStore';
import type {
  ClassroomEconomyBoard,
  ClassroomEconomySnapshot,
} from '@/shared/constants/classroomEconomy';

type LastDelta = ClassroomEconomySnapshot['lastDelta'];

export function toSnapshot(
  state: EconomyState,
  config: EconomyConfig,
  last: LastDelta,
  now: number
): ClassroomEconomySnapshot {
  const msLeft = state.doubleCashUntil !== null ? Math.max(0, state.doubleCashUntil - now) : 0;
  return {
    cash: state.cash,
    cashEarned: state.cashEarned,
    streak: state.streak,
    multiplier: streakMultiplier(state.streak),
    doubleCashMsLeft: msLeft,
    shieldHeld: state.shieldHeld,
    hintsHeld: state.hintsHeld,
    config,
    lastDelta: last,
  };
}

export async function applyCorrectWord(input: {
  gameCode: string;
  roundId: string;
  userId: string;
  wordLength: number;
  fromLesson: boolean;
  now: number;
}): Promise<ClassroomEconomySnapshot | null> {
  const config = await loadConfig(input.gameCode);
  const out = await mutateEconomy(input.gameCode, input.userId, input.roundId, (s) => {
    const r = recordCorrectWord(s, input);
    return { state: r.state, result: r };
  });
  if (!out) return null;
  return toSnapshot(out.state, config, { kind: 'correct', delta: out.delta, multiplier: out.multiplier, cost: 0 }, input.now);
}

export async function applyWrongWord(input: {
  gameCode: string;
  roundId: string;
  userId: string;
  now: number;
}): Promise<ClassroomEconomySnapshot | null> {
  const config = await loadConfig(input.gameCode);
  const out = await mutateEconomy(input.gameCode, input.userId, input.roundId, (s) => {
    const r = recordWrongWord(s, { costEnabled: config.wrongAnswerCost });
    return { state: r.state, result: r };
  });
  if (!out) return null;
  return toSnapshot(out.state, config, { kind: 'wrong', delta: 0, multiplier: 1, cost: out.cost }, input.now);
}

export type ActionResult =
  | { ok: true; snapshot: ClassroomEconomySnapshot }
  | { ok: false; reason: string };

export async function buyPowerUpFor(input: {
  gameCode: string;
  roundId: string;
  userId: string;
  powerUpId: string;
  now: number;
}): Promise<ActionResult> {
  const config = await loadConfig(input.gameCode);
  if (!config.powerUps) return { ok: false, reason: 'power_ups_off' };
  if (!isPowerUpId(input.powerUpId)) return { ok: false, reason: 'unknown_power_up' };
  const id = input.powerUpId;
  const out = await mutateEconomy(input.gameCode, input.userId, input.roundId, (s) => {
    const r = buyPowerUp(s, id, input.now);
    return { state: r.state, result: r };
  });
  if (!out) return { ok: false, reason: 'unavailable' };
  if (!out.ok) return { ok: false, reason: out.reason };
  return { ok: true, snapshot: toSnapshot(out.state, config, null, input.now) };
}

export async function spendHintFor(input: {
  gameCode: string;
  roundId: string;
  userId: string;
  now: number;
}): Promise<ActionResult> {
  const config = await loadConfig(input.gameCode);
  const out = await mutateEconomy(input.gameCode, input.userId, input.roundId, (s) => {
    const r = useHint(s);
    return { state: r.state, result: r };
  });
  if (!out) return { ok: false, reason: 'unavailable' };
  if (!out.ok) return { ok: false, reason: 'no_hint' };
  return { ok: true, snapshot: toSnapshot(out.state, config, null, input.now) };
}

export async function buildBoard(gameCode: string, userId: string): Promise<ClassroomEconomyBoard> {
  const all = (await readAllEconomy(gameCode)) ?? {};
  const game = await getClassroomGame(gameCode);
  const names = new Map((game?.players ?? []).map((p) => [p.userId, p.username]));
  const ranked = Object.entries(all)
    .map(([uid, s]) => ({ userId: uid, username: names.get(uid) ?? '', cashEarned: s.cashEarned }))
    .sort((a, b) => b.cashEarned - a.cashEarned);
  const index = ranked.findIndex((r) => r.userId === userId);
  return {
    top: ranked.slice(0, 3),
    you: index === -1 ? null : { rank: index + 1, cashEarned: ranked[index].cashEarned },
  };
}
