/**
 * applyRevive — pure state reducer for rewarded-ad "continue" flow.
 * Accepts prior gameState, returns new state with isDeadEnd cleared
 * and bonus moves appended. Preserves score/combo/wordsFound so the
 * player picks up exactly where they failed.
 */
import { describe, it, expect } from 'vitest';
import { applyRevive } from '../blastMoveUtils';
import type { BlastGameState } from '../../types';

const baseState = (): BlastGameState => ({
  score: 1200,
  wordsFound: ['HELLO', 'WORLD'],
  tilesCleared: 14,
  totalTiles: 30,
  comboCount: 3,
  isComplete: false,
  isDeadEnd: true,
  cascadeChainLevel: 0,
  movesRemaining: 0,
  movesUsed: 15,
  totalMoves: 15,
  bonusMoveScore: 0,
  tileTypeClears: {} as BlastGameState['tileTypeClears'],
  diamondRevealTurns: 0,
});

describe('applyRevive', () => {
  it('clears isDeadEnd flag', () => {
    const next = applyRevive(baseState(), 5);
    expect(next.isDeadEnd).toBe(false);
  });

  it('adds bonus moves to movesRemaining', () => {
    const next = applyRevive(baseState(), 5);
    expect(next.movesRemaining).toBe(5);
  });

  it('increases totalMoves by the same bonus', () => {
    const next = applyRevive(baseState(), 5);
    expect(next.totalMoves).toBe(20);
  });

  it('preserves score, wordsFound, tilesCleared, combo', () => {
    const prev = baseState();
    const next = applyRevive(prev, 5);
    expect(next.score).toBe(1200);
    expect(next.wordsFound).toEqual(['HELLO', 'WORLD']);
    expect(next.tilesCleared).toBe(14);
    expect(next.comboCount).toBe(3);
  });

  it('is a no-op for infinite-move modes (MP)', () => {
    const prev = { ...baseState(), totalMoves: Infinity, movesRemaining: Infinity };
    const next = applyRevive(prev, 5);
    expect(next).toBe(prev);
  });

  it('does not mutate the input state', () => {
    const prev = baseState();
    const snapshot = JSON.stringify(prev);
    applyRevive(prev, 5);
    expect(JSON.stringify(prev)).toBe(snapshot);
  });

  it('clamps negative bonus to zero (defensive)', () => {
    const next = applyRevive(baseState(), -3);
    expect(next.movesRemaining).toBe(0);
    expect(next.totalMoves).toBe(15);
  });
});
