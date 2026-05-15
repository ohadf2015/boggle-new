import { createBag, type SupportedLocale, type TileBag } from '../tileBag';
import { applyCardEffects } from '../run/cardEffects';
import type { PowerCard } from '../run/powerCards';
import type { ScoringTile } from '../types';
import { drawCascadeCardChoices } from './cascadeCards';
import { CASCADE_ROUND_COUNT, getCascadeRoundTarget, getFireRiseMs } from './roundTargets';
import type { RunPhase, RoundState } from '../run/runTypes';
import {
  createGrid,
  type CascadeGrid,
} from './boardGrid';
import { validatePath } from './swipePath';
import { burnAndCascadeAround } from './engineRunner';
import {
  createFireState,
  tickFire,
  resetFire,
  applyFrostPause,
  isGameOver,
  type FireState,
} from './fireRow';
import { lengthBonus, MAX_CHAIN_MULT } from './scoring';

export interface CascadeRunOptions {
  seed: number;
  locale: SupportedLocale;
  boardSize: 7 | 9;
  /** Word validator. Must be locale-aware. */
  isWord: (word: string) => boolean;
}

export interface LastSubmitResult {
  word: string;
  baseScore: number;
  chainScores: number[];
  totalScore: number;
  burnedCellIds: string[];
  chainWords: string[];
}

export interface CascadeRunState {
  phase: RunPhase;
  seed: number;
  locale: SupportedLocale;
  boardSize: 7 | 9;
  grid: CascadeGrid;
  bag: TileBag;
  fire: FireState;
  activeCards: PowerCard[];
  round: RoundState;
  cardChoice: PowerCard[] | null;
  roundPassed: boolean;
  runTotal: number;
  lastSubmit: LastSubmitResult | null;
  lastError: string | null;
  cleared: boolean;
  /** Counts cascades scored this round, used by Echo card. */
  cascadeChainsThisRound: number;
}

export type CascadeRunAction =
  | { type: 'START_RUN' }
  | { type: 'SUBMIT_PATH'; path: string[] }
  | { type: 'FIRE_TICK'; deltaMs: number }
  | { type: 'END_ROUND' }
  | { type: 'PROCEED' }
  | { type: 'PICK_CARD'; cardId: string }
  | { type: 'RESTART' }
  | { type: 'CLEAR_ERROR' };

const FIRE_ROWS = 7;
const FROST_DURATION_MS = 8_000;
const FIRE_RESET_LONG_WORD = 1;
const FIRE_RESET_HUGE_WORD = 2;

function chainMult(chainCount: number): number {
  if (chainCount <= 1) return 1;
  return Math.min(MAX_CHAIN_MULT, 1 + 0.5 * (chainCount - 1));
}

function hasCard(state: CascadeRunState, id: string): boolean {
  return state.activeCards.some((c) => c.id === id);
}

function makeScoringTiles(letters: string[], values: number[]): ScoringTile[] {
  return letters.map((letter, i) => ({ letter, value: values[i], premium: null }));
}

function scoreOneWord(
  state: CascadeRunState,
  letters: string[],
  values: number[],
  chainIdx: number,
  wordIndexInRound: number,
): number {
  const wordTiles = makeScoringTiles(letters, values);
  const length = letters.length;
  if (length < 3) return 0;
  const baseChips = values.reduce((a, b) => a + b, 0);
  let baseMult = lengthBonus(length);
  // Ember Boost: fire halfway or more → double baseMult
  if (hasCard(state, 'emberBoost') && state.fire.fireRow * 2 >= state.fire.totalRows) {
    baseMult *= 2;
  }
  const ctx = {
    wordTiles,
    wordLength: length,
    wordIndexInRound,
    baseChips,
    baseMult,
  };
  const word = applyCardEffects(ctx, state.activeCards);
  let chain = chainMult(chainIdx);
  // Echo: first cascade chain per round → 3× extra
  if (hasCard(state, 'echo') && chainIdx === 2 && state.cascadeChainsThisRound === 0) {
    chain *= 3;
  }
  return Math.floor(word.total * chain);
}

function buildRound(state: CascadeRunState, roundNumber: number): CascadeRunState {
  // Cascade uses the full per-locale distribution so gravity always has tiles
  // to spawn from (rack-mode's small bag is too tight for a 49-cell grid).
  const bag = createBag({
    seed: state.seed + roundNumber * 101,
    locale: state.locale,
  });
  const grid = createGrid(state.boardSize, state.boardSize, bag);
  const fire = createFireState({ totalRows: FIRE_ROWS, riseEveryMs: getFireRiseMs(roundNumber) });
  return {
    ...state,
    phase: 'playing',
    grid,
    bag,
    fire,
    round: {
      round: roundNumber,
      target: getCascadeRoundTarget(roundNumber, state.boardSize),
      score: 0,
      wordsPlayedThisRound: 0,
    },
    cardChoice: null,
    roundPassed: false,
    lastSubmit: null,
    lastError: null,
    cascadeChainsThisRound: 0,
  };
}

export function buildInitialCascadeRunState(opts: CascadeRunOptions): CascadeRunState {
  const { seed, locale, boardSize } = opts;
  const bag = createBag({ seed: seed + 101, locale });
  const grid = createGrid(boardSize, boardSize, bag);
  const fire = createFireState({ totalRows: FIRE_ROWS, riseEveryMs: getFireRiseMs(1) });
  return {
    phase: 'intro',
    seed,
    locale,
    boardSize,
    grid,
    bag,
    fire,
    activeCards: [],
    round: { round: 1, target: getCascadeRoundTarget(1, boardSize), score: 0, wordsPlayedThisRound: 0 },
    cardChoice: null,
    roundPassed: false,
    runTotal: 0,
    lastSubmit: null,
    lastError: null,
    cleared: false,
    cascadeChainsThisRound: 0,
  };
}

