import { useCallback, useState } from 'react';

/**
 * Practice-mode wheel drag-select. Wheel layout has no adjacency constraint —
 * any non-already-selected letter can extend the path. This mirrors the real
 * `WordWheelGame` selection model.
 */
export function usePracticeWheelDragSelect({ letters }: { letters: readonly string[] }) {
  const [path, setPath] = useState<number[]>([]);

  const onLetterEnter = useCallback((idx: number) => {
    setPath((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  }, []);

  const clear = useCallback(() => setPath([]), []);

  const word = useCallback(
    () => path.map((i) => letters[i] ?? '').join(''),
    [path, letters],
  );

  return { path, onLetterEnter, clear, word };
}
