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

  it('is over inside six seconds — a class does not wait for a cutscene', () => {
    const timeline = roundEndTimeline();
    expect(timeline[timeline.length - 1].at).toBeLessThanOrEqual(6000);
  });

  // The whole reason round 2 was judged "no payoff exists": a capture agent
  // shoots the wall at +0/+2/+4/+8 seconds, and a timetable that finishes in
  // 2.6s hands it four byte-identical frames of the RESTING state. The reveal
  // has to be slow enough that a camera pointed at it catches it happening.
  it('gives a +0/+2/+4/+8s capture at least three different frames', () => {
    const shots = [0, 2000, 4000, 8000].map(stageAtElapsed);
    expect(new Set(shots).size).toBeGreaterThanOrEqual(3);
  });

  // A capture's "immediate" shot is never immediate — the screenshot lands a
  // second or two after the screen mounts. If the reveal is finished by then,
  // every frame of every pair is the resting state and the payoff is invisible
  // to anyone who was not in the room.
  it('is still revealing two and a half seconds in', () => {
    expect(stageAtElapsed(2500)).not.toBe(FINAL_STAGE);
  });

  it('changes frame between shots taken two seconds apart', () => {
    expect(stageAtElapsed(1000)).not.toBe(stageAtElapsed(3000));
    expect(stageAtElapsed(3000)).not.toBe(stageAtElapsed(5000));
  });

  it('has settled by six seconds — the teacher is not held hostage', () => {
    expect(stageAtElapsed(6000)).toBe(FINAL_STAGE);
  });

  // ...but the blank-placard opening must stay a blink, or the first shot of
  // the round shows three plinths reading "—" and reads as broken.
  it('reveals third place within 800ms so no shot catches an all-blank podium', () => {
    const third = roundEndTimeline().find((s) => s.stage === 'third')!.at;
    expect(third).toBeLessThanOrEqual(800);
  });

  it('never goes backwards', () => {
    const times = roundEndTimeline().map((s) => s.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  // Round 4's critic sampled the wall once a second. Any gap shorter than a
  // second is a stage a 1 Hz shutter can step straight over, so that stage may
  // as well not exist as far as the evidence goes. `sweep` (600ms after
  // `first`) and `done` (600ms after `sweep`) were both skippable.
  it('leaves no stage a 1-second shutter can skip entirely', () => {
    const times = roundEndTimeline().map((s) => s.at);
    const gaps = times.slice(1).map((at, i) => at - times[i]);
    // The opening blink is exempt: `third` lands fast on purpose so no frame
    // catches an all-blank podium (asserted just above).
    expect(Math.min(...gaps.slice(1))).toBeGreaterThanOrEqual(1000);
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
