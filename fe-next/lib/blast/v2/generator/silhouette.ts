export function columnCountForLevel(n: number) {
  if (n <= 5) return { min: 3, max: 4 };
  if (n <= 20) return { min: 5, max: 6 };
  return { min: 6, max: 7 };
}

export function columnHeightRangeForLevel(n: number) {
  if (n <= 5) return { min: 1, max: 3 };
  if (n <= 20) return { min: 1, max: 5 };
  return { min: 1, max: 7 };
}

export type SilhouetteResult = { ok: boolean; reason?: string };

export function validateSilhouette(heights: number[]): SilhouetteResult {
  if (heights.length === 0) return { ok: false, reason: 'no columns' };
  const max = Math.max(...heights);
  const tall = heights.filter((h) => h >= max - 1).length;
  const short = heights.filter((h) => h < max / 2).length;
  if (tall < 1) return { ok: false, reason: 'no tall column' };
  if (short < 2) return { ok: false, reason: 'too uniform' };
  return { ok: true };
}