export interface CascadeRunReducerDeps {
  isWord: (word: string) => boolean;
}

export function cascadeRunReducer(
  state: CascadeRunState,
  action: CascadeRunAction,
  deps: CascadeRunReducerDeps,
): CascadeRunState {
  switch (action.type) {
    case 'START_RUN':
      return { ...state, phase: 'playing' };

    case 'CLEAR_ERROR':
      return { ...state, lastError: null };

    case 'SUBMIT_PATH': {
      if (state.phase !== 'playing') return state;
      const v = validatePath(state.grid, action.path, {
        diagonal: hasCard(state, 'diagonal'),
      });
      if (!v.ok) {
        return { ...state, lastError: v.reason };
      }
      const upper = v.word.toUpperCase();
      if (!deps.isWord(upper)) {
        return { ...state, lastError: 'INVALID_WORD' };
      }

      // Manual swipe score (chain 1)
      const indices = action.path
        .map((id) => state.grid.index.get(id))
        .filter((i): i is number => i !== undefined);
      const letters = indices.map((i) => state.grid.cells[i].letter!);
      const values = indices.map((i) => state.grid.cells[i].value);
      const baseScore = scoreOneWord(
        state,
        letters,
        values,
        1,
        state.round.wordsPlayedThisRound,
      );

      // Pyro: burn an extra random tile if word length >=5
      const burnIds: string[] = [...action.path];
      if (hasCard(state, 'pyro') && action.path.length >= 5) {
        const candidates = state.grid.cells
          .filter((c) => c.letter !== null && !burnIds.includes(c.id))
          .map((c) => c.id);
        if (candidates.length > 0) {
          const idx = Math.floor(state.bag.rng() * candidates.length);
          burnIds.push(candidates[idx]);
        }
      }

      // Burn → gravity → cascade resolve, scoring each chain
      const { finalGrid, chainWords, chainScores } = burnAndCascadeAround({
        grid: state.grid,
        bag: state.bag,
        initialBurnIds: burnIds,
        isWord: deps.isWord,
        scoreChain: (letters: string[], values: number[], chainIdx: number) =>
          scoreOneWord(state, letters, values, chainIdx, state.round.wordsPlayedThisRound),
      });

      // Fire reset on long words
      let fire = state.fire;
      if (action.path.length >= 8) fire = resetFire(fire, FIRE_RESET_HUGE_WORD);
      else if (action.path.length >= 6) fire = resetFire(fire, FIRE_RESET_LONG_WORD);
      // Frost: pause fire on ≥6-letter words
      if (hasCard(state, 'frost') && action.path.length >= 6) {
        fire = applyFrostPause(fire, FROST_DURATION_MS);
      }

      const totalScore = baseScore + chainScores.reduce((a, b) => a + b, 0);

      return {
        ...state,
        grid: finalGrid,
        fire,
        round: {
          ...state.round,
          score: state.round.score + totalScore,
          wordsPlayedThisRound: state.round.wordsPlayedThisRound + 1 + chainWords.length,
        },
        cascadeChainsThisRound: state.cascadeChainsThisRound + chainWords.length,
        lastSubmit: {
          word: v.word,
          baseScore,
          chainScores,
          totalScore,
          burnedCellIds: burnIds,
          chainWords,
        },
        lastError: null,
      };
    }

    case 'FIRE_TICK': {
      if (state.phase !== 'playing') return state;
      const fire = tickFire(state.fire, action.deltaMs);
      if (isGameOver(fire)) {
        // Force round end as fail
        const passed = state.round.score >= state.round.target;
        return {
          ...state,
          fire,
          phase: 'roundResult',
          roundPassed: passed,
        };
      }
      return { ...state, fire };
    }

    case 'END_ROUND': {
      if (state.phase !== 'playing') return state;
      const passed = state.round.score >= state.round.target;
      let runTotal = state.runTotal;
      if (passed) {
        let bonus = 0;
        for (const card of state.activeCards) {
          if (card.roundEndBonus) bonus += card.roundEndBonus(state.round.score, state.round.target);
        }
        runTotal = state.runTotal + state.round.score + bonus;
      }
      return { ...state, phase: 'roundResult', roundPassed: passed, runTotal };
    }

    case 'PROCEED': {
      if (state.phase !== 'roundResult') return state;
      if (!state.roundPassed) return { ...state, phase: 'runResult', cleared: false };
      if (state.round.round >= CASCADE_ROUND_COUNT) return { ...state, phase: 'runResult', cleared: true };
      const ownedIds = state.activeCards.map((c) => c.id);
      const cardChoice = drawCascadeCardChoices(state.seed + state.round.round * 31, ownedIds, 3);
      return { ...state, phase: 'cardPick', cardChoice };
    }

    case 'PICK_CARD': {
      if (state.phase !== 'cardPick') return state;
      const picked = (state.cardChoice ?? []).find((c) => c.id === action.cardId);
      if (!picked) return state;
      const activeCards = [...state.activeCards, picked];
      return { ...buildRound(state, state.round.round + 1), activeCards };
    }

    case 'RESTART':
      return buildInitialCascadeRunState({
        seed: state.seed,
        locale: state.locale,
        boardSize: state.boardSize,
        isWord: deps.isWord,
      });

    default:
      return state;
  }
}
