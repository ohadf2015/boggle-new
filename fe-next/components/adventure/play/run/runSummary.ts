/** Pure end-of-level maths for the loot / run-over / run-complete screens. */
import { POTION_IDS, type PotionId, type RelicId } from '@/lib/adventure/play/relics';
import type { PublicRun } from '@/lib/adventure/play/runToken';

export type ResultScreen = 'cleared' | 'over' | 'complete';

/**
 * Order matters: the route sets runOver on a boss WIN too (no next link), and on
 * a win where the player also died (no next link either — the run is gone).
 */
export function resultScreen(r: { won: boolean; runOver?: boolean; runComplete?: boolean }): ResultScreen {
  if (r.runComplete) return 'complete';
  if (!r.won || r.runOver) return 'over';
  return 'cleared';
}

export interface LevelLoot { gold: number; potions: PotionId[]; items: string[]; skin: boolean }

export function levelLoot(
  prev: PublicRun | null,
  r: { nextRun?: PublicRun; rewards: string[] },
  skinItem?: string,
): LevelLoot {
  const next = r.nextRun;
  const gold = next ? Math.max(0, next.gold - (prev?.gold ?? 0)) : 0;
  const potions: PotionId[] = [];
  if (next) {
    for (const id of POTION_IDS) {
      const gained = (next.potions?.[id] ?? 0) - (prev?.potions?.[id] ?? 0);
      for (let i = 0; i < gained; i++) potions.push(id);
    }
  }
  return {
    gold,
    potions,
    items: r.rewards.filter((id) => id !== skinItem),
    skin: !!skinItem && r.rewards.includes(skinItem),
  };
}

/**
 * The step a RECAP screen should read the run's banked words at. `recordRunWords`
 * banks the level just won into the slot for `step - 1`, so a win must ask for
 * one step further or the relic shelf silently drops the node you just played;
 * a death banked nothing on its node, so it asks for the step as it stands.
 */
export const resultRunStep = (run: PublicRun | null, won: boolean): number =>
  Math.max(1, (run?.step ?? 1) + (won ? 1 : 0));

export interface RunSummary {
  levelsCleared: number;
  relics: RelicId[];
  gold: number;
  bestWord: { word: string; pts: number } | null;
}

export function runSummary(
  run: PublicRun | null,
  r: { won: boolean; validWords: string[]; points?: number[]; nextRun?: PublicRun; purseCoins?: number },
): RunSummary {
  const levelsCleared = run ? Math.max(0, run.step - 1 + (r.won ? 1 : 0)) : r.won ? 1 : 0;
  let bestWord: RunSummary['bestWord'] = null;
  r.validWords.forEach((word, i) => {
    const pts = r.points?.[i] ?? 0;
    if (!bestWord || pts > bestWord.pts) bestWord = { word, pts };
  });
  // When there's a nextRun, use its gold. Otherwise, use purseCoins (the server-credited amount
  // from run-over), falling back to the current run's gold. This ensures that on Redis failure
  // (purseCoins = 0), we display 0 not the client's in-run gold amount.
  const gold = r.nextRun?.gold ?? (typeof r.purseCoins === 'number' ? r.purseCoins : run?.gold ?? 0);
  return { levelsCleared, relics: run?.relics ?? [], gold, bestWord };
}

/**
 * Words the WHOLE run found, for the ledger's words row.
 *
 * `recordRunWords` only banks a level the run CLEARED, so a death banked
 * nothing on the node it died on — and the recap scored that run at zero words
 * although the player had just found some. A win is already inside the banked
 * slots; only a loss adds the node it fell on.
 */
export function runWordCount(
  stored: readonly string[][],
  r: { won: boolean; validWords: readonly string[] },
): number {
  const banked = stored.reduce((n, level) => n + level.length, 0);
  return banked + (r.won ? 0 : r.validWords.length);
}
