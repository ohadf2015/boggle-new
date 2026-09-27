import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PlayerView was split (FOUNDATION, 2026-09-26) into a phase router plus
 * `usePlayerPhase` / `usePendingGameStart` / `usePlayerRoundTelemetry`.
 * Source-contract tests read the concatenation (router first, so "before X"
 * slices keep their meaning) — assertions unchanged, only the location moved.
 */
export const PLAYER_VIEW_FILES = [
  'PlayerView.tsx',
  'hooks/usePlayerPhase.ts',
  'hooks/usePendingGameStart.ts',
  'hooks/usePlayerRoundTelemetry.ts',
] as const;

export function readPlayerViewSource(): string {
  return PLAYER_VIEW_FILES.map((f) => readFileSync(resolve(__dirname, '..', f), 'utf8')).join('\n');
}
