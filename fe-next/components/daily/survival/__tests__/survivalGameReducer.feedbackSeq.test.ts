import { survivalGameReducer, createInitialState } from '../survivalGameReducer';

describe('survivalGameReducer feedbackSeq', () => {
  it('starts at zero', () => {
    expect(createInitialState().feedbackSeq).toBe(0);
  });

  it('advances on every toast, even when the type repeats', () => {
    let state = createInitialState();
    state = survivalGameReducer(state, { type: 'SHOW_TOAST', payload: { type: 'valid-word', message: '+5', word: 'CAT' } });
    state = survivalGameReducer(state, { type: 'SHOW_TOAST', payload: { type: 'valid-word', message: '+7', word: 'DOGS' } });
    expect(state.feedbackSeq).toBe(2);
    expect(state.feedbackWord).toBe('DOGS');
  });

  it('keeps the sequence when the toast closes', () => {
    let state = survivalGameReducer(createInitialState(), { type: 'SHOW_TOAST', payload: { type: 'duplicate', message: 'x' } });
    state = survivalGameReducer(state, { type: 'CLOSE_TOAST' });
    expect(state.feedbackSeq).toBe(1);
    expect(state.feedbackType).toBeNull();
  });
});
