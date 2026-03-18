/**
 * useAdventureGridInteraction — Extracted tile/drag/pause handlers and
 * visual effect side-effects (chain burst, explosions, popup queue) from AdventureGame.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { GridTileState } from '@/types/adventure';

interface UseAdventureGridInteractionParams {
  isPlaying: boolean;
  isPaused: boolean;
  isValidating: boolean;
  selectTile: (index: number) => void;
  clearSelection: () => void;
  resetOnGameAction: () => void;
  startGame: () => void;
  pauseGame: () => void;
  setIsPaused: (v: boolean | ((prev: boolean) => boolean)) => void;
  selectedIndices: number[];
  currentWord: string;
  handleWordSubmit: (word: string, indices: number[]) => void;
  // Effects
  tiles: GridTileState[];
  cascadePhase: string;
  lastSubmittedWordRef: React.MutableRefObject<{ word: string; path: { row: number; col: number }[] } | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  gridSize: number;
  effects: {
    setChainBurstConfig: (v: any) => void;
    addExplosion: (v: any) => void;
    currentPopup: any;
    handlePopupComplete: () => void;
  };
}

export function useAdventureGridInteraction(params: UseAdventureGridInteractionParams) {
  const {
    isPlaying, isPaused, isValidating, selectTile, clearSelection,
    resetOnGameAction, startGame, pauseGame, setIsPaused,
    selectedIndices, currentWord, handleWordSubmit,
    tiles, cascadePhase, lastSubmittedWordRef, gridRef, gridSize, effects,
  } = params;

  const calculateTileCenter = useCallback((row: number, col: number) => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const gridRect = gridRef.current.getBoundingClientRect();
    const tileSize = gridRect.width / gridSize;
    return { x: gridRect.left + col * tileSize + tileSize / 2, y: gridRect.top + row * tileSize + tileSize / 2 };
  }, [gridSize, gridRef]);

  // Chain burst effect
  useEffect(() => {
    const chainTiles = tiles.filter(t => t.activationEffect === 'link' && t.activationTimestamp);
    if (chainTiles.length === 0) return;
    effects.setChainBurstConfig({ trigger: true, position: calculateTileCenter(chainTiles[0].row, chainTiles[0].col) });
  }, [tiles, calculateTileCenter, effects]);

  // Word explosion effect
  useEffect(() => {
    if (cascadePhase === 'removing' && lastSubmittedWordRef.current) {
      const { word, path } = lastSubmittedWordRef.current;
      if (path.length >= 3) {
        let cx = 0, cy = 0;
        for (const pos of path) { const c = calculateTileCenter(pos.row, pos.col); cx += c.x; cy += c.y; }
        cx /= path.length; cy /= path.length;
        let intensity: 1 | 2 | 3 | 4 = 1;
        if (word.length >= 10) intensity = 4;
        else if (word.length >= 7) intensity = 3;
        else if (word.length >= 5) intensity = 2;
        effects.addExplosion({ id: Date.now(), position: { x: cx, y: cy }, intensity });
      }
      lastSubmittedWordRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascadePhase, calculateTileCenter, effects]);

  const handlePauseToggle = useCallback(() => {
    if (isPaused) { startGame(); setIsPaused(false); }
    else { pauseGame(); setIsPaused(true); }
  }, [isPaused, startGame, pauseGame, setIsPaused]);

  const handleTileSelect = useCallback(
    (index: number, _tile: GridTileState) => {
      if (!isPlaying || isPaused || isValidating) return;
      selectTile(index); resetOnGameAction();
    }, [isPlaying, isPaused, isValidating, selectTile, resetOnGameAction]
  );

  const handleDragStart = useCallback(
    (index: number, _tile: GridTileState) => {
      if (!isPlaying || isPaused || isValidating) return;
      clearSelection(); selectTile(index);
    }, [isPlaying, isPaused, isValidating, clearSelection, selectTile]
  );

  const handleDragEnter = useCallback(
    (index: number, _tile: GridTileState) => {
      if (!isPlaying || isPaused || isValidating) return;
      selectTile(index);
    }, [isPlaying, isPaused, isValidating, selectTile]
  );

  // Refs for latest selection state — avoids stale closure in handleDragEnd
  const selectedIndicesRef = useRef(selectedIndices);
  const currentWordRef = useRef(currentWord);
  useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);

  const handleDragEnd = useCallback(() => {
    const word = currentWordRef.current;
    const indices = selectedIndicesRef.current;
    if (!word || indices.length === 0) return;
    handleWordSubmit(word, indices);
  }, [handleWordSubmit]);

  // Popup queue auto-dismiss
  const popupQueueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePopupComplete = useCallback(() => {
    if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); popupQueueTimeoutRef.current = null; }
    effects.handlePopupComplete();
  }, [effects]);

  useEffect(() => {
    if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); popupQueueTimeoutRef.current = null; }
    if (effects.currentPopup) {
      popupQueueTimeoutRef.current = setTimeout(() => { effects.handlePopupComplete(); popupQueueTimeoutRef.current = null; }, 3000);
    }
    return () => { if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); } };
  }, [effects]);

  return {
    handlePauseToggle, handleTileSelect, handleDragStart, handleDragEnter, handleDragEnd,
    handlePopupComplete, calculateTileCenter,
  };
}
