import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** usePlayerGameEvents is split by event group; source pins read the files together, hook first. */
export const PLAYER_GAME_EVENT_FILES = [
  'usePlayerGameEvents.ts',
  'playerRoundLifecycle.ts',
  'playerResultsHandlers.ts',
  'usePlayerRoundFeedEvents.ts',
  'playerGameEventTypes.ts',
] as const;

export function readPlayerGameEventsSource(): string {
  return PLAYER_GAME_EVENT_FILES.map((f) => readFileSync(resolve(__dirname, '..', f), 'utf8')).join('\n');
}
