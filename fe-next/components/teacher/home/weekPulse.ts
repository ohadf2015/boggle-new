export interface ClassesPlayedShare {
  played: number;
  total: number;
  fraction: number;
}

/** "Classes that played" as a meter: clamped, so a deleted class can never push it past full. */
export function classesPlayedShare(active: number, total: number): ClassesPlayedShare {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const played = Number.isFinite(active) && active > 0 ? Math.min(Math.floor(active), safeTotal) : 0;
  return { played, total: safeTotal, fraction: safeTotal === 0 ? 0 : played / safeTotal };
}
