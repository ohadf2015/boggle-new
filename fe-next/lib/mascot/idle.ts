export type IdlePhase = 'awake' | 'peek' | 'doze';

export const IDLE_PEEK_MS = 20_000;
export const IDLE_DOZE_MS = 22_500;

export function idlePhase(lastWordAt: number, now: number): IdlePhase {
  const quiet = now - lastWordAt;
  if (quiet >= IDLE_DOZE_MS) return 'doze';
  if (quiet >= IDLE_PEEK_MS) return 'peek';
  return 'awake';
}

export const IDLE_POSES: Record<Exclude<IdlePhase, 'awake'>, string> = {
  peek: '/mascot/bored-nobg.webp',
  doze: '/mascot/sleepy-nobg.webp',
};
