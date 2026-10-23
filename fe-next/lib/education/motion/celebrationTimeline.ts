import { EDU_DUR, EDU_MS } from './tokens';

export const CELEBRATION_MAX_MS = 4500;

export interface CelebrationTimeline {
  heroAt: number;
  pullBackAt: number;
  chipsAt: number[];
  landAt: number[];
  total: number;
}

const ms = (seconds: number) => Math.round(seconds * 1000);

export function celebrationTimeline(chipCount: number): CelebrationTimeline {
  const heroAt = EDU_MS.hold;
  const pullBackAt = heroAt + ms(EDU_DUR.hero) + EDU_MS.heroHold;
  const firstChip = pullBackAt + ms(EDU_DUR.pullBack) + EDU_MS.chipGap;
  const countUp = ms(EDU_DUR.countUp);
  const room = CELEBRATION_MAX_MS - countUp - firstChip;
  const stagger = chipCount > 1 ? Math.min(EDU_MS.chipStagger, Math.floor(room / (chipCount - 1))) : 0;
  const chipsAt = Array.from({ length: chipCount }, (_, i) => firstChip + i * stagger);
  const landAt = chipsAt.map((at) => at + countUp);
  const total = landAt.length ? landAt[landAt.length - 1] : pullBackAt + ms(EDU_DUR.pullBack);
  return { heroAt, pullBackAt, chipsAt, landAt, total };
}
