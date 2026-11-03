import { scoreFromHeightM } from '../scoring';
import type { GhostRival } from './types';

const POINTS_PER_M = scoreFromHeightM(1);

export function scoreToHeightM(score: number): number {
  return Math.max(0, score) / POINTS_PER_M;
}

export function pickRivals(
  board: { name: string; score: number; id: string }[],
  currentPeakM: number,
  max = 4,
): GhostRival[] {
  const byId = new Map<string, GhostRival>();
  for (const row of board) {
    if (!(row.score > 0)) continue;
    const peakM = scoreToHeightM(row.score);
    const existing = byId.get(row.id);
    if (!existing || peakM > existing.peakM) byId.set(row.id, { id: row.id, name: row.name, peakM });
  }

  const all = [...byId.values()];
  const above = all.filter((r) => r.peakM > currentPeakM).sort((a, b) => a.peakM - b.peakM);
  const below = all.filter((r) => r.peakM <= currentPeakM).sort((a, b) => b.peakM - a.peakM);

  const belowPick = below.length > 0 && max > 1 ? below.slice(0, 1) : [];
  const abovePick = above.slice(0, Math.max(0, max - belowPick.length));
  const picks = abovePick.length === 0 && max > 0 ? below.slice(0, 1) : [...abovePick, ...belowPick];

  return picks.sort((a, b) => a.peakM - b.peakM);
}

export function crossedRivals(prevM: number, nextM: number, rivals: GhostRival[]): GhostRival[] {
  return rivals.filter((r) => r.peakM > prevM && r.peakM <= nextM);
}
