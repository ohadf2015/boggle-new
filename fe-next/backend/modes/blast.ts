/**
 * Blast — per-player boards cloned from one shared template.
 */

import type { GameModeModule } from './types';
import { initBlastModeState, hashStringToSeed, getOrInitPlayerBoard } from '../modules/blastModeManager';

export const blastMode: GameModeModule = {
  id: 'blast',

  initRound({ game, gameCode, letterGrid, playerUsernames }) {
    const wave = playerUsernames.length >= 2 ? 3 : 1;
    // Seeded from the room so every player's template overlay is identical.
    game.blastModeState = initBlastModeState(letterGrid, playerUsernames, wave, hashStringToSeed(gameCode));
  },

  payloadFields(game, { username, resume }) {
    const state = game.blastModeState;
    if (!state) return {};
    if (!resume || !username) {
      return { blastTileOverlay: state.overlay || [], blastSeed: state.seed ?? null, blastWave: state.wave ?? 1 };
    }
    // Each player evolves an INDEPENDENT board: a returning player gets THEIR
    // evolved board (overlay/seed diverge from the template after a regen).
    const board = getOrInitPlayerBoard(state, username);
    return {
      blastTileOverlay: board.overlay || [],
      blastSeed: board.seed ?? null,
      blastWave: state.wave ?? 1,
      blastPlayerMoves: state.playerMoves || {},
      ...(board.grid ? { blastGrid: board.grid } : {}),
      ...(board.tileStates ? { blastTileStates: board.tileStates } : {}),
    };
  },

  resultsSummary(game) {
    const state = game.blastModeState;
    return state ? { blastSummary: { playerMoves: state.playerMoves, playerStats: state.playerStats ?? {} } } : {};
  },
};
