import { isCombatKind, type PlayLevel } from '@/lib/adventure/play/levels';
import { BASE_HP, type PotionId, type RelicId } from '@/lib/adventure/play/relics';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunMap } from '@/lib/adventure/play/runMap';
import type { initCombat } from '@/lib/adventure/play/combat';
import { writeRun, writeCarry } from './runStorage';
import type { RunResult, EcosystemGains } from './runTypes';

export const NO_POTIONS: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };

export function potionsLeftOf(run: PublicRun | null, used: Record<PotionId, number>): Record<PotionId, number> {
  const out = { ...NO_POTIONS };
  for (const id of Object.keys(out) as PotionId[]) out[id] = Math.max(0, (run?.potions?.[id] ?? 0) - used[id]);
  return out;
}

/** What this node moved elsewhere in the game — zeroed until the server answers. */
export function ecosystemOf(result: RunResult | null): EcosystemGains | null {
  if (!result) return null;
  return {
    xpGained: result.xpGained ?? 0,
    coinsGained: result.coinsGained ?? 0,
    leaderboardPoints: result.leaderboardPoints ?? 0,
    achievementsUnlocked: result.achievementsUnlocked ?? [],
    ...(result.levelUp ? { levelUp: result.levelUp } : {}),
    ...(result.streak ? { streak: result.streak } : {}),
  };
}

export function reachableNodes(map: RunMap | null, reachable: string[]) {
  return map ? reachable.map((id) => map.nodes.find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n) : [];
}

/**
 * Every node fights back: elite/boss with their full scripts, an ordinary
 * fight with a slow, non-lethal rival whose HP is the top-star bar it draws.
 */
export function combatSetupOf(
  lvl: PlayLevel, world: number, run: PublicRun | null, relics: RelicId[], size: number, seed: string,
): Parameters<typeof initCombat>[0] {
  const combatLvl = isCombatKind(lvl.kind);
  return {
    enemyId: combatLvl ? lvl.enemyId ?? `${lvl.kind}-w${world}` : `foe-w${world}`,
    world,
    enemyHp: combatLvl ? lvl.bossHp : Math.max(1, lvl.stars[2]),
    hp: run?.hp ?? BASE_HP,
    maxHp: run?.maxHp ?? BASE_HP,
    relics,
    size,
    seed,
  };
}

/** The run as the screen should draw it: the minted trophy already in the relic bar. */
export function runWithTrophy(run: PublicRun | null, trophy: RelicId | null): PublicRun | null {
  return trophy && run && !run.relics.includes(trophy) ? { ...run, relics: [...run.relics, trophy] } : run;
}

/** Hunt levels: a hint must point at a hidden target first — a side word does not move the goal. */
export function nextHintWord(targets: string[] | undefined, hints: string[], found: string[], given: string[]): string | null {
  return [...(targets ?? []), ...hints].find((h) => !found.includes(h) && !given.includes(h)) ?? null;
}

/**
 * Store what /complete settled and return the run token every later call must
 * speak ('' once the run is over).
 */
export function settleCompletedRun(world: number, data: RunResult, liveToken: string): string {
  if (data.nextRunToken && data.nextRun) {
    writeRun(world, { runToken: data.nextRunToken, run: { ...data.nextRun, offer: data.offer ?? data.nextRun.offer } });
    // The run moved on: an in-place map → node → map flow that kept the old
    // token replayed the old run and silently dropped this node's gold, offer and progress.
    return data.nextRunToken;
  }
  // Run over (died or lost): the token is dead, or the next "open the map" would
  // resume a run the server refuses. It stays as the carry for the next run's relics.
  writeCarry(data.carryToken || liveToken || null);
  writeRun(world, null);
  return '';
}
