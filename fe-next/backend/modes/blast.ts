/**
 * Blast — per-player boards cloned from one shared template.
 */

import type { GameModeModule } from './types';
import { initBlastModeState, hashStringToSeed, getOrInitPlayerBoard } from '../modules/blastModeManager';
import { blastCollectionScore } from '@/shared/utils/blastCollectionScore';

export const blastMode: GameModeModule = {
  id: 'blast',

  initRound({ game, gameCode, letterGrid, playerUsernames }) {
    const wave = playerUsernames.length >= 2 ? 3 : 1;
    // Room + this round's letters: one layout for every player, a new one each round.
    const seed = hashStringToSeed(`${gameCode}:${letterGrid.map((row) => row.join('')).join('/')}`);
    game.blastModeState = initBlastModeState(letterGrid, playerUsernames, wave, seed);
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
    if (!state) return {};
    const playerStats = state.playerStats ?? {};
    const collection = Object.fromEntries(
      Object.entries(playerStats).map(([name, s]) => [name, blastCollectionScore({ coins: s.coinsCollected, diamonds: s.diamondsCollected })]),
    );
    return { blastSummary: { playerMoves: state.playerMoves, playerStats, collection } };
  },
};
