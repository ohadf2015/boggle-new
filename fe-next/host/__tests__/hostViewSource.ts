import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * HostView was split (FOUNDATION, 2026-09-26) into a phase router plus
 * `useHostPhase` / `useHostRoundLifecycle`. Source-contract tests read the
 * concatenation — assertions unchanged, only where the code lives moved.
 */
export const HOST_VIEW_FILES = ['HostView.tsx', 'hooks/useHostPhase.ts', 'hooks/useHostRoundLifecycle.ts', 'hooks/useHostPendingGameStart.ts'] as const;

export function readHostViewSource(): string {
  return HOST_VIEW_FILES.map((f) => readFileSync(resolve(__dirname, '..', f), 'utf8')).join('\n');
}
