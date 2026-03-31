// ─── Blast Engine Multiplayer Bridge ──────────────────────────────────
// Syncs swap events, tile states, and scores via Socket.IO.
// Uses the existing wordAccepted event with blast data merged in.

'use client';

import { useCallback, useMemo, useRef } from 'react';
import {
  useBlastTileOverlay,
  useBlastSeed,
  useLetterGrid,
} from '@/hooks/gameState/selectors';
import type { BlastTileState, BlastTileType } from '@/shared/types/blast';
import { createSeededRandom } from '@/components/blast/utils/blastLetterGenerator';
import { useSocket } from '@/utils/SocketContext';
import type { Language } from '@/shared/types/game';

interface BlastMPConfig {
  gridSize: number;
  language: Language;
  enabled: boolean;
}

interface BlastMPState {
  initialTileStates: BlastTileState[][] | null;
  initialLetterGrid: string[][] | null;
  seed: number | null;
  sendSwap: (word: string) => void;
  isConnected: boolean;
}

const FROST_INNER_CANDIDATES: BlastTileType[] = ['bomb', 'lightning', 'prism', 'rainbow'];

export function useBlastEngineMultiplayer(config: BlastMPConfig): BlastMPState {
  const overlay = useBlastTileOverlay();
  const blastSeed = useBlastSeed();
  const serverGrid = useLetterGrid();
  const seedRef = useRef<number | null>(null);

  // ─── Build initial tile states from server overlay ──────────────

  const initialTileStates = useMemo((): BlastTileState[][] | null => {
    if (!config.enabled || !overlay || overlay.length === 0) return null;

    const gridSize = config.gridSize;
    const seed = blastSeed ?? Date.now();
    seedRef.current = seed;

    const states: BlastTileState[][] = [];
    for (let r = 0; r < gridSize; r++) {
      const row: BlastTileState[] = [];
      for (let c = 0; c < gridSize; c++) {
        row.push({
          uid: `emp-${r}-${c}`,
          row: r,
          col: c,
          type: 'standard',
          isCleared: false,
          activationEffect: null,
          hitsRemaining: 0,
        });
      }
      states.push(row);
    }

    const rng = createSeededRandom(seed);
    for (const tile of overlay) {
      if (tile.row < gridSize && tile.col < gridSize) {
        const state = states[tile.row][tile.col];
        state.type = tile.type as BlastTileType;
        if (tile.type === 'ice') state.hitsRemaining = 1;
        if (tile.type === 'frozen') {
          state.hitsRemaining = 2;
          state.innerType = FROST_INNER_CANDIDATES[Math.floor(rng() * FROST_INNER_CANDIDATES.length)];
        }
        if (tile.type === 'gem') state.hitsRemaining = 3;
      }
    }

    return states;
  }, [config.enabled, config.gridSize, overlay, blastSeed]);

  // ─── Initial letter grid from server ────────────────────────────

  const initialLetterGrid = useMemo((): string[][] | null => {
    if (!config.enabled || !serverGrid || serverGrid.length === 0) return null;
    return serverGrid;
  }, [config.enabled, serverGrid]);

  // ─── Send swap to server ────────────────────────────────────────

  const socketCtx = useSocket();

  const sendSwap = useCallback(
    (word: string) => {
      if (!config.enabled || !socketCtx.socket) return;
      socketCtx.socket.emit('submitWord', {
        word,
        comboType: null,
      });
    },
    [config.enabled, socketCtx.socket],
  );

  return {
    initialTileStates,
    initialLetterGrid,
    seed: seedRef.current,
    sendSwap,
    isConnected: config.enabled && !!socketCtx.socket?.connected,
  };
}
