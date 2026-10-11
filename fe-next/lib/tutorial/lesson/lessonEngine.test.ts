import { describe, it, expect } from 'vitest';
import {
  CLASSIC_LESSON,
  replayLesson,
  stepAccepts,
  liveSlots,
  nextTraceIndex,
} from './lessonEngine';

const steps = CLASSIC_LESSON.steps;
const valid = (word: string) => ({ word, isValid: true as const });

describe('CLASSIC_LESSON', () => {
  it('opens with a trace step and climbs in word length', () => {
    expect(steps[0].kind).toBe('trace');
    const lengths = steps.map((s) => s.minLength);
    expect([...lengths].sort((a, b) => a - b)).toEqual(lengths);
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });
});

describe('stepAccepts', () => {
  it('never accepts an invalid or unvalidated word', () => {
    expect(stepAccepts(steps[0], { word: 'cat', isValid: false })).toBe(false);
    expect(stepAccepts(steps[0], { word: 'cat', isValid: null })).toBe(false);
  });

  it('accepts any real word for the trace step, so a player who finds their own word still advances', () => {
    expect(stepAccepts(steps[0], valid('dog'))).toBe(true);
  });

  it('holds a find step to its minimum length', () => {
    const four = steps.find((s) => s.minLength === 4)!;
    expect(stepAccepts(four, valid('cat'))).toBe(false);
    expect(stepAccepts(four, valid('cats'))).toBe(true);
  });
});

describe('replayLesson', () => {
  it('advances at most one step per word, in order', () => {
    const r = replayLesson(steps, [valid('planets')]);
    expect(r.completedCount).toBe(1);
  });

  it('skips words that do not fit the current step without losing progress', () => {
    const four = steps.findIndex((s) => s.minLength === 4);
    const words = [...steps.slice(0, four).map(() => valid('cat')), valid('dog'), valid('cats')];
    const r = replayLesson(steps, words);
    expect(r.completedCount).toBe(four + 1);
    expect(r.lastWord).toBe('cats');
  });

  it('caps at the number of steps', () => {
    const r = replayLesson(steps, Array.from({ length: 10 }, () => valid('elephants')));
    expect(r.completedCount).toBe(steps.length);
  });
});

describe('liveSlots', () => {
  it('shows the target ghosted, then marks each traced letter as a match or a miss', () => {
    expect(liveSlots(steps[0], 'CAT', '').map((s) => s.state)).toEqual(['ghost', 'ghost', 'ghost']);
    const partial = liveSlots(steps[0], 'CAT', 'ca');
    expect(partial.map((s) => s.state)).toEqual(['match', 'match', 'ghost']);
    expect(partial[0].char).toBe('C');
    expect(liveSlots(steps[0], 'CAT', 'co').map((s) => s.state)).toEqual(['match', 'miss', 'ghost']);
  });

  it('gives a find step one empty slot per required letter and grows past it', () => {
    const four = steps.find((s) => s.minLength === 4)!;
    expect(liveSlots(four, null, '').map((s) => s.state)).toEqual(['empty', 'empty', 'empty', 'empty']);
    expect(liveSlots(four, null, 'ab').map((s) => s.state)).toEqual(['filled', 'filled', 'empty', 'empty']);
    const long = liveSlots(four, null, 'plane');
    expect(long).toHaveLength(5);
    expect(long.every((s) => s.state === 'ready')).toBe(true);
  });
});

describe('nextTraceIndex', () => {
  it('points at the next letter while the player stays on the target', () => {
    expect(nextTraceIndex('CAT', '')).toBe(0);
    expect(nextTraceIndex('CAT', 'c')).toBe(1);
    expect(nextTraceIndex('CAT', 'cat')).toBe(-1);
    expect(nextTraceIndex('CAT', 'cu')).toBe(-1);
  });
});
