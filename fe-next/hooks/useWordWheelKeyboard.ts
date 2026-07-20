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

const normalizeKey = (key: string) => key.toUpperCase();

/**
 * Attaches a keydown listener for the Word Wheel game.
 * Letters → add to built word, Enter → submit, Backspace → remove last, Escape → clear.
 *
 * Matches input against the actual wheel letters so it works for every supported
 * script (Latin, Hebrew, Cyrillic, Japanese kana, Swedish, Spanish, etc.).
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
      const key = e.key;
      const { handleSubmit: submit, handleClear: clear, usedIndices: used, outerLetters: outer } = refs.current;

      if (key === 'Enter') { e.preventDefault(); submit(); return; }
      if (key === 'Backspace') { e.preventDefault(); setBuiltLetters(prev => prev.slice(0, -1)); playButtonClickSound(); return; }
      if (key === 'Escape') { e.preventDefault(); clear(); return; }
      if (key.length !== 1) return;

      const normalized = normalizeKey(key);
      const normalizedCenter = normalizeKey(centerLetter);

      if (normalizedCenter === normalized && !used.has(-1)) {
        setBuiltLetters(prev => [...prev, { letter: centerLetter, wheelIndex: -1 }]);
        playTileSelectSound();
        return;
      }
      for (let i = 0; i < outer.length; i++) {
        if (normalizeKey(outer[i]) === normalized && !used.has(i)) {
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
