import { describe, it, expect } from 'vitest';
import * as kit from '../index';
import * as lib from '@/lib/education/motion';

describe('motion-kit frozen contract', () => {
  it.each(['PressButton', 'pressClasses', 'FeedbackSheet', 'Pop', 'CountUp', 'StaggerChips', 'CelebrationBeats', 'BeforeAfterNumber'])(
    'components/education/motion exports %s',
    (name) => {
      expect(['function', 'object']).toContain(typeof (kit as Record<string, unknown>)[name]);
      expect((kit as Record<string, unknown>)[name]).toBeTruthy();
    },
  );

  it('lib/education/motion exports the hook and the timing tokens', () => {
    expect(typeof lib.useEduReducedMotion).toBe('function');
    expect(lib.EDU_EASE.overshoot).toEqual([0.35, 1.8, 0.35, 0.83]);
    expect(lib.EDU_DUR.sheet).toBe(0.13);
    expect(lib.EDU_DUR.pop).toBe(0.3);
  });
});
