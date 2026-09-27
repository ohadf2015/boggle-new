import { generateRandomTable } from '@/utils/utils';
import type { Language, LetterGrid } from '@/shared/types/game';
import { scoreTurn, totalsAfterRound } from './scoring';
import { validatePartySetup } from './setup';
import {
  PARTY_STATE_VERSION,
  type FoundWord,
  type PartySetup,
  type PartyState,
  type PlayerRoundResult,
} from './types';

function rollBoard(setup: PartySetup): LetterGrid {
  return generateRandomTable(
    setup.rows,
    setup.cols,
    setup.language as Language,
  );
}

function emptyTotals(setup: PartySetup): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of setup.players) totals[p.id] = 0;
  return totals;
}

export function createPartyGame(setup: PartySetup): PartyState {
  const check = validatePartySetup(setup);
  if (!check.ok) {
    throw new Error(`Invalid party setup: ${check.errors.join(',')}`);
  }
  return {
    version: PARTY_STATE_VERSION,
    setup,
    phase: 'handoff',
    roundIndex: 0,
    playerIndex: 0,
    board: rollBoard(setup),
    claimedThisRound: [],
    currentFound: [],
    currentScore: 0,
    roundResults: [],
    totals: emptyTotals(setup),
  };
}

export function beginTurn(state: PartyState): PartyState {
  if (state.phase !== 'handoff') return state;
  return {
    ...state,
    phase: 'play',
    currentFound: [],
    currentScore: 0,
  };
}

export function submitWord(
  state: PartyState,
  rawWord: string,
  isValidWord: (word: string) => boolean,
): PartyState {
  if (state.phase !== 'play') return state;
  const word = rawWord.trim().toLocaleLowerCase();
  if (!word || !isValidWord(word)) return state;

  const already = new Set(state.currentFound.map((w) => w.word));
  if (already.has(word)) return state;

  const result = scoreTurn({
    words: [word],
    claimedByEarlier: new Set(state.claimedThisRound),
    alreadyFoundThisTurn: already,
  });
  const accepted = result.accepted[0];
  if (!accepted) return state;

  const currentFound: FoundWord[] = [...state.currentFound, accepted];
  const currentScore = currentFound.filter((w) => w.unique).reduce((s, w) => s + w.score, 0);
  return { ...state, currentFound, currentScore };
}

export function endTurn(state: PartyState): PartyState {
  if (state.phase !== 'play') return state;
  const player = state.setup.players[state.playerIndex];
  if (!player) return state;

  const row: PlayerRoundResult = {
    playerId: player.id,
    words: state.currentFound,
    roundScore: state.currentScore,
  };

  const roundSlice = [...(state.roundResults[state.roundIndex] ?? []), row];
  const roundResults = state.roundResults.slice();
  roundResults[state.roundIndex] = roundSlice;

  const newlyClaimed = state.currentFound.filter((w) => w.unique).map((w) => w.word);
  const claimedThisRound = [...state.claimedThisRound, ...newlyClaimed];

  const lastPlayer = state.playerIndex >= state.setup.players.length - 1;
  if (!lastPlayer) {
    return {
      ...state,
      phase: 'handoff',
      playerIndex: state.playerIndex + 1,
      claimedThisRound,
      currentFound: [],
      currentScore: 0,
      roundResults,
    };
  }

  const totals = totalsAfterRound(state.totals, roundSlice);
  return {
    ...state,
    phase: 'roundBreakdown',
    claimedThisRound,
    currentFound: [],
    currentScore: 0,
    roundResults,
    totals,
  };
}

export function nextAfterBreakdown(state: PartyState): PartyState {
  if (state.phase !== 'roundBreakdown') return state;
  const lastRound = state.roundIndex >= state.setup.roundCount - 1;
  if (lastRound) {
    return { ...state, phase: 'podium' };
  }
  return {
    ...state,
    phase: 'handoff',
    roundIndex: state.roundIndex + 1,
    playerIndex: 0,
    board: rollBoard(state.setup),
    claimedThisRound: [],
    currentFound: [],
    currentScore: 0,
  };
}

export function currentPlayer(state: PartyState) {
  return state.setup.players[state.playerIndex] ?? state.setup.players[0]!;
}
