/**
 * Classic — the plain board game. It offers the lesson words on its board; round events and
 * rush tiles come from its rules row (./rules.ts).
 */

import type { GameModeModule } from './types';

export const classicMode: GameModeModule = {
  id: 'classic',
  lessonWordsOffered: (_game, placedOnBoard) => placedOnBoard,
};
