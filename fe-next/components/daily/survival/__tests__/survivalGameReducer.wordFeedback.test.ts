/**
 * survivalGameReducer - WordFeedback integration tests
 */

import { survivalGameReducer, createInitialState } from '../survivalGameReducer';
import type { WordFeedback } from '@/components/game/WordFormingArea';

describe('survivalGameReducer - WordFeedback actions', () => {
  it('should initialize wordFeedback as null', () => {
    const state = createInitialState();
    expect(state.wordFeedback).toBeNull();
  });

  it('should set wordFeedback on SET_WORD_FEEDBACK action', () => {
    const state = createInitialState();
    const feedback: WordFeedback = {
      id: '1',
      type: 'accepted',
      word: 'TEST',
      score: 42,
      timestamp: Date.now(),
    };

    const newState = survivalGameReducer(state, {
      type: 'SET_WORD_FEEDBACK',
      payload: feedback,
    });

    expect(newState.wordFeedback).toEqual(feedback);
  });

  it('should clear wordFeedback on CLEAR_WORD_FEEDBACK action', () => {
    const feedback: WordFeedback = {
      id: '1',
      type: 'rejected',
      word: 'XYZ',
      message: 'Not a word',
      timestamp: Date.now(),
    };

    const stateWithFeedback = survivalGameReducer(createInitialState(), {
      type: 'SET_WORD_FEEDBACK',
      payload: feedback,
    });

    const clearedState = survivalGameReducer(stateWithFeedback, {
      type: 'CLEAR_WORD_FEEDBACK',
    });

    expect(clearedState.wordFeedback).toBeNull();
  });

  it('should handle duplicate wordFeedback type', () => {
    const state = createInitialState();
    const feedback: WordFeedback = {
      id: '3',
      type: 'duplicate',
      word: 'WORD',
      message: 'Already found',
      timestamp: Date.now(),
    };

    const newState = survivalGameReducer(state, {
      type: 'SET_WORD_FEEDBACK',
      payload: feedback,
    });

    expect(newState.wordFeedback?.type).toBe('duplicate');
  });
});
