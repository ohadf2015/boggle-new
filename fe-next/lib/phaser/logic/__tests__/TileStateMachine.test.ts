/**
 * TileStateMachine — state management for individual Phaser letter tiles.
 * Encodes legal state transitions; pure functions, zero side effects.
 *
 * RED phase: these tests must fail before the implementation exists.
 */

import {
  createTileState,
  transitionTile,
  TileStatus,
  type TileState,
} from '../TileStateMachine';

// ─── createTileState ──────────────────────────────────────────────────────────

describe('createTileState', () => {
  it('creates a tile in idle state', () => {
    const state = createTileState('A');
    expect(state.status).toBe<TileStatus>('idle');
  });

  it('stores the letter', () => {
    const state = createTileState('Z');
    expect(state.letter).toBe('Z');
  });

  it('initialises with zero selectedIndex', () => {
    const state = createTileState('B');
    expect(state.selectedIndex).toBeNull();
  });
});

// ─── transitionTile ───────────────────────────────────────────────────────────

describe('transitionTile: idle → selected', () => {
  it('transitions idle → selected on "select" action', () => {
    const state = createTileState('A');
    const next = transitionTile(state, { type: 'select', index: 0 });
    expect(next.status).toBe<TileStatus>('selected');
  });

  it('stores the selection index', () => {
    const state = createTileState('A');
    const next = transitionTile(state, { type: 'select', index: 3 });
    expect(next.selectedIndex).toBe(3);
  });

  it('does not mutate the original state (immutable)', () => {
    const state = createTileState('A');
    transitionTile(state, { type: 'select', index: 0 });
    expect(state.status).toBe<TileStatus>('idle');
  });
});

describe('transitionTile: selected → idle (deselect)', () => {
  it('transitions selected → idle on "deselect"', () => {
    const state = createTileState('A');
    const selected = transitionTile(state, { type: 'select', index: 0 });
    const next = transitionTile(selected, { type: 'deselect' });
    expect(next.status).toBe<TileStatus>('idle');
    expect(next.selectedIndex).toBeNull();
  });
});

describe('transitionTile: selected → submit states', () => {
  let selected: TileState;
  beforeEach(() => {
    selected = transitionTile(createTileState('A'), { type: 'select', index: 0 });
  });

  it('transitions selected → submitted-accept on "submit-accept"', () => {
    const next = transitionTile(selected, { type: 'submit-accept' });
    expect(next.status).toBe<TileStatus>('submitted-accept');
  });

  it('transitions selected → submitted-reject on "submit-reject"', () => {
    const next = transitionTile(selected, { type: 'submit-reject' });
    expect(next.status).toBe<TileStatus>('submitted-reject');
  });
});

describe('transitionTile: post-submit → idle (reset)', () => {
  it('transitions submitted-accept → idle on "reset"', () => {
    const state = createTileState('A');
    const selected = transitionTile(state, { type: 'select', index: 0 });
    const accepted = transitionTile(selected, { type: 'submit-accept' });
    const reset = transitionTile(accepted, { type: 'reset' });
    expect(reset.status).toBe<TileStatus>('idle');
    expect(reset.selectedIndex).toBeNull();
  });

  it('transitions submitted-reject → idle on "reset"', () => {
    const state = createTileState('A');
    const selected = transitionTile(state, { type: 'select', index: 0 });
    const rejected = transitionTile(selected, { type: 'submit-reject' });
    const reset = transitionTile(rejected, { type: 'reset' });
    expect(reset.status).toBe<TileStatus>('idle');
  });
});

describe('transitionTile: clearing', () => {
  it('transitions idle → clearing on "clear"', () => {
    const state = createTileState('A');
    const next = transitionTile(state, { type: 'clear' });
    expect(next.status).toBe<TileStatus>('clearing');
  });

  it('ignores unknown actions for a given state gracefully', () => {
    const state = createTileState('A');
    // "reset" on idle is a no-op; should not throw
    expect(() => transitionTile(state, { type: 'reset' })).not.toThrow();
  });
});
