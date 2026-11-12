import { levelBeforeGrant } from '@/shared/xp/levelCurve';
import { calculateGameXp, type XpBreakdown } from './xpManager';

export interface XpGrantResult {
  xpEarned: number;
  newTotalXp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}

interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export function levelChangeFromRow(row: Record<string, unknown>): XpGrantResult {
  const newTotalXp = Number(row.new_total_xp) || 0;
  const xpEarned = Number(row.xp_granted) || 0;
  const newLevel = Number(row.new_level) || 1;
  const oldLevel = Math.min(levelBeforeGrant(newTotalXp, xpEarned), newLevel);
  return { xpEarned, newTotalXp, oldLevel, newLevel, leveledUp: newLevel > oldLevel };
}

/** The game formula's parts are pre-cap; shown next to the granted total they must add up to it. */
export function scaleBreakdown(breakdown: XpBreakdown, granted: number): XpBreakdown {
  const keys = Object.keys(breakdown) as (keyof XpBreakdown)[];
  const raw = keys.reduce((sum, k) => sum + (breakdown[k] || 0), 0);
  const target = Math.max(0, Math.round(granted));
  const scaled = { ...breakdown };
  if (raw <= 0) return scaled;
  for (const k of keys) scaled[k] = Math.floor(((breakdown[k] || 0) * target) / raw);
  const largest = keys.reduce((a, b) => (breakdown[b] > breakdown[a] ? b : a));
  scaled[largest] += target - keys.reduce((sum, k) => sum + scaled[k], 0);
  return scaled;
}

export interface LevelUp {
  oldLevel: number;
  newLevel: number;
}

/** The `levelUp` field responses carry; the client hands it to publishLevelUp. */
export function levelUpOf(grant: XpGrantResult | null | undefined): LevelUp | null {
  return grant?.leveledUp ? { oldLevel: grant.oldLevel, newLevel: grant.newLevel } : null;
}

/** Concurrent grants land in any order, so the combined jump is the lowest start to the highest end. */
export function mergeLevelUps(a: LevelUp | null | undefined, b: LevelUp | null | undefined): LevelUp | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return { oldLevel: Math.min(a.oldLevel, b.oldLevel), newLevel: Math.max(a.newLevel, b.newLevel) };
}

/** increment_player_xp applies prestige, diminishing returns and the daily cap; this reports what it granted. */
export async function grantPlayerXp(client: RpcClient, userId: string, amount: number): Promise<XpGrantResult | null> {
  if (!(amount > 0)) return null;
  const { data, error } = await client.rpc('increment_player_xp', { p_player_id: userId, p_xp_amount: Math.round(amount) });
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  if (error || !row) {
    if (error) console.error('[xpGrant] increment_player_xp failed:', error);
    return null;
  }
  return levelChangeFromRow(row);
}

export async function grantSoloGameXp(
  client: RpcClient,
  userId: string,
  game: { score: number; achievementCount?: number },
): Promise<(XpGrantResult & { xpBreakdown: XpBreakdown }) | null> {
  const { totalXp, breakdown } = calculateGameXp({
    score: game.score,
    isWinner: false,
    achievementCount: game.achievementCount ?? 0,
    playerCount: 1,
  });
  const granted = await grantPlayerXp(client, userId, totalXp);
  return granted ? { ...granted, xpBreakdown: scaleBreakdown(breakdown, granted.xpEarned) } : null;
}
