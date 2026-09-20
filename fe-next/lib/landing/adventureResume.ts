/**
 * "Continue your run" for the homepage adventure cube.
 *
 * The run lives in sessionStorage (`adv-run-w<N>`, see
 * components/adventure/play/runStorage.ts) — the SAME truth the world view's
 * RunBanner reads, not a second store. This module is the pure choice: given
 * the stored runs, which one (if any) is worth offering to resume.
 *
 * Kept free of `sessionStorage` on purpose: the homepage renders on the server
 * and hydrates before any storage read, so the hook does the reading in an
 * effect and the cube paints its resting state first (Class 1 in
 * .claude/rules/60-recurring-pitfalls.md — never render an optimistic state a
 * later source can flip, and never reflow the bento when it resolves).
 */
import { MAP_ROWS } from '@/lib/adventure/play/runMap';
import type { RelicId } from '@/lib/adventure/play/relics';
import type { PublicRun } from '@/lib/adventure/play/runToken';

export interface StoredWorldRun {
  world: number;
  run: PublicRun;
}

export interface AdventureResume {
  world: number;
  /** 1-based depth into the 8-row act map. */
  step: number;
  hp: number;
  maxHp: number;
  relics: RelicId[];
  gold: number;
}

const clamp = (n: unknown, lo: number, hi: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : lo;

/**
 * The run the cube offers, or null. A run only counts once it has left its
 * first node (same `step > 1` rule RunBanner uses) and still has hearts —
 * offering to "continue" a dead or untouched run is a lie.
 */
export function pickAdventureResume(stored: StoredWorldRun[]): AdventureResume | null {
  let best: AdventureResume | null = null;
  for (const entry of stored) {
    const run = entry?.run;
    if (!run || typeof run.step !== 'number') continue;
    const maxHp = clamp(run.maxHp, 1, 99);
    const hp = clamp(run.hp, 0, maxHp);
    const step = clamp(run.step, 1, MAP_ROWS);
    if (step <= 1 || hp <= 0) continue;
    const cand: AdventureResume = {
      world: entry.world,
      step,
      hp,
      maxHp,
      relics: Array.isArray(run.relics) ? run.relics : [],
      gold: clamp(run.gold, 0, Number.MAX_SAFE_INTEGER),
    };
    if (!best || cand.step > best.step || (cand.step === best.step && cand.world > best.world)) best = cand;
  }
  return best;
}
