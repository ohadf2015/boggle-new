import { useState, useCallback, useRef } from 'react';
import { MAX_HEAT, incrementHeat, decrementHeat, isRushActive } from '@/lib/wordAlchemy/heatMeter';

export { MAX_HEAT };

export function useAlchemyHeatMeter() {
  const [heat, setHeat] = useState(0);
  const heatRef = useRef(0);
  heatRef.current = heat;

  /** Call on correct guess. Returns whether the Exothermic Rush fired. */
  const onCorrectGuess = useCallback((wasFirstTry: boolean) => {
    const wasRush = isRushActive(heatRef.current);
    if (wasFirstTry) {
      setHeat((h) => incrementHeat(h));
    }
    return { wasRush };
  }, []);

  /** Call on wrong guess — drains one segment. */
  const onWrongGuess = useCallback(() => {
    setHeat((h) => decrementHeat(h));
  }, []);

  const reset = useCallback(() => setHeat(0), []);

  return { heat, maxHeat: MAX_HEAT, onCorrectGuess, onWrongGuess, reset };
}
