import { describe, it, expect } from 'vitest';
import { coachStepFor } from '../coachStep';

const base = {
  spMode: 'challenge',
  shortCoach: false,
  hintVisible: false,
  lessonActive: false,
  stepId: null as string | null,
  lessonComplete: false,
  lessonSkipped: false,
};

describe('coachStepFor', () => {
  it('names the lesson step the player is on', () => {
    expect(coachStepFor({ ...base, lessonActive: true, stepId: 'trace' })).toBe('trace');
    expect(coachStepFor({ ...base, lessonActive: true, stepId: 'find-4' })).toBe('find-4');
  });

  it('labels the shortened search round', () => {
    expect(coachStepFor({ ...base, shortCoach: true, hintVisible: true, lessonActive: true, stepId: 'trace' })).toBe('inline-hint');
    expect(coachStepFor({ ...base, shortCoach: true, hintVisible: false })).toBe('playing');
  });

  it('labels skip and finale', () => {
    expect(coachStepFor({ ...base, lessonSkipped: true })).toBe('skipped');
    expect(coachStepFor({ ...base, lessonComplete: true, lessonActive: true, stepId: 'find-5' })).toBe('complete');
  });

  it('omits the property outside challenge', () => {
    expect(coachStepFor({ ...base, spMode: 'solo-bots', lessonActive: true, stepId: 'trace' })).toBeUndefined();
  });
});
