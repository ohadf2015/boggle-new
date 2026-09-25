/**
 * Classic — the plain board game. Every hook is the default; round events and
 * rush tiles come from its rules row (./rules.ts).
 */

import type { GameModeModule } from './types';

export const classicMode: GameModeModule = { id: 'classic' };
