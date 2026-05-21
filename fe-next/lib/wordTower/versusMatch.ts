/**
 * Word Tower — Versus match state (Phase 3). Pure, server-authoritative,
 * unit-testable. The socket handler holds one of these per match and calls
 * these functions; nothing here touches sockets, DB, or React.
 *
 * Each player has their own tower (WordTowerPlayerState). Words are validated
 * server-side. Bombs use the verified primitives in versus.ts.
 *
 * Design: docs/2026-05-21-word-tower-game-mode-spec.md §2.2, §5.
 */
import type { Language } from '@/shared/types/game';
import {
  initWordTowerState,
  validateTowerWord,
  applyTowerWord,
  scrambleTray,
  biomeForHeight,
  type WordTowerPlayerState,
  type ApplyResult,
  type ValidationError,
} from './wordTowerManager';
import {
  checkBombSend,
  applyBomb,
  bankedBombs,
  belowMedian,
  type ReceiverVersusState,
  type BombDenyReason,
} from './versus';
import {
  WORD_TOWER_BOMB_CHARGE_PER_BAR,
  WORD_TOWER_BOMB_COOLDOWN_S,
  WORD_TOWER_VERSUS_MATCH_S,
} from '@/shared/constants/wordTowerConstants';

export interface VersusPlayer {
  playerId: string;
  username: string;
  game: WordTowerPlayerState;
  versus: ReceiverVersusState;
  bombCooldownUntilMs: number;
}

export interface VersusMatchState {
  gameCode: string;
  language: Language;
  players: Record<string, VersusPlayer>;
  order: string[];
  startedAtMs: number;
  endsAtMs: number;
}

export interface VersusStanding {
  rank: number;
  playerId: string;
  username: string;
  heightM: number;
  floors: number;
  biome: string;
  banked: number;
  belowMedian: boolean;
}

export function initVersusMatch(
  gameCode: string,
  language: Language,
  players: { id: string; username: string }[],
  nowMs: number,
): VersusMatchState {
  const rec: Record<string, VersusPlayer> = {};
  for (const p of players) {
    rec[p.id] = {
      playerId: p.id,
      username: p.username,
      game: initWordTowerState({ gameCode, playerId: p.id, language }),
      versus: { shieldUntilMs: 0, damageLog: [] },
      bombCooldownUntilMs: 0,
    };
  }
  return {
    gameCode,
    language,
    players: rec,
    order: players.map((p) => p.id),
    startedAtMs: nowMs,
    endsAtMs: nowMs + WORD_TOWER_VERSUS_MATCH_S * 1000,
  };
}

function replacePlayer(state: VersusMatchState, p: VersusPlayer): VersusMatchState {
  return { ...state, players: { ...state.players, [p.playerId]: p } };
}

export interface WordSubmitOutcome {
  state: VersusMatchState;
  accepted: boolean;
  error?: ValidationError | 'no_player';
  result?: ApplyResult;
}

export function submitVersusWord(
  state: VersusMatchState,
  playerId: string,
  word: string,
  isInDictionary: (canonWord: string) => boolean,
): WordSubmitOutcome {
  const p = state.players[playerId];
  if (!p) return { state, accepted: false, error: 'no_player' };

  const v = validateTowerWord(p.game, word, isInDictionary);
  if (!v.accepted) return { state, accepted: false, error: v.error };

  const { state: nextGame, result } = applyTowerWord(p.game, word);
  return { state: replacePlayer(state, { ...p, game: nextGame }), accepted: true, result };
}

export function scrambleVersus(state: VersusMatchState, playerId: string): VersusMatchState {
  const p = state.players[playerId];
  if (!p) return state;
  return replacePlayer(state, { ...p, game: scrambleTray(p.game) });
}

export interface BombOutcome {
  state: VersusMatchState;
  sent: boolean;
  error?: BombDenyReason | 'no_player' | 'self_target';
  removed?: number;
  damage?: number;
  targetId?: string;
}

export function sendVersusBomb(
  state: VersusMatchState,
  fromId: string,
  targetId: string,
  nowMs: number,
): BombOutcome {
  const from = state.players[fromId];
  const target = state.players[targetId];
  if (!from || !target) return { state, sent: false, error: 'no_player' };
  if (fromId === targetId) return { state, sent: false, error: 'self_target' };

  const check = checkBombSend({
    senderHeightM: from.game.heightM,
    targetHeightM: target.game.heightM,
    bankedBombs: bankedBombs(from.game.bombCharge),
    cooldownRemainingMs: Math.max(0, from.bombCooldownUntilMs - nowMs),
    senderScrambles: from.game.scramblesLeft,
  });
  if (!check.allowed) return { state, sent: false, error: check.reason };

  // Cost: one banked bomb (one charge bar) + one scramble + cooldown.
  const newFrom: VersusPlayer = {
    ...from,
    game: {
      ...from.game,
      bombCharge: Math.max(0, from.game.bombCharge - WORD_TOWER_BOMB_CHARGE_PER_BAR),
      scramblesLeft: from.game.scramblesLeft - 1,
    },
    bombCooldownUntilMs: nowMs + WORD_TOWER_BOMB_COOLDOWN_S * 1000,
  };

  const applied = applyBomb(target.game, target.versus, check.damage, nowMs);
  const newTarget: VersusPlayer = { ...target, game: applied.game, versus: applied.versus };

  let next = replacePlayer(state, newFrom);
  next = replacePlayer(next, newTarget);
  return { state: next, sent: true, removed: applied.removed, damage: check.damage, targetId };
}

export function versusStandings(state: VersusMatchState): VersusStanding[] {
  const heights = state.order.map((id) => state.players[id].game.heightM);
  return state.order
    .map((id) => {
      const p = state.players[id];
      return {
        playerId: id,
        username: p.username,
        heightM: p.game.heightM,
        floors: p.game.floors.length,
        biome: biomeForHeight(p.game.heightM),
        banked: bankedBombs(p.game.bombCharge),
        belowMedian: belowMedian(p.game.heightM, heights),
      };
    })
    .sort((a, b) => b.heightM - a.heightM)
    .map((s, i) => ({ rank: i + 1, ...s }));
}

export function isMatchOver(state: VersusMatchState, nowMs: number): boolean {
  return nowMs >= state.endsAtMs;
}

export interface MatchResult {
  winnerId: string | null;
  standings: VersusStanding[];
}

export function matchResult(state: VersusMatchState): MatchResult {
  const standings = versusStandings(state);
  return { winnerId: standings[0]?.playerId ?? null, standings };
}
