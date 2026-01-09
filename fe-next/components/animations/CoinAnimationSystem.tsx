'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { CoinTrajectory } from './CoinTrajectory';
import { CoinBurstSource } from './CoinBurstSource';
import { CoinCounterAnimated } from './CoinCounterAnimated';

interface CoinAnimationConfig {
  sourcePosition: { x: number; y: number };
  amount: number;
  showBurst?: boolean;
  burstIntensity?: 'low' | 'medium' | 'high';
}

interface CoinAnimationContextValue {
  /** Register the coin counter element as animation target */
  registerCoinCounter: (ref: React.RefObject<HTMLDivElement | null>) => void;
  /** Trigger coin animation from a source position to the counter */
  triggerCoinAnimation: (config: CoinAnimationConfig) => void;
  /** Current coin value (for display) */
  coinValue: number;
  /** Set the coin value (updates display) */
  setCoinValue: (value: number) => void;
  /** Increment coins with animation */
  addCoins: (amount: number, sourcePosition: { x: number; y: number }) => void;
}

const CoinAnimationContext = createContext<CoinAnimationContextValue | null>(null);

interface CoinAnimationProviderProps {
  children: ReactNode;
  /** Initial coin value */
  initialValue?: number;
  /** Callback when coins are added */
  onCoinsAdded?: (newTotal: number, added: number) => void;
}

/**
 * CoinAnimationProvider - Provides coin animation system to the app
 *
 * Wrap your app or game component with this provider to enable
 * coordinated coin animations between different parts of the UI.
 *
 * @example
 * ```tsx
 * <CoinAnimationProvider initialValue={100} onCoinsAdded={(total) => updateBackend(total)}>
 *   <GameScreen />
 * </CoinAnimationProvider>
 * ```
 */
export function CoinAnimationProvider({
  children,
  initialValue = 0,
  onCoinsAdded,
}: CoinAnimationProviderProps) {
  const [coinValue, setCoinValue] = useState(initialValue);
  const [previousValue, setPreviousValue] = useState(initialValue);
  const [activeAnimation, setActiveAnimation] = useState<CoinAnimationConfig | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const coinCounterRef = useRef<React.RefObject<HTMLDivElement | null> | null>(null);

  // Register the coin counter element
  const registerCoinCounter = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    coinCounterRef.current = ref;
  }, []);

  // Trigger coin animation
  const triggerCoinAnimation = useCallback((config: CoinAnimationConfig) => {
    if (config.showBurst !== false) {
      setShowBurst(true);
    }
    setActiveAnimation(config);
  }, []);

  // Handle burst completion - start trajectory
  const handleBurstComplete = useCallback(() => {
    setShowBurst(false);
  }, []);

  // Handle coin arrival at counter
  const handleCoinArrival = useCallback(
    (index: number) => {
      if (!activeAnimation) return;

      // Increment display value gradually as coins arrive
      const coinPerIncrement = activeAnimation.amount / Math.min(activeAnimation.amount, 8);
      setCoinValue((prev) => {
        const newValue = Math.min(prev + coinPerIncrement, previousValue + activeAnimation.amount);
        return Math.round(newValue);
      });
    },
    [activeAnimation, previousValue]
  );

  // Handle all coins arrived
  const handleAllCoinsArrived = useCallback(() => {
    if (!activeAnimation) return;

    const finalValue = previousValue + activeAnimation.amount;
    setCoinValue(finalValue);
    setPreviousValue(finalValue);
    onCoinsAdded?.(finalValue, activeAnimation.amount);
    setActiveAnimation(null);
  }, [activeAnimation, previousValue, onCoinsAdded]);

  // Convenience method to add coins with animation
  const addCoins = useCallback(
    (amount: number, sourcePosition: { x: number; y: number }) => {
      triggerCoinAnimation({
        sourcePosition,
        amount,
        showBurst: true,
        burstIntensity: amount >= 10 ? 'high' : amount >= 5 ? 'medium' : 'low',
      });
    },
    [triggerCoinAnimation]
  );

  // Update previous value when coin value changes externally
  const handleSetCoinValue = useCallback((value: number) => {
    setPreviousValue(coinValue);
    setCoinValue(value);
  }, [coinValue]);

  const contextValue: CoinAnimationContextValue = {
    registerCoinCounter,
    triggerCoinAnimation,
    coinValue,
    setCoinValue: handleSetCoinValue,
    addCoins,
  };

  return (
    <CoinAnimationContext.Provider value={contextValue}>
      {children}

      {/* Burst effect at source */}
      {activeAnimation && showBurst && (
        <CoinBurstSource
          trigger={showBurst}
          position={activeAnimation.sourcePosition}
          amount={activeAnimation.amount}
          intensity={activeAnimation.burstIntensity}
          onBurstComplete={handleBurstComplete}
        />
      )}

      {/* Coin trajectory animation */}
      {activeAnimation && !showBurst && coinCounterRef.current && (
        <CoinTrajectory
          coinCount={Math.min(activeAnimation.amount, 8)}
          startPosition={activeAnimation.sourcePosition}
          targetRef={coinCounterRef.current}
          onCoinArrival={handleCoinArrival}
          onAllCoinsArrived={handleAllCoinsArrived}
          showTrail
        />
      )}
    </CoinAnimationContext.Provider>
  );
}

/**
 * Hook to access coin animation system
 */
export function useCoinAnimation() {
  const context = useContext(CoinAnimationContext);
  if (!context) {
    throw new Error('useCoinAnimation must be used within CoinAnimationProvider');
  }
  return context;
}

/**
 * CoinCounterWithAnimation - Pre-wired coin counter that works with the animation system
 *
 * @example
 * ```tsx
 * <CoinAnimationProvider initialValue={100}>
 *   <CoinCounterWithAnimation size="md" />
 *   <GameArea />
 * </CoinAnimationProvider>
 * ```
 */
export function CoinCounterWithAnimation({
  size = 'md',
  className,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { registerCoinCounter, coinValue } = useCoinAnimation();
  const counterRef = useRef<HTMLDivElement>(null);
  const [prevValue, setPrevValue] = useState(coinValue);

  // Register on mount
  React.useEffect(() => {
    registerCoinCounter(counterRef);
  }, [registerCoinCounter]);

  // Track previous value for animation
  React.useEffect(() => {
    if (coinValue !== prevValue) {
      const timer = setTimeout(() => setPrevValue(coinValue), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [coinValue, prevValue]);

  return (
    <CoinCounterAnimated
      ref={counterRef}
      value={coinValue}
      previousValue={prevValue}
      size={size}
      showImpact
      showAddedIndicator
      className={className}
    />
  );
}

export default CoinAnimationProvider;
