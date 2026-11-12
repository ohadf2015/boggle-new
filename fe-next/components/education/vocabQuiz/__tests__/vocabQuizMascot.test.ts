import { describe, it, expect } from 'vitest';
import { vocabQuizPose } from '../vocabQuizMascot';

describe('vocabQuizPose — the quiz wears the classroom mascot', () => {
  it.each([
    ['thinking', 'welcome'],
    ['spectating', 'welcome'],
    ['celebration', 'success'],
    ['onfire', 'endOfYear'],
    ['mindblown', 'attack'],
    ['oops', 'empty'],
    ['sad', 'brainBreak'],
    ['trophy', 'podium'],
    ['panic', 'error'],
    ['encouraging', 'tip'],
  ] as const)('Given the %s face, Then the education art shows the %s pose', (face, pose) => {
    expect(vocabQuizPose(face)).toBe(pose);
  });

  it('Given a face the quiz never asks for, Then Lexi falls back to the resting wave', () => {
    expect(vocabQuizPose('skateboarding')).toBe('welcome');
  });
});
