export const RANKED_TIERS = [
  { id: 'bronze', name: 'Bronze', minElo: 0, maxElo: 999, color: '#CD7F32', icon: '🥉' },
  { id: 'silver', name: 'Silver', minElo: 1000, maxElo: 1499, color: '#C0C0C0', icon: '🥈' },
  { id: 'gold', name: 'Gold', minElo: 1500, maxElo: 1999, color: '#FFD700', icon: '🥇' },
  { id: 'platinum', name: 'Platinum', minElo: 2000, maxElo: 2499, color: '#00FFFF', icon: '💎' },
  { id: 'diamond', name: 'Diamond', minElo: 2500, maxElo: Infinity, color: '#FF1493', icon: '👑' },
] as const;

export type RankedTierId = (typeof RANKED_TIERS)[number]['id'];

export type RankedTier = (typeof RANKED_TIERS)[number];

export function getTierFromElo(elo: number): RankedTier {
  return RANKED_TIERS.find((t) => elo >= t.minElo && elo <= t.maxElo) || RANKED_TIERS[0];
}

export function getTierProgress(elo: number): number {
  const tier = getTierFromElo(elo);
  const range = tier.maxElo === Infinity ? 500 : tier.maxElo - tier.minElo;
  return Math.min(1, (elo - tier.minElo) / range);
}

export function getNextTier(elo: number): RankedTier | null {
  const idx = RANKED_TIERS.findIndex((t) => elo >= t.minElo && elo <= t.maxElo);
  return idx < RANKED_TIERS.length - 1 ? RANKED_TIERS[idx + 1] : null;
}

export function getSeasonNumber(): number {
  const d = new Date();
  return (d.getFullYear() - 2026) * 4 + Math.floor(d.getMonth() / 3) + 1;
}

export function getSeasonEndDate(): Date {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  const endMonth = (q + 1) * 3;
  return new Date(d.getFullYear(), endMonth, 0);
}

export function getDaysUntilSeasonEnd(): number {
  return Math.max(0, Math.ceil((getSeasonEndDate().getTime() - Date.now()) / 86400000));
}
