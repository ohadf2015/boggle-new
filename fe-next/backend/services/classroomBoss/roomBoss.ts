/**
 * Boss Battle v2 room glue: owns the per-round boss beside the game object and is the only file that
 * talks socket for it. Every call site in the board engine is a one-line call into here.
 */
import type { Server } from 'socket.io';
import type { GameState } from '../../modules/gameState/types.js';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../../utils/socketHelpers.js';
import { clearGameTimer } from '../../utils/timerManager';
import { isWordOnBoardAsync } from '../../modules/wordValidatorPool.js';
import { makePositionsMap } from '../../modules/wordValidator.js';
import logger from '../../utils/logger.js';
import {
  CLASSROOM_BOSS_EVENTS,
  isClassroomBossId,
  type BossTile,
  type ClassroomBossPlayerHit,
  type ClassroomBossView,
} from '@/shared/types/classroomBoss';
import { BOSS_RULES } from './rules';
import { applyWord, createBoss, endBossRound, frozenTiles, shiftBoss, tick, toView, type BossState } from './engine';

/** Long enough for the defeat cinematic on the projector before results take over. */
export const DEFEAT_END_DELAY_MS = 4500;

interface RoomBoss {
  state: BossState;
  armedAt: number;
  clockStarted: boolean;
  pausedAt: number | null;
  sessionId: unknown;
}

const BOSSES = new WeakMap<GameState, RoomBoss>();

export interface ArmInput {
  bossId: unknown;
  students: number;
  roundSeconds: number;
  now?: number;
}

function send(io: Server, gameCode: string, view: ClassroomBossView | null, volatile = false): void {
  (volatile ? volatileBroadcastToRoom : broadcastToRoom)(io, getGameRoom(gameCode), CLASSROOM_BOSS_EVENTS.state, view);
}

/** THE per-round reset: every classroom round start arms a fresh boss or clears the last one. */
export function armRoomBoss(io: Server, gameCode: string, game: GameState, input: ArmInput): void {
  if (!game.isClassroom) return;
  BOSSES.delete(game);
  if (!isClassroomBossId(input.bossId)) {
    send(io, gameCode, null);
    return;
  }
  const now = input.now ?? Date.now();
  const grid = game.letterGrid ?? [];
  const round = game.modeHistory?.length ?? 1;
  const state = createBoss({
    seed: `${gameCode}:${round}`,
    bossId: input.bossId,
    students: input.students,
    roundSeconds: input.roundSeconds,
    rows: grid.length,
    cols: grid[0]?.length ?? 0,
    now,
  });
  BOSSES.set(game, { state, armedAt: now, clockStarted: false, pausedAt: null, sessionId: game.gameSessionId });
  logger.info('CLASSROOM_BOSS', `${gameCode}: armed ${input.bossId} (${state.maxHp} HP, ${input.students} students)`);
  send(io, gameCode, toView(state, now));
}

export function hasRoomBoss(game: GameState): boolean {
  return BOSSES.has(game);
}

/** The round clock starts after the 3-2-1; the intro and first attack count from here, not from the deal. */
export function startRoomBossClock(game: GameState, now = Date.now()): void {
  const boss = BOSSES.get(game);
  if (!boss || boss.clockStarted) return;
  boss.state = shiftBoss(boss.state, now - boss.armedAt);
  boss.clockStarted = true;
}

export function pauseRoomBoss(game: GameState, now = Date.now()): void {
  const boss = BOSSES.get(game);
  if (boss && boss.pausedAt === null) boss.pausedAt = now;
}

export function resumeRoomBoss(game: GameState, now = Date.now()): void {
  const boss = BOSSES.get(game);
  if (!boss || boss.pausedAt === null) return;
  boss.state = shiftBoss(boss.state, now - boss.pausedAt);
  boss.pausedAt = null;
}

/** Driven by the game timer once a second. Re-sending the state each tick also catches up reconnects. */
export function tickRoomBoss(io: Server, gameCode: string, game: GameState, now = Date.now()): void {
  const boss = BOSSES.get(game);
  if (!boss || !boss.clockStarted || boss.pausedAt !== null) return;
  const wasFreeze = boss.state.effect?.kind === 'freeze';
  const r = tick(boss.state, now);
  boss.state = r.state;
  const room = getGameRoom(gameCode);
  if (r.attack) broadcastToRoom(io, room, CLASSROOM_BOSS_EVENTS.attack, r.attack);
  // Frozen tiles ride the existing blizzard round-event channel: every board already greys and locks those cells.
  if (r.attack?.kind === 'freeze' && !r.attack.blocked) {
    broadcastToRoom(io, room, 'roundEventStart', {
      eventType: 'blizzard',
      gameSessionId: game.gameSessionId,
      duration: BOSS_RULES.freezeMs / 1000,
      data: { blizzard: { frozenTiles: r.attack.tiles } },
    });
  } else if (wasFreeze && r.events.includes('effect-end')) {
    broadcastToRoom(io, room, 'roundEventEnd', { eventType: 'blizzard', gameSessionId: game.gameSessionId });
  }
  send(io, gameCode, toView(r.state, now), r.events.length === 0);
}

