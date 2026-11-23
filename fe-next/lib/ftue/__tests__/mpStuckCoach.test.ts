import { describe, it, expect } from 'vitest';
import {
  nextStuckStage,
  IDLE_MS,
  FRUITLESS_MS,
  TAP_MIN,
  DRAG_MIN,
  SUBMIT_MIN,
  VETERAN_GAMES,
  ESCALATE_MS,
  shouldEscalate,
  stageWantsExampleWord,
  type StuckSignals,
} from '../mpStuckCoach';

// A baseline "fresh, brand-new player, nothing happened yet" signal set.
// Each test overrides only the fields it cares about (Given-When-Then).
function base(overrides: Partial<StuckSignals> = {}): StuckSignals {
  return {
    elapsedMs: 0,
    idleMs: 0,
    taps: 0,
    dragsStarted: 0,
    submits: 0,
    accepted: 0,
    totalGamesPlayed: 0,
    isDesktop: false,
    alreadyShown: false,
    ...overrides,
  };
}

describe('nextStuckStage — gates', () => {
  it('returns none once the player has scored (success gate), even if idle', () => {
    expect(
      nextStuckStage(base({ accepted: 1, idleMs: IDLE_MS * 10, submits: 5 }))
    ).toBe('none');
  });

  it('returns none for veterans (more than VETERAN_GAMES games) who are fiddling', () => {
    expect(
      nextStuckStage(
        base({
          totalGamesPlayed: VETERAN_GAMES + 1,
          submits: SUBMIT_MIN + 2,
          elapsedMs: FRUITLESS_MS + 1000,
        })
      )
    ).toBe('none');
  });

  it('returns none when the coach was already shown (dedup / one-shot)', () => {
    expect(
      nextStuckStage(
        base({
          alreadyShown: true,
          taps: TAP_MIN + 5,
          idleMs: IDLE_MS + 1000,
        })
      )
    ).toBe('none');
  });
});

describe('nextStuckStage — stage detection', () => {
  it('idle-nudge: no interaction of any kind after IDLE_MS', () => {
    expect(nextStuckStage(base({ idleMs: IDLE_MS, elapsedMs: IDLE_MS }))).toBe(
      'idle-nudge'
    );
  });

  it('honours a shorter idle threshold for the first coached round', () => {
    expect(nextStuckStage(base({ idleMs: 4000, elapsedMs: 4000, idleThresholdMs: 4000 }))).toBe('idle-nudge');
    expect(nextStuckStage(base({ idleMs: 3999, elapsedMs: 4000, idleThresholdMs: 4000 }))).toBe('none');
  });

  it('does NOT fire idle-nudge before IDLE_MS (thoughtful early pause)', () => {
    expect(nextStuckStage(base({ idleMs: IDLE_MS - 1, elapsedMs: IDLE_MS }))).toBe(
      'none'
    );
  });

  it('tap-hint: tapped single tiles repeatedly, never dragged or submitted (mobile)', () => {
    expect(
      nextStuckStage(base({ taps: TAP_MIN, idleMs: 500, elapsedMs: 8000 }))
    ).toBe('tap-hint');
  });

  it('suppresses tap-hint on desktop (mouse users do not tap-one-tile)', () => {
    expect(
      nextStuckStage(base({ taps: TAP_MIN, isDesktop: true, elapsedMs: 8000 }))
    ).toBe('none');
  });

  it('submit-hint: built paths but never submitted, after FRUITLESS_MS', () => {
    expect(
      nextStuckStage(
        base({ dragsStarted: DRAG_MIN, submits: 0, elapsedMs: FRUITLESS_MS })
      )
    ).toBe('submit-hint');
  });

  it('validity-hint: submitted words but none accepted, after FRUITLESS_MS', () => {
    expect(
      nextStuckStage(
        base({ submits: SUBMIT_MIN, accepted: 0, elapsedMs: FRUITLESS_MS })
      )
    ).toBe('validity-hint');
  });

  it('validity-hint takes priority over submit-hint when both could match', () => {
    expect(
      nextStuckStage(
        base({
          submits: SUBMIT_MIN,
          dragsStarted: DRAG_MIN + 3,
          accepted: 0,
          elapsedMs: FRUITLESS_MS,
        })
      )
    ).toBe('validity-hint');
  });
});

describe('nextStuckStage — discriminator: thoughtful pause vs fruitless fiddle', () => {
  it('thoughtful pause (scored, then idle) → none', () => {
    expect(
      nextStuckStage(base({ accepted: 2, idleMs: IDLE_MS + 5000, submits: 3 }))
    ).toBe('none');
  });

  it('fruitless fiddle (many submits, zero accepted) → validity-hint', () => {
    expect(
      nextStuckStage(
        base({ submits: SUBMIT_MIN + 4, accepted: 0, elapsedMs: FRUITLESS_MS + 2000 })
      )
    ).toBe('validity-hint');
  });

  it('does not fire fruitless help before FRUITLESS_MS (still exploring)', () => {
    expect(
      nextStuckStage(
        base({ submits: SUBMIT_MIN, accepted: 0, elapsedMs: FRUITLESS_MS - 1 })
      )
    ).toBe('none');
  });
});

describe('nextStuckStage — shared idle rule for every mode', () => {
  it('nudges a player who poked once and then froze for IDLE_MS with no word', () => {
    expect(nextStuckStage(base({ taps: 1, idleMs: IDLE_MS, elapsedMs: IDLE_MS * 2 }))).toBe('idle-nudge');
  });

  it('applies no veteran gate when the mode has no lifetime game count', () => {
    expect(
      nextStuckStage(base({ totalGamesPlayed: undefined, idleMs: IDLE_MS, elapsedMs: IDLE_MS }))
    ).toBe('idle-nudge');
  });
});

describe('shouldEscalate — nudge, then a real word from the board', () => {
  const ready = {
    firstOutcome: 'ignored' as const,
    accepted: 0,
    msSinceFirstHidden: ESCALATE_MS,
    hasExample: true,
  };

  it('escalates to the example word once the nudge was ignored and the player still has no word', () => {
    expect(shouldEscalate(ready)).toBe(true);
  });

  it('waits ESCALATE_MS after the nudge hid', () => {
    expect(shouldEscalate({ ...ready, msSinceFirstHidden: ESCALATE_MS - 1 })).toBe(false);
  });

  it('never escalates after "Got it", a found word, or without a word to show', () => {
    expect(shouldEscalate({ ...ready, firstOutcome: 'dismissed' })).toBe(false);
    expect(shouldEscalate({ ...ready, firstOutcome: 'helped' })).toBe(false);
    expect(shouldEscalate({ ...ready, accepted: 1 })).toBe(false);
    expect(shouldEscalate({ ...ready, hasExample: false })).toBe(false);
  });

  it('fetches the example during the nudge so it is ready for the escalation', () => {
    expect(stageWantsExampleWord('idle-nudge')).toBe(true);
    expect(stageWantsExampleWord('example')).toBe(true);
    expect(stageWantsExampleWord('submit-hint')).toBe(false);
  });
});
