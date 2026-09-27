import { describe, it, expect } from 'vitest';
import { evaluateWord, MIN_WORD_LEN, type EvalContext } from './evaluate';
import { buildPositionsMap } from '../core/validate';

const board = [
  ['C', 'A', 'T'],
  ['X', 'D', 'O'],
  ['X', 'X', 'G'],
];
const dict = new Set(['cat', 'dog', 'cats']);

function ctx(over: Partial<EvalContext> = {}): EvalContext {
  return {
    board,
    positionsMap: buildPositionsMap(board),
    dict,
    found: new Set(),
    comboLevel: 0,
    ...over,
  };
}

describe('evaluateWord', () => {
  it('accepts a real word on a valid path', () => {
    const r = evaluateWord('CAT', ctx());
    expect(r.accepted).toBe(true);
    expect(r.score).toBeGreaterThan(0);
  });
  it('rejects too-short words', () => {
    expect(evaluateWord('CA', ctx()).reason).toBe('short');
    expect(MIN_WORD_LEN).toBe(3);
  });
  it('rejects duplicates already found', () => {
    expect(evaluateWord('CAT', ctx({ found: new Set(['cat']) })).reason).toBe('duplicate');
  });
  it('rejects a real word that is not a path on the board', () => {
    // "cats" letters: C A T S — no S on board → not-a-path (fails path before dict)
    expect(evaluateWord('CATS', ctx()).reason).toBe('not-a-path');
  });
  it('rejects a valid path that is not a real word', () => {
    // "dog" is real+path; "cad": C(0,0)->A(0,1)->D(1,1) is a path but not in dict
    expect(evaluateWord('CAD', ctx()).reason).toBe('not-a-word');
  });
  it('awards more points at a higher combo level', () => {
    const low = evaluateWord('DOG', ctx({ comboLevel: 0 })).score;
    const high = evaluateWord('DOG', ctx({ comboLevel: 5 })).score;
    expect(high).toBeGreaterThan(low);
  });
});
