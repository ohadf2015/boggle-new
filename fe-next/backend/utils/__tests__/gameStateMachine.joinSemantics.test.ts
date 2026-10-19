/**
 * What a student gets on joining depends on these two answers: only a round in progress
 * replays a board; the results screen (session still live) seats them in the waiting room.
 */
import { describe, it, expect } from 'vitest';
import { shouldSendGameState, isInProgress } from '../gameStateMachine';

describe('join semantics by round state', () => {
  it('replays a board only for a round in progress', () => {
    expect(shouldSendGameState('in-progress')).toBe(true);
    expect(shouldSendGameState('finished')).toBe(false);
    expect(shouldSendGameState('waiting')).toBe(false);
  });

  it('the late-join switch only ever applies to a running round', () => {
    expect(isInProgress('finished')).toBe(false);
    expect(isInProgress('waiting')).toBe(false);
  });
});
