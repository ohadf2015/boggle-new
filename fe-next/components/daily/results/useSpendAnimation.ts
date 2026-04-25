import { useCallback, useState } from 'react';

export interface SpendAnimationPosition {
  x: number;
  y: number;
}

export interface UseSpendAnimationReturn {
  isVisible: boolean;
  position: SpendAnimationPosition;
  amount: number;
  start: (position: SpendAnimationPosition, amount: number) => void;
  hide: () => void;
}

/**
 * Coin-spend animation state. Kept here so the results screen stays thin
 * and the trigger surface stays small (start/hide).
 */
export function useSpendAnimation(): UseSpendAnimationReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<SpendAnimationPosition>({ x: 0, y: 0 });
  const [amount, setAmount] = useState(0);

  const start = useCallback((nextPosition: SpendAnimationPosition, nextAmount: number) => {
    setPosition(nextPosition);
    setAmount(nextAmount);
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  return { isVisible, position, amount, start, hide };
}
