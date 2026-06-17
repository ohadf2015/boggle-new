import { useCallback, useRef, useState } from 'react';

const TEMPO_WINDOW_MS = 2000;
const TEMPO_CHAIN = 3;

/**
 * Tracks inter-word submission speed in shiritori solo.
 * After TEMPO_CHAIN consecutive fast gaps (≤ TEMPO_WINDOW_MS each),
 * tempoActive fires — giving the player a wildcard chain link.
 */
export function useShiritoriTempo() {
  const [consecutiveFast, setConsecutiveFast] = useState(0);
  const lastSubmitTimeRef = useRef<number | null>(null);

  const tempoActive = consecutiveFast >= TEMPO_CHAIN;

  const recordSubmit = useCallback((now?: number) => {
    const t = now ?? Date.now();
    const last = lastSubmitTimeRef.current;
    lastSubmitTimeRef.current = t;
    if (last !== null && t - last <= TEMPO_WINDOW_MS) {
      setConsecutiveFast((prev) => prev + 1);
    } else {
      setConsecutiveFast(0);
    }
  }, []);

  const spendTempo = useCallback(() => {
    setConsecutiveFast(0);
    lastSubmitTimeRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setConsecutiveFast(0);
    lastSubmitTimeRef.current = null;
  }, []);

  return { tempoActive, consecutiveFast, recordSubmit, spendTempo, reset };
}
