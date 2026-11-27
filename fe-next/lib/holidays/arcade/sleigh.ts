import { laneAccept, laneTick, newLane, type LaneRules, type LaneState } from './lane';

export const SLEIGH_BELLS = 3;
export const SLEIGH_SECONDS = 90;
export const passFor = (i: number) => Math.max(4.5, 10 - 0.35 * i);

const RULES: LaneRules = { lives: SLEIGH_BELLS, seconds: SLEIGH_SECONDS, passFor, speedBonus: 0.5 };

export type SleighState = LaneState;
export const newSleigh = (count: number) => newLane(RULES, count);
export const sleighTick = (s: SleighState, dt: number) => laneTick(RULES, s, dt);
export const sleighAccept = (s: SleighState, word: string, len: number) => laneAccept(RULES, s, word, len);
