export const LEVEL_S = 12;
const SURPRISE = [15, 35] as const;

export const levelAt = (time: number) => Math.floor(time / LEVEL_S);

export const comboMult = (combo: number) => Math.min(4, 1 + Math.floor(combo / 5));

export type PaceEvent = { type: 'level'; level: number } | { type: 'surprise' };

export interface Pace {
  level: number;
  surpriseAt: number;
  surprised: boolean;
}

export function newPace(rng: () => number): Pace {
  return { level: 0, surpriseAt: SURPRISE[0] + rng() * (SURPRISE[1] - SURPRISE[0]), surprised: false };
}

export function stepPace(p: Pace, time: number): PaceEvent[] {
  const out: PaceEvent[] = [];
  const level = levelAt(time + 1e-9);
  while (p.level < level) {
    p.level += 1;
    out.push({ type: 'level', level: p.level });
  }
  if (!p.surprised && time >= p.surpriseAt) {
    p.surprised = true;
    out.push({ type: 'surprise' });
  }
  return out;
}
