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

export interface RunSummary {
  levelsCleared: number;
  relics: RelicId[];
  gold: number;
  bestWord: { word: string; pts: number } | null;
}

export function runSummary(
  run: PublicRun | null,
  r: { won: boolean; validWords: string[]; points?: number[]; nextRun?: PublicRun },
): RunSummary {
  const levelsCleared = run ? Math.max(0, run.step - 1 + (r.won ? 1 : 0)) : r.won ? 1 : 0;
  let bestWord: RunSummary['bestWord'] = null;
  r.validWords.forEach((word, i) => {
    const pts = r.points?.[i] ?? 0;
    if (!bestWord || pts > bestWord.pts) bestWord = { word, pts };
  });
  return { levelsCleared, relics: run?.relics ?? [], gold: r.nextRun?.gold ?? run?.gold ?? 0, bestWord };
}
