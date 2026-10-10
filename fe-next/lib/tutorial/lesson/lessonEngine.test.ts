import { describe, it, expect } from 'vitest';
import {
  CLASSIC_FIRST_ROUND_STEPS,
  applyLessonWord,
  replayLesson,
} from './lessonEngine';

const HINT = 'cat';

describe('applyLessonWord', () => {
  it('ignores invalid words', () => {
    const r = applyLessonWord(CLASSIC_FIRST_ROUND_STEPS, 0, { word: HINT, isValid: false, hintWord: HINT });
    expect(r.completedCount).toBe(0);
    expect(r.completedStep).toBeNull();
  });

  it('completes the trace step only with the hinted word', () => {
    const miss = applyLessonWord(CLASSIC_FIRST_ROUND_STEPS, 0, { word: 'dog', isValid: true, hintWord: HINT });
    expect(miss.completedCount).toBe(0);
    const hit = applyLessonWord(CLASSIC_FIRST_ROUND_STEPS, 0, { word: 'CAT', isValid: true, hintWord: HINT });
    expect(hit.completedCount).toBe(1);
    expect(hit.completedStep?.id).toBe('trace-hint');
  });

  it('advances at most one step per word', () => {
    const r = applyLessonWord(CLASSIC_FIRST_ROUND_STEPS, 1, { word: 'elephant', isValid: true, hintWord: HINT });
    expect(r.completedCount).toBe(2);
    expect(r.completedStep?.id).toBe('any-word');
  });

  it('requires the minimum length of the current step', () => {
    const short = applyLessonWord(CLASSIC_FIRST_ROUND_STEPS, 2, { word: 'tea', isValid: true, hintWord: HINT });
    expect(short.completedCount).toBe(2);
    const long = applyLessonWord(CLASSIC_FIRST_ROUND_STEPS, 2, { word: 'tree', isValid: true, hintWord: HINT });
    expect(long.completedCount).toBe(3);
  });

  it('does nothing once every step is done', () => {
    const r = applyLessonWord(CLASSIC_FIRST_ROUND_STEPS, CLASSIC_FIRST_ROUND_STEPS.length, {
      word: 'elephant', isValid: true, hintWord: HINT,
    });
    expect(r.completedCount).toBe(CLASSIC_FIRST_ROUND_STEPS.length);
    expect(r.completedStep).toBeNull();
  });
});

describe('replayLesson', () => {
  it('replays words in order and reports the last completed step', () => {
    const words = [
      { word: 'dog', isValid: true },
      { word: 'cat', isValid: true },
      { word: 'tree', isValid: true },
      { word: 'elephant', isValid: true },
    ];
    const r = replayLesson(CLASSIC_FIRST_ROUND_STEPS, words, HINT);
    expect(r.completedCount).toBe(3);
    expect(r.lastCompleted?.id).toBe('long-word');
  });

  it('reports nothing when no words have been played', () => {
    const r = replayLesson(CLASSIC_FIRST_ROUND_STEPS, [], HINT);
    expect(r.completedCount).toBe(0);
    expect(r.lastCompleted).toBeNull();
  });
});
