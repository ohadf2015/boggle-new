import { describe, it, expect } from 'vitest';
import { createMicroTutorial } from './microTutorial';

describe('microTutorial state machine', () => {
  it('starts at beat "drag" for classic mode', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    expect(m.currentBeat()).toBe('drag');
  });

  it('advances to "diagonal" once user starts a drag (classic)', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    expect(m.currentBeat()).toBe('diagonal');
  });

  it('first valid word triggers "nice" beat', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'word-found' });
    expect(m.currentBeat()).toBe('nice');
  });

  it('subsequent valid words after nice are silent (null beat)', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'word-found' });
    m.dispatch({ type: 'beat-completed' });
    m.dispatch({ type: 'word-found' });
    expect(m.currentBeat()).toBe(null);
  });

  it('fires goal-complete beat when goal reached', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'goal-reached', count: 3 });
    expect(m.currentBeat()).toBe('goalComplete');
  });

  it('idle nudge after 30s with no active beat', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'beat-completed' });
    m.dispatch({ type: 'idle-30s' });
    expect(m.currentBeat()).toBe('idleNudge');
  });

  it('returns null when fully consumed', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'beat-completed' });
    m.dispatch({ type: 'beat-completed' });
    expect(m.currentBeat()).toBe(null);
  });

  it('per-mode initial beat — wheelRush starts at "spin"', () => {
    const m = createMicroTutorial({ mode: 'wheelRush' });
    expect(m.currentBeat()).toBe('spin');
  });

  it('per-mode initial beat — wordHunt starts at "target"', () => {
    const m = createMicroTutorial({ mode: 'wordHunt' });
    expect(m.currentBeat()).toBe('target');
  });
});