export interface BossHitInput {
  username: string;
  word: string;
  score: number;
  now?: number;
}

/** Every accepted word path calls this; returns the private hit for the finder (or null outside a boss round). */
export function hitRoomBoss(io: Server, gameCode: string, game: GameState, input: BossHitInput): ClassroomBossPlayerHit | null {
  const boss = BOSSES.get(game);
  if (!boss) return null;
  const now = input.now ?? Date.now();
  const r = applyWord(boss.state, { username: input.username, word: input.word, score: input.score, now });
  boss.state = r.state;
  if (!r.hit) return null;
  send(io, gameCode, toView(r.state, now));
  if (r.events.includes('defeated')) scheduleDefeatEnd(io, gameCode, game, boss.sessionId);
  return { dmg: r.hit.dmg, crit: r.hit.crit, multiplier: r.hit.multiplier, totalDmg: r.state.damageBy[input.username] ?? 0 };
}

function scheduleDefeatEnd(io: Server, gameCode: string, game: GameState, sessionId: unknown): void {
  clearGameTimer(gameCode);
  logger.info('CLASSROOM_BOSS', `${gameCode}: boss defeated, ending round in ${DEFEAT_END_DELAY_MS}ms`);
  const t = setTimeout(() => {
    if (game.gameSessionId !== sessionId || game.gameState !== 'in-progress') return;
    void import('../gameLifecycle/gameEnd.js')
      .then(({ endGame }) => endGame(io, gameCode))
      .catch((err: Error) => logger.error('CLASSROOM_BOSS', `${gameCode}: endGame after defeat failed: ${err.message}`));
  }, DEFEAT_END_DELAY_MS);
  t.unref?.();
}

export function endRoomBoss(io: Server, gameCode: string, game: GameState, now = Date.now()): void {
  const boss = BOSSES.get(game);
  if (!boss) return;
  boss.state = endBossRound(boss.state);
  recordRoomBossOutcome(gameCode, String(game.gameSessionId ?? gameCode), boss.state.status === 'defeated' ? 'defeated' : 'escaped');
  send(io, gameCode, toView(boss.state, now));
}

// Keyed by room + round, not the game object: the chest request may read a rehydrated copy of the game.
const OUTCOMES = new Map<string, 'defeated' | 'escaped'>();
const OUTCOME_CAP = 2000;

export function recordRoomBossOutcome(gameCode: string, roundId: string, outcome: 'defeated' | 'escaped'): void {
  const key = `${gameCode}:${roundId}`;
  OUTCOMES.delete(key);
  OUTCOMES.set(key, outcome);
  if (OUTCOMES.size > OUTCOME_CAP) OUTCOMES.delete(OUTCOMES.keys().next().value as string);
}

export function roomBossWon(gameCode: string, roundId: string): boolean {
  return OUTCOMES.get(`${gameCode}:${roundId}`) === 'defeated';
}

export function roomBossFrozenTiles(game: GameState, now = Date.now()): BossTile[] {
  const boss = BOSSES.get(game);
  return boss ? frozenTiles(boss.state, now) : [];
}

/** A word is blocked only when EVERY path to it crosses a frozen tile. */
export async function wordBlockedByFreeze(game: GameState, word: string, now = Date.now()): Promise<boolean> {
  const tiles = roomBossFrozenTiles(game, now);
  if (tiles.length === 0 || !game.letterGrid) return false;
  const masked = game.letterGrid.map((row) => [...row]);
  for (const { row, col } of tiles) if (masked[row]?.[col] !== undefined) masked[row][col] = '#';
  return !(await isWordOnBoardAsync(word, masked, makePositionsMap(masked, game.language || 'en')));
}

export function roomBossView(game: GameState, now = Date.now()): ClassroomBossView | null {
  const boss = BOSSES.get(game);
  return boss ? toView(boss.state, now) : null;
}
