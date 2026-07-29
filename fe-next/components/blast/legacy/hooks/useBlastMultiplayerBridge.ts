/**
 * useBlastMultiplayerBridge
 * Converts Zustand multiplayer state (blastTileOverlay, blastSeed, gameLanguage)
 * into props compatible with BlastGame in multiplayer mode.
 */

import { useMemo } from 'react';
import { useBlastTileOverlay, useBlastSeed, useGameLanguage } from '@/hooks/gameState/store';
import type { LetterGrid } from '@/shared/types/game';
import type { BlastTileState } from '@/shared/types/blast';
import type { BlastGameConfig } from '../types';
import { overlayToTileStates } from '../utils/blastOverlayToTileStates';

interface UseBlastMultiplayerBridgeOptions {
  letterGrid: LetterGrid | null;
  gridSize: number;
}

interface UseBlastMultiplayerBridgeReturn {
  config: BlastGameConfig;
  initialTileStates: BlastTileState[][] | null;
  blastSeed: number | null;
  /** Server-authoritative letter grid — fed to the engine so client board == server board. */
  serverGrid: LetterGrid | null;
}

export function useBlastMultiplayerBridge({
  letterGrid,
  gridSize,
}: UseBlastMultiplayerBridgeOptions): UseBlastMultiplayerBridgeReturn {
  const blastTileOverlay = useBlastTileOverlay();
  const blastSeed = useBlastSeed();
  const gameLanguage = useGameLanguage();

  const config: BlastGameConfig = useMemo(() => ({
    gridSize,
    specialTileChance: 0.15,
    language: gameLanguage ?? 'en',
    difficulty: 'medium',
    boardClearMode: 'shrink' as const, // tiles stay missing like SP — no auto-refill
  }), [gridSize, gameLanguage]);

  const initialTileStates = useMemo(() => {
    if (!letterGrid) return null;
    return overlayToTileStates(blastTileOverlay, gridSize, blastSeed);
  }, [blastTileOverlay, gridSize, letterGrid, blastSeed]);

  return { config, initialTileStates, blastSeed, serverGrid: letterGrid };
}
