export const COMBO_AMBIENT_THRESHOLD = 4;

export function shouldFireComboAmbient(streakLevel: number): boolean {
  return streakLevel >= COMBO_AMBIENT_THRESHOLD;
}

export function getComboAmbientTier(streakLevel: number): 1 | 2 | 3 | null {
  if (streakLevel < COMBO_AMBIENT_THRESHOLD) return null;
  if (streakLevel >= 10) return 3;
  if (streakLevel >= 7) return 2;
  return 1;
}
