import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PageClient was split (FOUNDATION, 2026-09-26) into a frame plus its state
 * hooks and phase router. Source-contract tests that used to read
 * `PageClient.tsx` read the concatenation of the split files instead — the
 * assertions are unchanged; only where the code lives moved. PageClient comes
 * first so "before X" slices keep their meaning.
 */
export const MP_PAGE_FILES = [
  'PageClient.tsx',
  'useMpPageState.ts',
  'useMpRoomSocket.ts',
  'useMpPageEffects.ts',
  'MpPhaseRouter.tsx',
] as const;

export function readMpPageSource(): string {
  return MP_PAGE_FILES.map((f) => readFileSync(resolve(__dirname, '..', f), 'utf8')).join('\n');
}
