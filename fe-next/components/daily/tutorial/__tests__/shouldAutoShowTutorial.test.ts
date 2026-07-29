import { describe, it, expect } from 'vitest';
import { shouldAutoShowTutorial } from '../shouldAutoShowTutorial';

describe('shouldAutoShowTutorial', () => {
  it('returns true on ready phase when tutorial not completed and not already showing', () => {
    expect(
      shouldAutoShowTutorial({
        phase: 'ready',
        tutorialCompleted: false,
        showTutorial: false,
      }),
    ).toBe(true);
  });

  it('returns false when tutorial already completed', () => {
    expect(
      shouldAutoShowTutorial({
        phase: 'ready',
        tutorialCompleted: true,
        showTutorial: false,
      }),
    ).toBe(false);
  });

  it('returns false when tutorial already open (prevents re-trigger loop)', () => {
    expect(
      shouldAutoShowTutorial({
        phase: 'ready',
        tutorialCompleted: false,
        showTutorial: true,
      }),
    ).toBe(false);
  });

  it('returns false during loading phase (puzzle not yet resolved)', () => {
    expect(
      shouldAutoShowTutorial({
        phase: 'loading',
        tutorialCompleted: false,
        showTutorial: false,
      }),
    ).toBe(false);
  });

  it('returns false during playing phase', () => {
    expect(
      shouldAutoShowTutorial({
        phase: 'playing',
        tutorialCompleted: false,
        showTutorial: false,
      }),
    ).toBe(false);
  });

  it('returns false after completion', () => {
    expect(
      shouldAutoShowTutorial({
        phase: 'completed',
        tutorialCompleted: false,
        showTutorial: false,
      }),
    ).toBe(false);
  });

  it('returns false for already-played visitors', () => {
    expect(
      shouldAutoShowTutorial({
        phase: 'already-played',
        tutorialCompleted: false,
        showTutorial: false,
      }),
    ).toBe(false);
  });
});
