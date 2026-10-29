import type { FeedbackType } from '../types';

export type HuntVerdict = 'good' | 'target' | 'bad' | 'dupe';
export type HuntPhase = 'idle' | 'live' | 'pending' | 'verdict';
export interface HuntCell { row: number; col: number }

export interface HuntStageState {
  phase: HuntPhase;
  word: string;
  path: HuntCell[];
  verdict: HuntVerdict | null;
  releaseSeq: number;
}

export type HuntStageEvent =
  | { type: 'live'; word: string }
  | { type: 'release'; word: string; path: HuntCell[]; seq: number }
  /** `word` is the word the verdict is about; feedback about no word (hints, tokens) never lands on the stage. */
  | { type: 'feedback'; seq: number; verdict: HuntVerdict | null; word: string | null }
  | { type: 'expire' };

export const VERDICT_HOLD_MS = 700;
/** A rejection carries a reason (and usually a life cost): give it time to be read. */
export const REJECT_HOLD_MS = 1600;
export const PENDING_TIMEOUT_MS = 8000;

export const initialHuntStage: HuntStageState = {
  phase: 'idle',
  word: '',
  path: [],
  verdict: null,
  releaseSeq: 0,
};

const GOOD: ReadonlySet<FeedbackType> = new Set(['valid-word', 'discovery', 'short-valid', 'target-attempt']);
const BAD: ReadonlySet<FeedbackType> = new Set(['not-on-board', 'not-in-dictionary', 'invalid-word']);

export function verdictFor(type: FeedbackType | null): HuntVerdict | null {
  if (!type) return null;
  if (type === 'target-found') return 'target';
  if (GOOD.has(type)) return 'good';
  if (BAD.has(type)) return 'bad';
  if (type === 'duplicate' || type === 'too-short' || type === 'too-long') return 'dupe';
  return null;
}

export function isGoodVerdict(verdict: HuntVerdict | null): verdict is 'good' | 'target' {
  return verdict === 'good' || verdict === 'target';
}

export function verdictHoldMs(verdict: HuntVerdict | null): number {
  return isGoodVerdict(verdict) ? VERDICT_HOLD_MS : REJECT_HOLD_MS;
}

export function praiseKeyFor(length: number): string {
  if (length >= 7) return 'wordHunt.survival.stage.praiseLong';
  if (length >= 5) return 'wordHunt.survival.stage.praiseMid';
  return 'wordHunt.survival.stage.praiseShort';
}

export function huntStageReducer(state: HuntStageState, event: HuntStageEvent): HuntStageState {
  switch (event.type) {
    case 'live':
      if (state.phase !== 'live' && state.phase !== 'idle' && event.word === state.word) return state;
      if (event.word) return { ...initialHuntStage, phase: 'live', word: event.word };
      return state.phase === 'live' ? initialHuntStage : state;
    case 'release':
      return { phase: 'pending', word: event.word, path: event.path, verdict: null, releaseSeq: event.seq };
    case 'feedback':
      if (state.phase !== 'pending' || event.seq <= state.releaseSeq || !event.verdict) return state;
      // A verdict for an earlier word that was still being checked must not land on this one.
      if (!event.word || event.word.toUpperCase() !== state.word.toUpperCase()) return state;
      return { ...state, phase: 'verdict', verdict: event.verdict };
    case 'expire':
      return initialHuntStage;
    default:
      return state;
  }
}
