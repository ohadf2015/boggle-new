export interface RivalScore {
  name: string;
  score: number;
}

export type BlastTarget =
  | { kind: 'rival'; name: string; score: number; gap: number }
  | { kind: 'best'; score: number; gap: number }
  | { kind: 'top' };

export type PassedTarget = { kind: 'rival'; name: string; score: number } | { kind: 'best'; score: number };

function candidates(personalBest: number | null, rivals: readonly RivalScore[]): PassedTarget[] {
  // Rivals first so a tie with the personal best still shows a name.
  const list: PassedTarget[] = rivals.map((r) => ({ kind: 'rival', name: r.name, score: r.score }));
  if (personalBest && personalBest > 0) list.push({ kind: 'best', score: personalBest });
  return list;
}

/** The nearest score above the run to chase next. */
export function nextTarget(runScore: number, personalBest: number | null, rivals: readonly RivalScore[]): BlastTarget | null {
  const all = candidates(personalBest, rivals);
  if (all.length === 0) return null;
  let best: PassedTarget | null = null;
  for (const c of all) {
    if (c.score > runScore && (!best || c.score < best.score)) best = c;
  }
  if (!best) return { kind: 'top' };
  return { ...best, gap: best.score - runScore };
}

/** The highest target crossed when the run score moved from `prev` to `next`. */
export function latestPassed(
  prev: number,
  next: number,
  personalBest: number | null,
  rivals: readonly RivalScore[],
): PassedTarget | null {
  if (next <= prev) return null;
  let hit: PassedTarget | null = null;
  for (const c of candidates(personalBest, rivals)) {
    if (c.score >= prev && c.score < next && (!hit || c.score > hit.score)) hit = c;
  }
  return hit;
}
