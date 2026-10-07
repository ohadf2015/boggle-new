import { demoBoard, findWordOnBoard, type CefrLevel } from './eslCefrDemo';

/** Tile path spelling the first target the player has not found yet, or null when none is left. */
export function nextHintPath(level: CefrLevel, found: readonly string[]): number[] | null {
  const { letters, targets } = demoBoard(level);
  const done = new Set(found.map((w) => w.toUpperCase()));
  for (const target of targets) {
    if (done.has(target)) continue;
    const path = findWordOnBoard(letters, target);
    if (path) return path;
  }
  return null;
}
