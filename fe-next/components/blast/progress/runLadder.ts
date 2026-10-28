import type { BlastWaveTheme } from './waveTheme';

export interface LadderStep {
  wave: number;
  theme: BlastWaveTheme;
  current: boolean;
  /** Reaching this wave beats the player's furthest run. */
  newRecord: boolean;
}

export function buildRunLadder({
  currentWave,
  count,
  recordWave,
  themeFor,
}: {
  currentWave: number;
  count: number;
  recordWave: number;
  themeFor: (wave: number) => BlastWaveTheme;
}): LadderStep[] {
  return Array.from({ length: count }, (_, i) => {
    const wave = currentWave + i;
    return {
      wave,
      theme: themeFor(wave),
      current: i === 0,
      newRecord: recordWave > 0 && wave === recordWave + 1,
    };
  });
}
