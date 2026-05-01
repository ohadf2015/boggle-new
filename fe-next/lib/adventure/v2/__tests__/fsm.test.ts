import { describe, it, expect } from 'vitest';
import { transition } from '../fsm';
import type { FsmState } from '../types';

describe('FSM transition', () => {
  it('idle → player_compose on START_TURN', () => {
    const next = transition({ type: 'idle' }, { type: 'START_TURN' });
    expect(next.type).toBe('player_compose');
  });

  it('player_compose → player_compose on TILE_TAP (accumulates word)', () => {
    const start: FsmState = { type: 'player_compose', word: '', tilesUsed: [] };
    const next = transition(start, { type: 'TILE_TAP', tileId: 0, letter: 'C' });
    expect(next).toEqual({ type: 'player_compose', word: 'C', tilesUsed: [0] });
  });

  it('player_compose → player_submit on SUBMIT (word ≥3)', () => {
    const start: FsmState = { type: 'player_compose', word: 'CAT', tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'SUBMIT' });
    expect(next.type).toBe('player_submit');
    if (next.type === 'player_submit') expect(next.word).toBe('CAT');
  });

  it('player_compose stays on SUBMIT with too-short word', () => {
    const start: FsmState = { type: 'player_compose', word: 'CA', tilesUsed: [0, 1] };
    const next = transition(start, { type: 'SUBMIT' });
    expect(next).toBe(start);
  });

  it('player_submit → player_resolve on RESOLVE', () => {
    const start: FsmState = { type: 'player_submit', word: 'CAT', tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'RESOLVE', damage: 5 });
    expect(next.type).toBe('player_resolve');
    if (next.type === 'player_resolve') expect(next.damage).toBe(5);
  });

  it('player_resolve → enemy_telegraph on PLAYER_RESOLVED (enemy alive)', () => {
    const start: FsmState = { type: 'player_resolve', damage: 5, tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'PLAYER_RESOLVED', enemyHpRemaining: 5, nextEnemyDamage: 3 });
    expect(next.type).toBe('enemy_telegraph');
    if (next.type === 'enemy_telegraph') expect(next.nextDamage).toBe(3);
  });

  it('player_resolve → victory on PLAYER_RESOLVED (enemy dead)', () => {
    const start: FsmState = { type: 'player_resolve', damage: 99, tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'PLAYER_RESOLVED', enemyHpRemaining: 0, nextEnemyDamage: 3 });
    expect(next.type).toBe('victory');
  });

  it('enemy_resolve → defeat on ENEMY_RESOLVED (hero dead)', () => {
    const start: FsmState = { type: 'enemy_resolve', damage: 99 };
    const next = transition(start, { type: 'ENEMY_RESOLVED', heroHpRemaining: 0 });
    expect(next.type).toBe('defeat');
  });

  it('TILE_TAP outside of player_compose is rejected (state unchanged)', () => {
    const start: FsmState = { type: 'enemy_telegraph', nextDamage: 3, ms: 800 };
    const next = transition(start, { type: 'TILE_TAP', tileId: 0, letter: 'X' });
    expect(next).toBe(start);
  });

  it('TILE_UNDO removes the tile and trims the word', () => {
    const start: FsmState = { type: 'player_compose', word: 'CAT', tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'TILE_UNDO', tileId: 1 });
    expect(next).toEqual({ type: 'player_compose', word: 'CT', tilesUsed: [0, 2] });
  });
});
