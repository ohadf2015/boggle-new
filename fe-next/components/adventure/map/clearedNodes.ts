/**
 * Which map nodes of the current run have actually been played out.
 *
 * The run token cannot answer this: `/start` steps the run ONTO a fight before
 * the board is played, so a run standing on a fight looks the same whether the
 * player is mid-fight, bailed out, or cleared it. The map needs the difference
 * — an uncleared fight underfoot must read "resume", not "walk on" — so the
 * client remembers the nodes it saw a result for, per world, in localStorage
 * (same lifetime as the run itself).
 */
const key = (world: number) => `adv-cleared-w${world}`;

export function readCleared(world: number): string[] {
  try {
    const raw = localStorage.getItem(key(world));
    const v: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function recordCleared(world: number, nodeId: string): void {
  try {
    const list = readCleared(world);
    if (list.includes(nodeId)) return;
    localStorage.setItem(key(world), JSON.stringify([...list, nodeId]));
  } catch {
    /* storage unavailable — the map just offers to replay the node underfoot */
  }
}

/**
 * Is this the FIRST node of a brand-new run? Only then may the history be wiped
 * (node ids repeat from run to run). A null run means the server has not spoken
 * yet — never "fresh", or every mount would erase a run in progress.
 */
export const isFreshRun = (run: { path?: readonly string[] } | null | undefined): boolean =>
  !!run && Array.isArray(run.path) && run.path.length === 0;

/** A fresh run starts with an empty history (node ids repeat across runs). */
export function clearClearedNodes(world: number): void {
  try {
    localStorage.removeItem(key(world));
  } catch {
    /* storage unavailable */
  }
}
