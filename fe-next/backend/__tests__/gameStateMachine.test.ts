/**
 * Game State Machine Tests
 * Tests for state machine transitions and validation
 */

import {
  canTransition,
  transition,
  getValidEvents,
  getAllStates,
  isValidState,
  isWaiting,
  isInProgress,
  isFinished,
  isValidating,
  canSubmitWords,
  canStartGame,
  canJoinFreely,
  shouldSendGameState,
  toMachineState,
  toStorageState,
  getTransitionTarget
} from '../utils/gameStateMachine';

import type { GameState } from '@/shared/types';

describe('Game State Machine', () => {

  describe('State Mapping Functions', () => {

    test('toMachineState converts storage states correctly', () => {
      expect(toMachineState('waiting')).toBe('waiting');
      expect(toMachineState('in-progress')).toBe('inProgress');
      expect(toMachineState('finished')).toBe('finished');
      expect(toMachineState('validating')).toBe('validating');
    });

    test('toStorageState converts machine states correctly', () => {
      expect(toStorageState('waiting')).toBe('waiting');
      expect(toStorageState('inProgress')).toBe('in-progress');
      expect(toStorageState('finished')).toBe('finished');
      expect(toStorageState('validating')).toBe('validating');
    });

    test('handles unknown states by defaulting to waiting', () => {
      expect(toMachineState('unknown' as GameState)).toBe('waiting');
    });
  });

  describe('Valid Transitions from Waiting State', () => {

    test('can transition from waiting to in-progress via START', () => {
      expect(canTransition('waiting', 'START')).toBe(true);

      const result = transition('waiting', 'START');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('in-progress');
    });

    test('cannot transition from waiting via END', () => {
      expect(canTransition('waiting', 'END')).toBe(false);

      const result = transition('waiting', 'END');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    test('cannot transition from waiting via TIMEOUT', () => {
      expect(canTransition('waiting', 'TIMEOUT')).toBe(false);
    });

    test('cannot transition from waiting via VALIDATE', () => {
      expect(canTransition('waiting', 'VALIDATE')).toBe(false);
    });

    test('cannot transition from waiting via RESET', () => {
      expect(canTransition('waiting', 'RESET')).toBe(false);
    });
  });

  describe('Valid Transitions from In-Progress State', () => {

    test('can transition from in-progress to finished via END', () => {
      expect(canTransition('in-progress', 'END')).toBe(true);

      const result = transition('in-progress', 'END');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('finished');
    });

    test('can transition from in-progress to finished via TIMEOUT', () => {
      expect(canTransition('in-progress', 'TIMEOUT')).toBe(true);

      const result = transition('in-progress', 'TIMEOUT');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('finished');
    });

    test('cannot transition from in-progress via START', () => {
      expect(canTransition('in-progress', 'START')).toBe(false);
    });

    test('cannot transition from in-progress via VALIDATE', () => {
      expect(canTransition('in-progress', 'VALIDATE')).toBe(false);
    });

    test('cannot transition from in-progress via RESET', () => {
      expect(canTransition('in-progress', 'RESET')).toBe(false);
    });
  });

  describe('Valid Transitions from Finished State', () => {

    test('can transition from finished to validating via VALIDATE', () => {
      expect(canTransition('finished', 'VALIDATE')).toBe(true);

      const result = transition('finished', 'VALIDATE');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('validating');
    });

    test('can transition from finished to waiting via SKIP_VALIDATION', () => {
      expect(canTransition('finished', 'SKIP_VALIDATION')).toBe(true);

      const result = transition('finished', 'SKIP_VALIDATION');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('waiting');
    });

    test('can transition from finished to waiting via RESET', () => {
      expect(canTransition('finished', 'RESET')).toBe(true);

      const result = transition('finished', 'RESET');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('waiting');
    });

    test('cannot transition from finished via START', () => {
      expect(canTransition('finished', 'START')).toBe(false);
    });

    test('can transition from finished via END (idempotent)', () => {
      expect(canTransition('finished', 'END')).toBe(true);
      const result = transition('finished', 'END');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('finished');
    });
  });

  describe('Valid Transitions from Validating State', () => {

    test('can transition from validating to waiting via VALIDATION_COMPLETE', () => {
      expect(canTransition('validating', 'VALIDATION_COMPLETE')).toBe(true);

      const result = transition('validating', 'VALIDATION_COMPLETE');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('waiting');
    });

    test('cannot transition from validating via START', () => {
      expect(canTransition('validating', 'START')).toBe(false);
    });

    test('cannot transition from validating via END', () => {
      expect(canTransition('validating', 'END')).toBe(false);
    });

    test('cannot transition from validating via RESET', () => {
      expect(canTransition('validating', 'RESET')).toBe(false);
    });
  });

  describe('getValidEvents returns correct events', () => {

    test('waiting state allows START', () => {
      expect(getValidEvents('waiting')).toEqual(['START']);
    });

    test('in-progress state allows END and TIMEOUT', () => {
      expect(getValidEvents('in-progress')).toEqual(['END', 'TIMEOUT']);
    });

    test('finished state allows VALIDATE, SKIP_VALIDATION, and RESET', () => {
      expect(getValidEvents('finished')).toEqual(['END', 'VALIDATE', 'SKIP_VALIDATION', 'RESET']);
    });

    test('validating state allows VALIDATION_COMPLETE', () => {
      expect(getValidEvents('validating')).toEqual(['VALIDATION_COMPLETE']);
    });
  });

  describe('getTransitionTarget returns correct targets', () => {

    test('returns correct target for valid transitions', () => {
      expect(getTransitionTarget('waiting', 'START')).toBe('in-progress');
      expect(getTransitionTarget('in-progress', 'END')).toBe('finished');
      expect(getTransitionTarget('in-progress', 'TIMEOUT')).toBe('finished');
      expect(getTransitionTarget('finished', 'VALIDATE')).toBe('validating');
      expect(getTransitionTarget('finished', 'SKIP_VALIDATION')).toBe('waiting');
      expect(getTransitionTarget('finished', 'RESET')).toBe('waiting');
      expect(getTransitionTarget('validating', 'VALIDATION_COMPLETE')).toBe('waiting');
    });

    test('returns null for invalid transitions', () => {
      expect(getTransitionTarget('waiting', 'END')).toBeNull();
      expect(getTransitionTarget('in-progress', 'START')).toBeNull();
      expect(getTransitionTarget('finished', 'START')).toBeNull();
      expect(getTransitionTarget('validating', 'START')).toBeNull();
    });
  });

  describe('State Validation', () => {

    test('getAllStates returns all possible states', () => {
      const states = getAllStates();
      expect(states).toContain('waiting');
      expect(states).toContain('in-progress');
      expect(states).toContain('finished');
      expect(states).toContain('validating');
      expect(states.length).toBe(4);
    });

    test('isValidState validates known states', () => {
      expect(isValidState('waiting')).toBe(true);
      expect(isValidState('in-progress')).toBe(true);
      expect(isValidState('finished')).toBe(true);
      expect(isValidState('validating')).toBe(true);
    });

    test('isValidState rejects unknown states', () => {
      expect(isValidState('unknown')).toBe(false);
      expect(isValidState('playing')).toBe(false);
      expect(isValidState('')).toBe(false);
    });
  });

  describe('State Check Helper Functions', () => {

    test('isWaiting returns true only for waiting state', () => {
      expect(isWaiting('waiting')).toBe(true);
      expect(isWaiting('in-progress')).toBe(false);
      expect(isWaiting('finished')).toBe(false);
      expect(isWaiting('validating')).toBe(false);
    });

    test('isInProgress returns true only for in-progress state', () => {
      expect(isInProgress('waiting')).toBe(false);
      expect(isInProgress('in-progress')).toBe(true);
      expect(isInProgress('finished')).toBe(false);
      expect(isInProgress('validating')).toBe(false);
    });

    test('isFinished returns true only for finished state', () => {
      expect(isFinished('waiting')).toBe(false);
      expect(isFinished('in-progress')).toBe(false);
      expect(isFinished('finished')).toBe(true);
      expect(isFinished('validating')).toBe(false);
    });

    test('isValidating returns true only for validating state', () => {
      expect(isValidating('waiting')).toBe(false);
      expect(isValidating('in-progress')).toBe(false);
      expect(isValidating('finished')).toBe(false);
      expect(isValidating('validating')).toBe(true);
    });
  });

  describe('Game Action Permission Functions', () => {

    test('canSubmitWords returns true only during in-progress', () => {
      expect(canSubmitWords('waiting')).toBe(false);
      expect(canSubmitWords('in-progress')).toBe(true);
      expect(canSubmitWords('finished')).toBe(false);
      expect(canSubmitWords('validating')).toBe(false);
    });

    test('canStartGame returns true only during waiting', () => {
      expect(canStartGame('waiting')).toBe(true);
      expect(canStartGame('in-progress')).toBe(false);
      expect(canStartGame('finished')).toBe(false);
      expect(canStartGame('validating')).toBe(false);
    });

    test('shouldSendGameState returns true only during in-progress', () => {
      expect(shouldSendGameState('waiting')).toBe(false);
      expect(shouldSendGameState('in-progress')).toBe(true);
      expect(shouldSendGameState('finished')).toBe(false);
      expect(shouldSendGameState('validating')).toBe(false);
    });
  });

  describe('canJoinFreely with Game Object', () => {

    test('returns false for null game', () => {
      expect(canJoinFreely(null)).toBe(false);
    });

    test('allows joining during waiting state', () => {
      const game = { gameState: 'waiting' as GameState, isRanked: false, allowLateJoin: false };
      expect(canJoinFreely(game as any)).toBe(true);
    });

    test('allows joining during in-progress for non-ranked games', () => {
      const game = { gameState: 'in-progress' as GameState, isRanked: false, allowLateJoin: false };
      expect(canJoinFreely(game as any)).toBe(true);
    });

    test('denies joining during in-progress for ranked games without late join', () => {
      const game = { gameState: 'in-progress' as GameState, isRanked: true, allowLateJoin: false };
      expect(canJoinFreely(game as any)).toBe(false);
    });

    test('allows joining during in-progress for ranked games with late join enabled', () => {
      const game = { gameState: 'in-progress' as GameState, isRanked: true, allowLateJoin: true };
      expect(canJoinFreely(game as any)).toBe(true);
    });

    test('denies joining during finished state', () => {
      const game = { gameState: 'finished' as GameState, isRanked: false, allowLateJoin: true };
      expect(canJoinFreely(game as any)).toBe(false);
    });

    test('denies joining during validating state', () => {
      const game = { gameState: 'validating' as GameState, isRanked: false, allowLateJoin: true };
      expect(canJoinFreely(game as any)).toBe(false);
    });
  });

  describe('Complete Game Lifecycle Flow', () => {

    test('full game lifecycle: waiting -> in-progress -> finished -> validating -> waiting', () => {
      let state: GameState = 'waiting';

      // Start game
      let result = transition(state, 'START');
      expect(result.success).toBe(true);
      state = result.newState as GameState;
      expect(state).toBe('in-progress');

      // Game ends via timeout
      result = transition(state, 'TIMEOUT');
      expect(result.success).toBe(true);
      state = result.newState as GameState;
      expect(state).toBe('finished');

      // Enter validation phase
      result = transition(state, 'VALIDATE');
      expect(result.success).toBe(true);
      state = result.newState as GameState;
      expect(state).toBe('validating');

      // Validation complete
      result = transition(state, 'VALIDATION_COMPLETE');
      expect(result.success).toBe(true);
      state = result.newState as GameState;
      expect(state).toBe('waiting');
    });

    test('quick reset flow: waiting -> in-progress -> finished -> waiting via RESET', () => {
      let state: GameState = 'waiting';

      // Start game
      let result = transition(state, 'START');
      state = result.newState as GameState;
      expect(state).toBe('in-progress');

      // Game ends manually
      result = transition(state, 'END');
      state = result.newState as GameState;
      expect(state).toBe('finished');

      // Skip validation and reset directly
      result = transition(state, 'RESET');
      expect(result.success).toBe(true);
      state = result.newState as GameState;
      expect(state).toBe('waiting');
    });

    test('skip validation flow: waiting -> in-progress -> finished -> waiting via SKIP_VALIDATION', () => {
      let state: GameState = 'waiting';

      // Start game
      let result = transition(state, 'START');
      state = result.newState as GameState;

      // Game ends
      result = transition(state, 'END');
      state = result.newState as GameState;

      // Skip validation
      result = transition(state, 'SKIP_VALIDATION');
      expect(result.success).toBe(true);
      state = result.newState as GameState;
      expect(state).toBe('waiting');
    });
  });

  describe('Invalid Transition Attempts', () => {

    test('attempting invalid transitions returns proper error', () => {
      const result = transition('waiting', 'END');
      expect(result.success).toBe(false);
      expect(result.newState).toBeNull();
      expect(result.error).toBe('Invalid transition: waiting -> END');
    });

    test('double START is invalid', () => {
      const result1 = transition('waiting', 'START');
      expect(result1.success).toBe(true);

      const result2 = transition(result1.newState as GameState, 'START');
      expect(result2.success).toBe(false);
    });

    test('cannot validate from in-progress', () => {
      const result = transition('in-progress', 'VALIDATE');
      expect(result.success).toBe(false);
    });

    test('cannot complete validation when not validating', () => {
      expect(transition('waiting', 'VALIDATION_COMPLETE').success).toBe(false);
      expect(transition('in-progress', 'VALIDATION_COMPLETE').success).toBe(false);
      expect(transition('finished', 'VALIDATION_COMPLETE').success).toBe(false);
    });
  });

  describe('Edge Cases', () => {

    test('transition result object has correct structure', () => {
      const successResult = transition('waiting', 'START');
      expect(successResult).toHaveProperty('success', true);
      expect(successResult).toHaveProperty('newState', 'in-progress');
      expect(successResult).not.toHaveProperty('error');

      const failResult = transition('waiting', 'END');
      expect(failResult).toHaveProperty('success', false);
      expect(failResult).toHaveProperty('newState', null);
      expect(failResult).toHaveProperty('error');
    });

    test('multiple consecutive valid transitions work correctly', () => {
      const states: GameState[] = [];
      let state: GameState = 'waiting';
      states.push(state);

      // Run multiple games
      for (let i = 0; i < 3; i++) {
        state = transition(state, 'START').newState as GameState;
        states.push(state);

        state = transition(state, 'END').newState as GameState;
        states.push(state);

        state = transition(state, 'RESET').newState as GameState;
        states.push(state);
      }

      // Should have cycled correctly
      // Initial 'waiting' + 3 cycles of ['in-progress', 'finished', 'waiting'] = 10 states
      expect(states).toEqual([
        'waiting',                                    // initial
        'in-progress', 'finished', 'waiting',         // cycle 1
        'in-progress', 'finished', 'waiting',         // cycle 2
        'in-progress', 'finished', 'waiting'          // cycle 3
      ]);
    });
  });
});
