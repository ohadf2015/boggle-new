/**
 * useRateLimitedAction - Client-side rate limiting for actions
 *
 * Features:
 * - Client-side rate limiting before server round-trip
 * - Cooldown display for UI feedback
 * - Automatic recovery after cooldown
 * - Type-safe action handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseRateLimitedActionOptions {
  /** Maximum number of actions allowed in the time window (default: 10) */
  maxActions?: number;
  /** Time window in milliseconds (default: 1000ms) */
  windowMs?: number;
  /** Cooldown duration when rate limited (default: 2000ms) */
  cooldownMs?: number;
  /** Callback when rate limited */
  onRateLimited?: () => void;
}

export interface UseRateLimitedActionReturn<TArgs extends unknown[], TReturn> {
  /** Execute the action if not rate limited */
  execute: (...args: TArgs) => TReturn | undefined;
  /** Whether currently rate limited */
  isRateLimited: boolean;
  /** Remaining cooldown time in ms */
  remainingCooldown: number;
  /** Reset the rate limit state */
  reset: () => void;
  /** Current action count in window */
  actionCount: number;
  /** Check if an action can be executed without actually executing */
  canExecute: () => boolean;
}

/**
 * Hook for rate-limiting user actions on the client side
 *
 * @example
 * ```tsx
 * const submitWord = useCallback((word: string) => {
 *   socket.emit('submit-word', { word });
 * }, [socket]);
 *
 * const { execute, isRateLimited, remainingCooldown } = useRateLimitedAction(
 *   submitWord,
 *   {
 *     maxActions: 5,
 *     windowMs: 1000,
 *     cooldownMs: 3000,
 *     onRateLimited: () => toast.error('Slow down!')
 *   }
 * );
 *
 * // In your UI
 * <button
 *   onClick={() => execute(word)}
 *   disabled={isRateLimited}
 * >
 *   Submit {isRateLimited && `(${Math.ceil(remainingCooldown / 1000)}s)`}
 * </button>
 * ```
 */
export function useRateLimitedAction<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => TReturn,
  options: UseRateLimitedActionOptions = {}
): UseRateLimitedActionReturn<TArgs, TReturn> {
  const {
    maxActions = 10,
    windowMs = 1000,
    cooldownMs = 2000,
    onRateLimited,
  } = options;

  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const [actionCount, setActionCount] = useState(0);

  const actionsRef = useRef<number[]>([]);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onRateLimitedRef = useRef(onRateLimited);

  // Keep callback ref updated
  useEffect(() => {
    onRateLimitedRef.current = onRateLimited;
  }, [onRateLimited]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const cleanupOldActions = useCallback(() => {
    const now = Date.now();
    actionsRef.current = actionsRef.current.filter(time => now - time < windowMs);
    setActionCount(actionsRef.current.length);
  }, [windowMs]);

  const reset = useCallback(() => {
    actionsRef.current = [];
    setActionCount(0);
    setIsRateLimited(false);
    setRemainingCooldown(0);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const canExecute = useCallback((): boolean => {
    if (isRateLimited) return false;

    cleanupOldActions();
    return actionsRef.current.length < maxActions;
  }, [isRateLimited, cleanupOldActions, maxActions]);

  const triggerRateLimit = useCallback(() => {
    setIsRateLimited(true);
    setRemainingCooldown(cooldownMs);
    onRateLimitedRef.current?.();

    // Start cooldown countdown for UI
    countdownIntervalRef.current = setInterval(() => {
      setRemainingCooldown(prev => {
        const newValue = prev - 100;
        if (newValue <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return newValue;
      });
    }, 100);

    // Clear rate limit after cooldown
    cooldownTimerRef.current = setTimeout(() => {
      setIsRateLimited(false);
      setRemainingCooldown(0);
      actionsRef.current = [];
      setActionCount(0);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, cooldownMs);
  }, [cooldownMs]);

  const execute = useCallback((...args: TArgs): TReturn | undefined => {
    if (isRateLimited) {
      return undefined;
    }

    cleanupOldActions();

    // Check if we're at the limit
    if (actionsRef.current.length >= maxActions) {
      triggerRateLimit();
      return undefined;
    }

    // Record this action
    actionsRef.current.push(Date.now());
    setActionCount(actionsRef.current.length);

    // Execute the action
    return action(...args);
  }, [action, isRateLimited, maxActions, cleanupOldActions, triggerRateLimit]);

  return {
    execute,
    isRateLimited,
    remainingCooldown,
    reset,
    actionCount,
    canExecute,
  };
}

/**
 * Simplified hook for debouncing an action (single action with delay)
 */
export interface UseDebouncedActionOptions {
  /** Delay in milliseconds (default: 300ms) */
  delay?: number;
  /** Whether to execute on leading edge (default: false) */
  leading?: boolean;
}

export function useDebouncedAction<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => TReturn,
  options: UseDebouncedActionOptions = {}
): (...args: TArgs) => void {
  const { delay = 300, leading = false } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<TArgs | null>(null);
  const hasLeadingExecutedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback((...args: TArgs) => {
    lastArgsRef.current = args;

    // Leading edge execution
    if (leading && !hasLeadingExecutedRef.current) {
      hasLeadingExecutedRef.current = true;
      action(...args);
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for trailing edge
    timeoutRef.current = setTimeout(() => {
      if (!leading || (leading && lastArgsRef.current !== args)) {
        action(...(lastArgsRef.current || args));
      }
      hasLeadingExecutedRef.current = false;
    }, delay);
  }, [action, delay, leading]);
}

export default useRateLimitedAction;
