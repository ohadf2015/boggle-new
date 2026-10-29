import { haptics } from '@/utils/haptics/HapticsManager';

export type LiveHapticKind = 'valid' | 'big';

const PULSE_MS: Record<LiveHapticKind, number> = { valid: 10, big: 30 };

export function liveHapticKind(points: number, roundBest: number): LiveHapticKind | null {
  if (points <= 0) return null;
  return points > roundBest ? 'big' : 'valid';
}

export function pulseLive(kind: LiveHapticKind, reducedEffects: boolean): boolean {
  if (reducedEffects || typeof navigator === 'undefined' || !('vibrate' in navigator)) return false;
  if (!haptics.isEnabled()) return false;
  navigator.vibrate(PULSE_MS[kind]);
  return true;
}
