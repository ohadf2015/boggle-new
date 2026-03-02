/**
 * TileStateMachine — state management for Phaser letter tiles.
 *
 * Encodes all legal state transitions as pure functions.
 * Phaser GameScene calls these to produce new state; never mutates directly.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TileStatus =
  | 'idle'
  | 'selected'
  | 'submitted-accept'
  | 'submitted-reject'
  | 'clearing';

export interface TileState {
  letter: string;
  status: TileStatus;
  /** Position in the current word path (null when not selected) */
  selectedIndex: number | null;
}

export type TileAction =
  | { type: 'select'; index: number }
  | { type: 'deselect' }
  | { type: 'submit-accept' }
  | { type: 'submit-reject' }
  | { type: 'reset' }
  | { type: 'clear' };

// ─── createTileState ──────────────────────────────────────────────────────────

export function createTileState(letter: string): TileState {
  return { letter, status: 'idle', selectedIndex: null };
}

// ─── transitionTile ───────────────────────────────────────────────────────────

/**
 * Apply an action to a tile state and return the new state.
 * Returns the original state unchanged when the action is not applicable.
 */
export function transitionTile(state: TileState, action: TileAction): TileState {
  switch (action.type) {
    case 'select':
      if (state.status === 'idle') {
        return { ...state, status: 'selected', selectedIndex: action.index };
      }
      return state;

    case 'deselect':
      if (state.status === 'selected') {
        return { ...state, status: 'idle', selectedIndex: null };
      }
      return state;

    case 'submit-accept':
      if (state.status === 'selected') {
        return { ...state, status: 'submitted-accept' };
      }
      return state;

    case 'submit-reject':
      if (state.status === 'selected') {
        return { ...state, status: 'submitted-reject' };
      }
      return state;

    case 'reset':
      if (
        state.status === 'submitted-accept' ||
        state.status === 'submitted-reject' ||
        state.status === 'selected'
      ) {
        return { ...state, status: 'idle', selectedIndex: null };
      }
      return state;

    case 'clear':
      return { ...state, status: 'clearing', selectedIndex: null };

    default:
      return state;
  }
}
