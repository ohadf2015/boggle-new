import {
  pyramidGuess,
  pyramidAdvance,
  pyramidGiveUp,
  pyramidRevive,
  type PyramidState,
} from '@/lib/connections/pyramid/gameLogic';

export type PyramidAction =
  | { type: 'GUESS'; input: string }
  | { type: 'ADVANCE' }
  | { type: 'GIVE_UP' }
  | { type: 'REVEAL_HINT' }
  | { type: 'REVIVE' };

export function pyramidReducer(state: PyramidState, action: PyramidAction): PyramidState {
  switch (action.type) {
    case 'GUESS':
      return pyramidGuess(state, action.input);
    case 'ADVANCE':
      return pyramidAdvance(state);
    case 'GIVE_UP':
      return pyramidGiveUp(state);
    case 'REVEAL_HINT':
      return { ...state, hintRevealed: true };
    case 'REVIVE':
      return pyramidRevive(state);
    default:
      return state;
  }
}
