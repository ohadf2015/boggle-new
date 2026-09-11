/**
 * The staged reveal, as a timetable rather than a pile of setTimeouts.
 *
 * Third, second, a BEAT, then the winner — that beat is the whole trick, and a
 * beat you cannot read in a test is a beat that silently disappears in a
 * refactor.
 *
 * The hard rule this file pins: the LAST stage is the resting state, and the
 * resting state is fully painted. Reduced motion, a capture, or a rematch
 * remount all start there. Nothing in the timetable may ever leave the screen
 * blank (Pitfall Class 5).
 */

import { describe, it, expect } from 'vitest';
import {
  ROUND_END_STAGES,
  roundEndTimeline,
  stageAtElapsed,
  isRevealed,
  FINAL_STAGE,
  type RoundEndStage,
} from '../roundEndStage';

describe('ROUND_END_STAGES', () => {
  it('reveals third, then second, then the winner', () => {
    const order: RoundEndStage[] = ['stage', 'third', 'second', 'first', 'sweep', 'done'];
    expect(ROUND_END_STAGES).toEqual(order);
  });

  it('ends on the resting stage', () => {
    expect(ROUND_END_STAGES[ROUND_END_STAGES.length - 1]).toBe(FINAL_STAGE);
  });
});

describe('roundEndTimeline', () => {
  it('opens on the painted stage with no delay — the room never sees an empty screen', () => {
    expect(roundEndTimeline()[0]).toEqual({ stage: 'stage', at: 0 });
  });

  it('holds a beat before the winner that is longer than the gap before second', () => {
    const at = (stage: RoundEndStage) => roundEndTimeline().find((s) => s.stage === stage)!.at;
    const secondGap = at('second') - at('third');
    const winnerBeat = at('first') - at('second');
    expect(winnerBeat).toBeGreaterThan(secondGap);
  });

  it('is over inside three seconds — a class does not wait for a cutscene', () => {
    const timeline = roundEndTimeline();
    expect(timeline[timeline.length - 1].at).toBeLessThanOrEqual(3000);
  });

  it('never goes backwards', () => {
    const times = roundEndTimeline().map((s) => s.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('stageAtElapsed', () => {
  it('is the resting stage once the timeline has run out', () => {
    expect(stageAtElapsed(999999)).toBe(FINAL_STAGE);
  });

  it('is the painted stage at time zero, never a blank one', () => {
    expect(stageAtElapsed(0)).toBe('stage');
  });
});

describe('isRevealed', () => {
  it('hides the winner until the winner beat', () => {
    expect(isRevealed(1, 'second')).toBe(false);
    expect(isRevealed(1, 'first')).toBe(true);
  });

  it('reveals third place first', () => {
    expect(isRevealed(3, 'third')).toBe(true);
    expect(isRevealed(2, 'third')).toBe(false);
  });

  it('shows every placing in the resting stage', () => {
    for (const rank of [1, 2, 3]) {
      expect(isRevealed(rank, FINAL_STAGE)).toBe(true);
    }
  });

  it('shows every placing in the sweep stage too — nothing un-reveals', () => {
    for (const rank of [1, 2, 3]) {
      expect(isRevealed(rank, 'sweep')).toBe(true);
    }
  });
});
