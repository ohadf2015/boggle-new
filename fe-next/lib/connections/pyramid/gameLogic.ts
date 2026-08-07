import { INITIAL_LIVES, POINTS_EASY, POINTS_MEDIUM, POINTS_HARD, checkGuess } from '../gameLogic';
import type { ConnectionPuzzle } from '../types';
import type { PyramidPuzzle } from './types';

export const FINALE_POINTS = 500;

/**
 * Wrong guesses allowed per stage. Budgeted PER STAGE, not as one shared pool:
 * a pool of 3 across 4 stages meant three misses on base riddle 1 ended the run
 * before the finale was ever seen. Burning a BASE stage reveals its bridge (it
 * still feeds the finale) and play continues; burning the FINALE is the only
 * real loss — and the only place the ad-gated revive is offered.
 */
export const PYRAMID_ATTEMPTS_PER_STAGE = 4;

/** Guesses left on the current stage — the number the HUD should show. */
export function pyramidAttemptsLeft(state: PyramidState): number {
  return Math.max(0, PYRAMID_ATTEMPTS_PER_STAGE - state.wrongAttempts);
}

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

  const wrongAttempts = state.wrongAttempts + 1;
  if (wrongAttempts < PYRAMID_ATTEMPTS_PER_STAGE) {
    return { ...state, status: 'wrong', wrongAttempts };
  }

  // Stage budget spent. A base stage yields its bridge and the run goes on; the
  // finale is the terminal loss, routed through outOfLives so the player is
  // offered the rewarded revive before it becomes final.
  if (state.stage === 3) {
    return { ...state, status: 'outOfLives', lives: 0, wrongAttempts };
  }
  const puzzle = state.pyramid.base[state.stage];
  const gaveUpBase = [...state.gaveUpBase] as [boolean, boolean, boolean];
  gaveUpBase[state.stage] = true;
  return {
    ...state,
    status: 'gaveUp',
    solvedBridges: [...state.solvedBridges, puzzle.bridge],
    gaveUpBase,
    wrongAttempts,
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

/** Ad-gated revive: refill the stage's attempt budget and resume where we were. */
export function pyramidRevive(state: PyramidState): PyramidState {
  if (ENDED.has(state.status)) return state;
  return { ...state, lives: INITIAL_LIVES, wrongAttempts: 0, status: 'playing' };
}
