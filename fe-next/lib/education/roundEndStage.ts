/**
 * The staged reveal, as a timetable rather than a pile of setTimeouts.
 *
 * Third, second, a BEAT, then the winner. The beat is the whole trick: two
 * quick reveals train the room to expect a third, and the pause before it is
 * what makes thirty people lean in.
 *
 * WHY THIS SHAPE AND NOT AN ENTRANCE TWEEN (Pitfall Class 5, and the literal
 * reason the podium was frozen static in the first place): the plinths are
 * ALREADY PAINTED at stage `stage`, from the very first frame — full height,
 * full colour, full opacity. What arrives on the timetable is the name and the
 * score inside an already-drawn placard. So there is no moment at which a
 * screenshot can catch an empty screen, no `opacity: 0` backwards fill, and no
 * capture that reads standings out of the a11y tree that the pixels do not
 * show (un-revealed placards are `aria-hidden` until they are readable).
 *
 * `FINAL_STAGE` is the resting state and is fully painted: reduced motion, a
 * screenshot harness, a rematch remount and a test all start there and are
 * indistinguishable from the end of a played-out reveal.
 */

export type RoundEndStage = 'stage' | 'third' | 'second' | 'first' | 'sweep' | 'done';

/** In order. The last entry is the resting state. */
export const ROUND_END_STAGES: RoundEndStage[] = [
  'stage',
  'third',
  'second',
  'first',
  'sweep',
  'done',
];

export const FINAL_STAGE: RoundEndStage = 'done';

export interface RoundEndStep {
  stage: RoundEndStage;
  /** Milliseconds after the results screen mounts. */
  at: number;
}

/**
 * The timetable. Total runtime is under three seconds — a class of thirty is
 * not sitting through a cutscene, and the teacher's Rematch button is never
 * gated on it (the controls bar renders from the first frame).
 */
export function roundEndTimeline(): RoundEndStep[] {
  return [
    { stage: 'stage', at: 0 },
    { stage: 'third', at: 450 },
    { stage: 'second', at: 900 },
    // The beat: 750ms of nothing, twice the gap that preceded it.
    { stage: 'first', at: 1650 },
    { stage: 'sweep', at: 2150 },
    { stage: 'done', at: 2600 },
  ];
}

/** Which stage a reveal that started `elapsed` ms ago is showing. */
export function stageAtElapsed(elapsed: number): RoundEndStage {
  const timeline = roundEndTimeline();
  let stage: RoundEndStage = timeline[0].stage;
  for (const step of timeline) {
    if (elapsed >= step.at) stage = step.stage;
  }
  return stage;
}

/** The rank each stage brings in. Stages after `first` reveal everything. */
const REVEALED_AT: Record<RoundEndStage, number[]> = {
  stage: [],
  third: [3],
  second: [3, 2],
  first: [3, 2, 1],
  sweep: [3, 2, 1],
  done: [3, 2, 1],
};

/** Is this placing's name and score readable yet? */
export function isRevealed(rank: number, stage: RoundEndStage): boolean {
  // A placing past third (a two-player room hands us rank 1 and 2 only, a tie
  // can hand us a 4) is never staged — it appears with the rest.
  if (rank > 3) return stage !== 'stage';
  return REVEALED_AT[stage].includes(rank);
}

/** Has the reveal reached the point where the class-sweep meter fills? */
export function sweepReached(stage: RoundEndStage): boolean {
  return stage === 'sweep' || stage === 'done';
}

export default roundEndTimeline;
