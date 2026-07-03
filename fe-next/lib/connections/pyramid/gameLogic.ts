import { INITIAL_LIVES, POINTS_EASY, POINTS_MEDIUM, POINTS_HARD, checkGuess } from '../gameLogic';
import type { ConnectionPuzzle } from '../types';
import type { PyramidPuzzle } from './types';

export const FINALE_POINTS = 500;

const POINTS_BY_DIFFICULTY: Record<ConnectionPuzzle['difficulty'], number> = {
  easy: POINTS_EASY,
  medium: POINTS_MEDIUM,
  hard: POINTS_HARD,
};

export type PyramidStatus =
  | 'playing'
  | 'correct'
  | 'wrong'
  | 'gaveUp'
  | 'outOfLives'
  | 'won'
  | 'lost';

export interface PyramidState {
  pyramid: PyramidPuzzle;
  /** 0-2 = base riddle index, 3 = finale. */
  stage: 0 | 1 | 2 | 3;
  lives: number;
  score: number;
  /** Bridges revealed so far (solved OR given up) — the finale clues. */
  solvedBridges: string[];
  /** Per base riddle: true if the player gave up on it (share grid). */
  gaveUpBase: [boolean, boolean, boolean];
  wrongAttempts: number;
  hintRevealed: boolean;
  status: PyramidStatus;
}

const ENDED: ReadonlySet<PyramidStatus> = new Set(['won', 'lost']);
const RESOLVED: ReadonlySet<PyramidStatus> = new Set(['correct', 'gaveUp', 'won', 'lost']);

export function initPyramidState(pyramid: PyramidPuzzle): PyramidState {
  return {
    pyramid,
    stage: 0,
    lives: INITIAL_LIVES,
    score: 0,
    solvedBridges: [],
    gaveUpBase: [false, false, false],
    wrongAttempts: 0,
    hintRevealed: false,
    status: 'playing',
  };
}

/**
 * Finale check reuses the base-riddle matcher via a synthetic puzzle so
 * canonicalization (he sofit folding, diacritics, depluralize) comes free.
 */
export function checkFinaleGuess(input: string, pyramid: PyramidPuzzle): boolean {
  const synthetic: ConnectionPuzzle = {
    id: `${pyramid.id}:finale`,
    word1: '',
    word2: '',
    bridge: pyramid.metaAnswer,
    acceptedAnswers: pyramid.metaAccepted,
    difficulty: pyramid.difficulty,
  };
  return checkGuess(input, synthetic).correct;
}

export function pyramidGuess(state: PyramidState, input: string): PyramidState {
  if (ENDED.has(state.status) || state.status === 'outOfLives' || RESOLVED.has(state.status)) {
    return state;
  }

  if (state.stage === 3) {
    if (checkFinaleGuess(input, state.pyramid)) {
      return { ...state, status: 'won', score: state.score + FINALE_POINTS, wrongAttempts: 0 };
    }
  } else {
    const puzzle = state.pyramid.base[state.stage];
    if (checkGuess(input, puzzle).correct) {
      return {
        ...state,
        status: 'correct',
        score: state.score + POINTS_BY_DIFFICULTY[puzzle.difficulty],
        solvedBridges: [...state.solvedBridges, puzzle.bridge],
        wrongAttempts: 0,
      };
    }
  }

  const lives = Math.max(0, state.lives - 1);
  return {
    ...state,
    status: lives === 0 ? 'outOfLives' : 'wrong',
    lives,
    wrongAttempts: state.wrongAttempts + 1,
  };
}

/** Give up on the current stage: reveal (base feeds the finale), no life cost. Finale give-up ends the run. */
export function pyramidGiveUp(state: PyramidState): PyramidState {
  if (ENDED.has(state.status) || RESOLVED.has(state.status) || state.status === 'outOfLives') {
    return state;
  }
  if (state.stage === 3) {
    return { ...state, status: 'lost', wrongAttempts: 0 };
  }
  const puzzle = state.pyramid.base[state.stage];
  const gaveUpBase = [...state.gaveUpBase] as [boolean, boolean, boolean];
  gaveUpBase[state.stage] = true;
  return {
    ...state,
    status: 'gaveUp',
    solvedBridges: [...state.solvedBridges, puzzle.bridge],
    gaveUpBase,
    wrongAttempts: 0,
  };
}

/** After correct/gaveUp/outOfLives: move to the next stage, or end the run. */
export function pyramidAdvance(state: PyramidState): PyramidState {
  if (ENDED.has(state.status)) return state;
  if (state.status === 'outOfLives') {
    return { ...state, status: 'lost' };
  }
  if (state.status !== 'correct' && state.status !== 'gaveUp') return state;
  const nextStage = (state.stage + 1) as PyramidState['stage'];
  return {
    ...state,
    stage: nextStage > 3 ? 3 : nextStage,
    status: 'playing',
    wrongAttempts: 0,
    hintRevealed: false,
  };
}

/** Ad-gated revive (parity with the daily): restore lives, resume the current stage. */
export function pyramidRevive(state: PyramidState): PyramidState {
  if (ENDED.has(state.status)) return state;
  return { ...state, lives: INITIAL_LIVES, wrongAttempts: 0, status: 'playing' };
}
