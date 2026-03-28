/**
 * useAdventureKeyboardShortcuts
 *
 * Keyboard shortcuts for adventure mode power-ups and controls.
 * H=Hint, F=Freeze, S=Shuffle, D=Detonate, P/Space=Pause
 */

import { useEffect } from 'react';

interface UseAdventureKeyboardShortcutsOptions {
  entryPhase: string;
  showLevelComplete: boolean;
  hasHintsAvailable: boolean;
  onHintClick: () => void;
  freezeUsed: boolean;
  timeFreezeSeconds: number;
  activateFreeze: (seconds: number) => void;
  shufflesRemaining: number;
  shuffleTiles: () => void;
  canDetonateWords: boolean;
  setDetonateActive: React.Dispatch<React.SetStateAction<boolean>>;
  handlePauseToggle: () => void;
}

export function useAdventureKeyboardShortcuts({
  entryPhase,
  showLevelComplete,
  hasHintsAvailable,
  onHintClick,
  freezeUsed,
  timeFreezeSeconds,
  activateFreeze,
  shufflesRemaining,
  shuffleTiles,
  canDetonateWords,
  setDetonateActive,
  handlePauseToggle,
}: UseAdventureKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (entryPhase !== 'playing' || showLevelComplete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'h':
          if (hasHintsAvailable) onHintClick();
          break;
        case 'f':
          if (timeFreezeSeconds > 0 && !freezeUsed)
            activateFreeze(timeFreezeSeconds);
          break;
        case 's':
          if (shufflesRemaining > 0) shuffleTiles();
          break;
        case 'd':
          if (canDetonateWords) setDetonateActive(prev => !prev);
          break;
        case 'p':
        case ' ':
          e.preventDefault();
          handlePauseToggle();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entryPhase, showLevelComplete, hasHintsAvailable, onHintClick, freezeUsed, activateFreeze, timeFreezeSeconds, canDetonateWords, shufflesRemaining, shuffleTiles, setDetonateActive, handlePauseToggle]);
}
