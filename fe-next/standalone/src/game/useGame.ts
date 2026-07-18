import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { generateBoard, type LetterGrid } from '../core/board';
import { buildPositionsMap } from '../core/validate';
import { evaluateWord } from './evaluate';

export const ROUND_SECONDS = 60;
const BEST_KEY = 'lexiclash_standalone_best';

export type Phase = 'ready' | 'playing' | 'results';
export interface FoundWord { word: string; score: number }
export interface LastEvent {
  id: number;
  type: 'accept' | 'reject';
  word: string;
  score: number;
  reason?: string;
}

interface State {
  phase: Phase;
  board: LetterGrid;
  timeLeft: number;
  score: number;
  combo: number;
  found: FoundWord[];
  best: number;
  last: LastEvent | null;
}

type Action =
  | { type: 'START' }
  | { type: 'TICK' }
  | { type: 'END' }
  | { type: 'ACCEPT'; word: string; score: number }
  | { type: 'REJECT'; word: string; reason: string; resetCombo: boolean };

function readBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function writeBest(n: number) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* ignore */ }
}

let evId = 0;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'START':
      return { ...s, phase: 'playing', board: generateBoard(), timeLeft: ROUND_SECONDS, score: 0, combo: 0, found: [], last: null };
    case 'TICK': {
      const t = s.timeLeft - 1;
      if (t <= 0) return endRound({ ...s, timeLeft: 0 });
      return { ...s, timeLeft: t };
    }
    case 'END':
      return endRound(s);
    case 'ACCEPT':
      return {
        ...s,
        score: s.score + a.score,
        combo: s.combo + 1,
        found: [{ word: a.word, score: a.score }, ...s.found],
        last: { id: ++evId, type: 'accept', word: a.word, score: a.score },
      };
    case 'REJECT':
      return {
        ...s,
        combo: a.resetCombo ? 0 : s.combo,
        last: { id: ++evId, type: 'reject', word: a.word, score: 0, reason: a.reason },
      };
    default:
      return s;
  }
}

function endRound(s: State): State {
  const best = Math.max(s.best, s.score);
  if (best > s.best) writeBest(best);
  return { ...s, phase: 'results', timeLeft: 0, best };
}

function init(): State {
  return { phase: 'ready', board: generateBoard(), timeLeft: ROUND_SECONDS, score: 0, combo: 0, found: [], best: readBest(), last: null };
}

export function useGame(dict: Set<string> | null) {
  const [s, dispatch] = useReducer(reducer, undefined, init);
  const positionsMap = useMemo(() => buildPositionsMap(s.board), [s.board]);
  const foundSet = useMemo(() => new Set(s.found.map((f) => f.word)), [s.found]);
  const stateRef = useRef(s);
  stateRef.current = s;

  // Round timer.
  useEffect(() => {
    if (s.phase !== 'playing') return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [s.phase]);

  const start = useCallback(() => dispatch({ type: 'START' }), []);

  const submitWord = useCallback((word: string) => {
    const st = stateRef.current;
    if (st.phase !== 'playing' || !dict) return;
    const res = evaluateWord(word, {
      board: st.board,
      positionsMap,
      dict,
      found: new Set(st.found.map((f) => f.word)),
      comboLevel: st.combo,
    });
    if (res.accepted) {
      dispatch({ type: 'ACCEPT', word: word.toLowerCase(), score: res.score });
    } else {
      // Only genuine mistakes break the combo; accidental short/dupe are forgiven.
      const resetCombo = res.reason === 'not-a-path' || res.reason === 'not-a-word';
      dispatch({ type: 'REJECT', word: word.toLowerCase(), reason: res.reason ?? 'invalid', resetCombo });
    }
  }, [dict, positionsMap]);

  return { state: s, foundSet, start, submitWord };
}
