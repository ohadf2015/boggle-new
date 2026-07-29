/**
 * Compute playback rate and volume for the countdown beep at a given second.
 * Linear ramp: rate 0.7→1.4, volume 0.3→0.9 as seconds go from 10→1.
 * Returns null for values outside [1, 10].
 */
export function getCountdownBeepParams(
  seconds: number
): { rate: number; volume: number } | null {
  if (seconds < 1 || seconds > 10) return null;

  // t=0 at 10s, t=1 at 1s
  const t = (10 - seconds) / 9;

  return {
    rate: 0.7 + t * 0.7,   // 0.7 → 1.4
    volume: 0.3 + t * 0.6, // 0.3 → 0.9
  };
}
