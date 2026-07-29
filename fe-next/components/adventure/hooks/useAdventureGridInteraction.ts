/**
 * useAdventureGridInteraction — Extracted tile/drag/pause handlers and
 * visual effect side-effects (chain burst, explosions, popup queue) from AdventureGame.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { GridTileState } from '@/types/adventure';
import type { ChainBurstConfig, PendingExplosion, ScorePopupData } from '@/components/adventure/effects/AdventureEffectsLayer';

interface UseAdventureGridInteractionParams {
  isPlaying: boolean;
  isPaused: boolean;
  /** @deprecated no longer used to block interaction — kept for interface compat */
  isValidating?: boolean;
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
    setChainBurstConfig: (v: ChainBurstConfig | null) => void;
    addExplosion: (v: PendingExplosion) => void;
    currentPopup: ScorePopupData | null;
    handlePopupComplete: () => void;
  };
}

export function useAdventureGridInteraction(params: UseAdventureGridInteractionParams) {
  const {
    isPlaying, isPaused, selectTile, clearSelection,
    resetOnGameAction, startGame, pauseGame, setIsPaused,
    selectedIndices, currentWord, handleWordSubmit,
    tiles, cascadePhase, lastSubmittedWordRef, gridRef, gridSize, effects,
  } = params;

  // Destructure effects for stable deps — the effects object itself is recreated every render
  const { currentPopup, handlePopupComplete: effectsHandlePopupComplete } = effects;

  // Keep fresh refs for values used in handleDragEnd to avoid stale closures.
  // The global mouseup/touchend listener in useGridGestures registers via useEffect
  // (runs after paint), so between the last tile selection and finger release,
  // the closure can hold stale state. Refs always read the latest value.
  const currentWordRef = useRef(currentWord);
  const selectedIndicesRef = useRef(selectedIndices);
  currentWordRef.current = currentWord;
  selectedIndicesRef.current = selectedIndices;

  const calculateTileCenter = useCallback((row: number, col: number) => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const gridRect = gridRef.current.getBoundingClientRect();
    const tileSize = gridRect.width / gridSize;
    return { x: gridRect.left + col * tileSize + tileSize / 2, y: gridRect.top + row * tileSize + tileSize / 2 };
  }, [gridSize, gridRef]);


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
      if (!isPlaying || isPaused) return;
      selectTile(index); resetOnGameAction();
    }, [isPlaying, isPaused, selectTile, resetOnGameAction]
  );

  const handleDragStart = useCallback(
    (index: number, _tile: GridTileState) => {
      if (!isPlaying || isPaused) return;
      clearSelection(); selectTile(index);
    }, [isPlaying, isPaused, clearSelection, selectTile]
  );

  const handleDragEnter = useCallback(
    (index: number, _tile: GridTileState) => {
      if (!isPlaying || isPaused) return;
      selectTile(index);
    }, [isPlaying, isPaused, selectTile]
  );

  const handleDragEnd = useCallback(() => {
    // Read from refs to avoid stale closures — the global mouseup/touchend
    // listener may fire before React re-renders with the latest state.
    const word = currentWordRef.current;
    const indices = selectedIndicesRef.current;
    // Require at least 2 tiles before attempting submission (matches regular mode).
    // Single-tile taps are handled by the click path, not drag-end.
    if (word && indices.length >= 2) {
      handleWordSubmit(word, indices);
    } else {
      clearSelection();
    }
  }, [handleWordSubmit, clearSelection]);

  // Clear selection when clicking outside the grid or pressing Escape (matches regular mode)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        clearSelection();
      }
    };
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [gridRef, clearSelection]);

  // Popup queue auto-dismiss
  const popupQueueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePopupComplete = useCallback(() => {
    if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); popupQueueTimeoutRef.current = null; }
    effectsHandlePopupComplete();
  }, [effectsHandlePopupComplete]);

  useEffect(() => {
    if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); popupQueueTimeoutRef.current = null; }
    if (currentPopup) {
      popupQueueTimeoutRef.current = setTimeout(() => { effectsHandlePopupComplete(); popupQueueTimeoutRef.current = null; }, 3000);
    }
    return () => { if (popupQueueTimeoutRef.current) { clearTimeout(popupQueueTimeoutRef.current); } };
  }, [currentPopup, effectsHandlePopupComplete]);

  return {
    handlePauseToggle, handleTileSelect, handleDragStart, handleDragEnter, handleDragEnd,
    handlePopupComplete, calculateTileCenter,
  };
}
