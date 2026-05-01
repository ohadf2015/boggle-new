import { describe, it, expect } from 'vitest';
import { transition, botComposeToResolve } from '../fsm';
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
  });

  it('player_resolve → bot_compose on PLAYER_RESOLVED (enemy alive)', () => {
    const start: FsmState = { type: 'player_resolve', damage: 5, tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'PLAYER_RESOLVED', enemyHpRemaining: 5 });
    expect(next.type).toBe('bot_compose');
  });

  it('player_resolve → victory on PLAYER_RESOLVED (enemy dead)', () => {
    const start: FsmState = { type: 'player_resolve', damage: 99, tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'PLAYER_RESOLVED', enemyHpRemaining: 0 });
    expect(next.type).toBe('victory');
  });

  it('bot_compose → bot_compose with word/tiles set on BOT_PICKED', () => {
    const start: FsmState = { type: 'bot_compose', word: '', tilesClaimed: [], damage: 0 };
    const next = transition(start, {
      type: 'BOT_PICKED',
      word: 'STORM',
      tilesClaimed: [3, 4, 5, 6, 7],
      damage: 8,
    });
    expect(next.type).toBe('bot_compose');
    if (next.type === 'bot_compose') {
      expect(next.word).toBe('STORM');
      expect(next.damage).toBe(8);
    }
  });

  it('bot_compose → tile_refresh on BOT_RESOLVED with no word picked', () => {
    const start: FsmState = { type: 'bot_compose', word: '', tilesClaimed: [], damage: 0 };
    const next = transition(start, { type: 'BOT_RESOLVED', heroHpRemaining: 25 });
    expect(next.type).toBe('tile_refresh');
  });

  it('botComposeToResolve advances to bot_resolve', () => {
    const start: FsmState = { type: 'bot_compose', word: 'STORM', tilesClaimed: [], damage: 8 };
    const next = botComposeToResolve(start);
    expect(next.type).toBe('bot_resolve');
    if (next.type === 'bot_resolve') expect(next.damage).toBe(8);
  });

  it('bot_resolve → defeat on BOT_RESOLVED (hero dead)', () => {
    const start: FsmState = { type: 'bot_resolve', damage: 99 };
    const next = transition(start, { type: 'BOT_RESOLVED', heroHpRemaining: 0 });
    expect(next.type).toBe('defeat');
  });

  it('bot_resolve → tile_refresh on BOT_RESOLVED (hero alive)', () => {
    const start: FsmState = { type: 'bot_resolve', damage: 4 };
    const next = transition(start, { type: 'BOT_RESOLVED', heroHpRemaining: 26 });
    expect(next.type).toBe('tile_refresh');
  });

  it('TILE_TAP outside of player_compose is rejected', () => {
    const start: FsmState = { type: 'bot_compose', word: '', tilesClaimed: [], damage: 0 };
    const next = transition(start, { type: 'TILE_TAP', tileId: 0, letter: 'X' });
    expect(next).toBe(start);
  });

  it('TILE_UNDO removes the tile and trims the word', () => {
    const start: FsmState = { type: 'player_compose', word: 'CAT', tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'TILE_UNDO', tileId: 1 });
    expect(next).toEqual({ type: 'player_compose', word: 'CT', tilesUsed: [0, 2] });
  });
});
