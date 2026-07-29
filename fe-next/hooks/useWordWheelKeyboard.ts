import { useEffect, useRef } from 'react';

interface BuiltLetter { letter: string; wheelIndex: number }

interface UseWordWheelKeyboardParams {
  centerLetter: string;
  outerLetters: string[];
  usedIndices: Set<number>;
  handleSubmit: () => void;
  handleClear: () => void;
  setBuiltLetters: React.Dispatch<React.SetStateAction<BuiltLetter[]>>;
  gameOver: boolean;
  playTileSelectSound: () => void;
  playButtonClickSound: () => void;
}

/**
 * Attaches a keydown listener for the Word Wheel game.
 * Letters → add to built word, Enter → submit, Backspace → remove last, Escape → clear.
 */
export function useWordWheelKeyboard({
  centerLetter, outerLetters, usedIndices,
  handleSubmit, handleClear, setBuiltLetters,
  gameOver, playTileSelectSound, playButtonClickSound,
}: UseWordWheelKeyboardParams) {
  const refs = useRef({ handleSubmit, handleClear, usedIndices, outerLetters, gameOver });
  refs.current = { handleSubmit, handleClear, usedIndices, outerLetters, gameOver };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (refs.current.gameOver) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const { handleSubmit: submit, handleClear: clear, usedIndices: used, outerLetters: outer } = refs.current;

      if (key === 'ENTER') { e.preventDefault(); submit(); return; }
      if (key === 'BACKSPACE') { e.preventDefault(); setBuiltLetters(prev => prev.slice(0, -1)); playButtonClickSound(); return; }
      if (key === 'ESCAPE') { e.preventDefault(); clear(); return; }
      if (key.length !== 1 || !/[A-Z]/.test(key)) return;

      if (centerLetter.toUpperCase() === key && !used.has(-1)) {
        setBuiltLetters(prev => [...prev, { letter: centerLetter, wheelIndex: -1 }]);
        playTileSelectSound();
        return;
      }
      for (let i = 0; i < outer.length; i++) {
        if (outer[i].toUpperCase() === key && !used.has(i)) {
          setBuiltLetters(prev => [...prev, { letter: outer[i], wheelIndex: i }]);
          playTileSelectSound();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerLetter, setBuiltLetters, playTileSelectSound, playButtonClickSound]);
}
