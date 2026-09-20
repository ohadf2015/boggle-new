/**
 * Run-wide relic accounting: what each owned relic has actually contributed
 * across EVERY level of this run, not just the board on screen.
 *
 * Same leave-one-out replay `relicContributions` does per level — score the run
 * with everything owned, minus the run scored without this one relic — so the
 * number on the tooltip is the one the server credited, never an estimate.
 */
import { isRelicId, RELICS, type RelicId } from '@/lib/adventure/play/relics';
import type { LevelWords } from '@/lib/adventure/play/relicStack';
import { scoreWords } from '@/lib/adventure/play/scoreRun';
import { readRunWords } from '../runStorage';
import { runLevels } from './offerValue';

/**
 * The words this run has already banked. `recordRunWords` writes one slot per
 * CLEARED STEP, so the slice is keyed by step — never by the level slot. Under
 * the branching map several nodes play the same level (rows 4-7 are all level
 * 6), so slicing by level silently drops cleared nodes from the run total.
 */
export function clearedRunWords(world: number, step: number): string[][] {
  return readRunWords(world).slice(0, Math.max(0, Math.floor(step) - 1));
}

/**
 * The tooltip context for a screen with NO board of its own — the act map, where
 * you sit between fights and actually read your relics. It replays the run out
 * of storage, so the map's rail shows the same "this run" number the play HUD
 * does instead of dropping the line entirely.
 */
export function runStackCtx(
  world: number,
  step: number,
  relics: readonly RelicId[],
): { levels: LevelWords[]; owned: RelicId[] } {
  return { levels: runLevels(world, clearedRunWords(world, step)), owned: [...relics] };
}

const isScoring = (id: RelicId) => RELICS[id].effect.type !== 'stat';

const total = (levels: readonly LevelWords[], relics: readonly RelicId[]) =>
  levels.reduce((s, l) => s + scoreWords(l.words, { relics, kind: l.kind }).score, 0);

/**
 * Points each owned SCORING relic added over the whole run. Stat relics
 * (hearts, hints, shields) have no points share and are omitted.
 */
export function relicRunContributions(
  levels: readonly LevelWords[],
  relics: readonly RelicId[],
): Partial<Record<RelicId, number>> {
  const owned = [...new Set(relics)].filter(isRelicId);
  const full = total(levels, owned);
  const out: Partial<Record<RelicId, number>> = {};
  for (const id of owned) {
    if (!isScoring(id)) continue;
    out[id] = full - total(levels, owned.filter((r) => r !== id));
  }
  return out;
}
