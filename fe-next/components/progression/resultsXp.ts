import { calculateGameXp } from '@/backend/modules/xpManager';
import type { ResultsXp } from './NextUnlockTeaser';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Server XP from a game-completion response (record-game, quick-play, blast). */
export function xpFromResponse(data: unknown): ResultsXp | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const gained = num(d.xpEarned) ?? num(d.xpAwarded);
  if (gained == null) return null;
  return { gained, total: num(d.newTotalXp) ?? num(d.totalXp) };
}

/** What a solo game would have earned a signed-in player, shown to guests as "not saved". */
export function guestXpEstimate(score: number, achievementCount = 0): ResultsXp {
  return { gained: calculateGameXp({ score, achievementCount, playerCount: 1 }).totalXp };
}
