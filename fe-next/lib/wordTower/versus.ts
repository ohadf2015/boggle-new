/**
 * Word Tower — Versus / bomb logic (Phase 3/4 groundwork).
 *
 * Pure, server-authoritative, fully unit-testable. No socket, no React, no DB.
 * The future versus socket handler will call these; nothing here renders.
 *
 * Design: docs/2026-05-21-word-tower-game-mode-spec.md §5.
 */
import type { WordTowerPlayerState } from './wordTowerManager';
import {
  WORD_TOWER_BOMB_LEAD_GATE_M,
  WORD_TOWER_BOMB_DAMAGE_MAX_FLOORS,
  WORD_TOWER_BOMB_CHARGE_PER_BAR,
  WORD_TOWER_BOMB_MAX_BANKED,
  WORD_TOWER_BOMB_RECV_CAP_FLOORS_PER_MIN,
  WORD_TOWER_REBUILD_SHIELD_S,
  WORD_TOWER_SCRAMBLES_MAX_BANKED,
} from '@/shared/constants/wordTowerConstants';

const MINUTE_MS = 60_000;

/** Floors removed scales with how far ahead the sender is. */
export function bombDamage(leadMeters: number): number {
  const n = Math.floor(Math.max(0, leadMeters) / WORD_TOWER_BOMB_LEAD_GATE_M);
  return Math.max(1, Math.min(WORD_TOWER_BOMB_DAMAGE_MAX_FLOORS, n));
}

/** Charge ticks → banked bombs (whole bars), capped. */
export function bankedBombs(chargeTicks: number): number {
  return Math.min(WORD_TOWER_BOMB_MAX_BANKED, Math.floor(Math.max(0, chargeTicks) / WORD_TOWER_BOMB_CHARGE_PER_BAR));
}

export type BombDenyReason = 'no_lead' | 'no_charge' | 'cooldown' | 'no_scramble';
export interface BombSendCheck {
  allowed: boolean;
  reason?: BombDenyReason;
  damage: number;
}

export interface BombSendOpts {
  senderHeightM: number;
  targetHeightM: number;
  bankedBombs: number;
  cooldownRemainingMs: number;
  senderScrambles: number;
}

/** All gates must pass; reasons are checked in a stable priority order. */
export function checkBombSend(o: BombSendOpts): BombSendCheck {
  const lead = o.senderHeightM - o.targetHeightM;
  const damage = bombDamage(lead);
  if (lead < WORD_TOWER_BOMB_LEAD_GATE_M) return { allowed: false, reason: 'no_lead', damage };
  if (o.bankedBombs < 1) return { allowed: false, reason: 'no_charge', damage };
  if (o.cooldownRemainingMs > 0) return { allowed: false, reason: 'cooldown', damage };
  if (o.senderScrambles < 1) return { allowed: false, reason: 'no_scramble', damage };
  return { allowed: true, damage };
}

/** Per-receiver versus state the sender's bomb mutates. */
export interface ReceiverVersusState {
  /** ms timestamp until which the receiver is immune (rebuild shield). */
  shieldUntilMs: number;
  /** Rolling log of floors lost to bombs, for the per-minute cap. */
  damageLog: { ts: number; floors: number }[];
}

export interface BombApplyResult {
  game: WordTowerPlayerState;
  versus: ReceiverVersusState;
  removed: number;
}

/**
 * Apply an incoming bomb to a receiver. Honors the rebuild shield and the
 * per-minute damage cap. On real removal: drops the top floors, subtracts their
 * meters, breaks the combo, re-anchors the chain to the new top floor, grants a
 * comeback scramble, and arms the rebuild shield.
 */
export function applyBomb(
  game: WordTowerPlayerState,
  versus: ReceiverVersusState,
  requestedFloors: number,
  nowMs: number,
): BombApplyResult {
  if (nowMs < versus.shieldUntilMs) return { game, versus, removed: 0 };

  const windowStart = nowMs - MINUTE_MS;
  const recentLog = versus.damageLog.filter((d) => d.ts >= windowStart);
  const recent = recentLog.reduce((s, d) => s + d.floors, 0);
  const capRemaining = Math.max(0, WORD_TOWER_BOMB_RECV_CAP_FLOORS_PER_MIN - recent);

  const removed = Math.max(0, Math.min(requestedFloors, game.floors.length, capRemaining));
  if (removed <= 0) return { game, versus: { ...versus, damageLog: recentLog }, removed: 0 };

  const removedFloors = game.floors.slice(game.floors.length - removed);
  const lostMeters = removedFloors.reduce((s, f) => s + f.meters, 0);
  const newFloors = game.floors.slice(0, game.floors.length - removed);
  const topWord = newFloors.length > 0 ? newFloors[newFloors.length - 1].word : '';
  const anchorLetter = topWord ? topWord.charAt(topWord.length - 1) : game.anchorLetter;

  const newGame: WordTowerPlayerState = {
    ...game,
    floors: newFloors,
    heightM: Math.max(0, game.heightM - lostMeters),
    combo: 0,
    anchorLetter,
    scramblesLeft: Math.min(WORD_TOWER_SCRAMBLES_MAX_BANKED, game.scramblesLeft + 1),
  };

  const newVersus: ReceiverVersusState = {
    shieldUntilMs: nowMs + WORD_TOWER_REBUILD_SHIELD_S * 1000,
    damageLog: [...recentLog, { ts: nowMs, floors: removed }],
  };

  return { game: newGame, versus: newVersus, removed };
}

/** True when this height is below the field's median (anti-snowball trigger). */
export function belowMedian(heightM: number, allHeights: number[]): boolean {
  if (allHeights.length === 0) return false;
  const sorted = [...allHeights].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return heightM < median;
}

/** Trailing players regenerate scrambles twice as fast. */
export function scrambleRegenMultiplier(isBelowMedian: boolean): number {
  return isBelowMedian ? 2 : 1;
}
