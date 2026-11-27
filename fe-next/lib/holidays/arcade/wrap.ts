import { laneAccept, laneTick, newLane, type LaneRules, type LaneState } from './lane';

export const WRAP_MISSES = 3;
export const WRAP_SECONDS = 90;
export const travelFor = (i: number) => Math.max(5, 11 - 0.25 * i);
const MYSTERY_BOOST = 4 / 3;

const RULES: LaneRules = { lives: WRAP_MISSES, seconds: WRAP_SECONDS, passFor: travelFor, speedBonus: 0.5 };

export type WrapState = LaneState;
export const newWrap = (count: number) => newLane(RULES, count);
export const wrapTick = (s: WrapState, dt: number) => laneTick(RULES, s, dt);
export const wrapAccept = (s: WrapState, word: string, len: number, mystery: boolean) =>
  laneAccept(RULES, s, word, len, mystery ? MYSTERY_BOOST : 1);
