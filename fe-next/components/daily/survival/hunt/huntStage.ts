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
  /** Released words still waiting for their verdict, oldest first. */
  waiting: string[];
  /** A verdict that landed after the player moved on to another word. */
  late: { word: string; verdict: HuntVerdict; seq: number } | null;
}

export type HuntStageEvent =
  | { type: 'live'; word: string }
  | { type: 'release'; word: string; path: HuntCell[]; seq: number }
  /** `word` is the word the verdict is about; feedback about no word (hints, tokens) never lands on the stage. */
  | { type: 'feedback'; seq: number; verdict: HuntVerdict | null; word: string | null }
  | { type: 'expire' }
  | { type: 'lateExpire' };

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
  waiting: [],
  late: null,
};

const MAX_WAITING = 4;
const sameWord = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

const GOOD: ReadonlySet<FeedbackType> = new Set(['valid-word', 'discovery', 'short-valid']);
const BAD: ReadonlySet<FeedbackType> = new Set(['not-on-board', 'not-in-dictionary', 'invalid-word', 'target-attempt']);

export function verdictFor(type: FeedbackType | null): HuntVerdict | null {
  if (!type) return null;
  if (type === 'target-found') return 'target';
  if (GOOD.has(type)) return 'good';
  if (BAD.has(type)) return 'bad';
  if (type === 'duplicate' || type === 'too-short' || type === 'too-long' || type === 'unavailable') return 'dupe';
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
      if (event.word) return { ...initialHuntStage, phase: 'live', word: event.word, waiting: state.waiting, late: state.late };
      return state.phase === 'live' ? { ...initialHuntStage, waiting: state.waiting, late: state.late } : state;
    case 'release':
      return {
        phase: 'pending',
        word: event.word,
        path: event.path,
        verdict: null,
        releaseSeq: event.seq,
        waiting: [...state.waiting, event.word].slice(-MAX_WAITING),
        late: state.late,
      };
    case 'feedback': {
      const { word, verdict } = event;
      if (!word || !verdict) return state;
      if (state.phase === 'pending' && event.seq > state.releaseSeq && sameWord(word, state.word)) {
        return { ...state, phase: 'verdict', verdict, waiting: state.waiting.filter((w) => !sameWord(w, word)) };
      }
      // One word can get a second verdict: a real word found on the board that was also a wrong guess.
      if (state.phase === 'verdict' && event.seq > state.releaseSeq && sameWord(word, state.word) && verdict !== state.verdict) {
        return { ...state, verdict };
      }
      // A verdict for an earlier word that was still being checked must not land on this one.
      if (!state.waiting.some((w) => sameWord(w, word))) return state;
      return { ...state, waiting: state.waiting.filter((w) => !sameWord(w, word)), late: { word: word.toUpperCase(), verdict, seq: event.seq } };
    }
    case 'expire':
      return {
        ...initialHuntStage,
        waiting: state.phase === 'pending' ? state.waiting.filter((w) => !sameWord(w, state.word)) : state.waiting,
        late: state.late,
      };
    case 'lateExpire':
      return state.late ? { ...state, late: null } : state;
    default:
      return state;
  }
}
