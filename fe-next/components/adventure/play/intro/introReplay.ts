import type { PlayLevel } from '@/lib/adventure/play/levels';

/** The fight the player just lost: dealt again, it skips the intro and starts. */
let lostKey: string | null = null;

type Fight = Pick<PlayLevel, 'level' | 'kind'>;
const keyOf = (world: number, node: string | null, lvl: Fight) => `${world}:${node ?? ''}:${lvl.level}:${lvl.kind}`;

export function rememberLoss(world: number, node: string | null, lvl: Fight): void {
  lostKey = keyOf(world, node, lvl);
}

export function isReplay(world: number, node: string | null, lvl: Fight): boolean {
  return lostKey === keyOf(world, node, lvl);
}

export function clearReplay(): void {
  lostKey = null;
}
