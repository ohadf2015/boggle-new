'use client';

/**
 * @deprecated This hook is deprecated. Use `useCoinContext()` from '@/contexts/CoinContext' instead.
 *
 * Migration:
 * - For basic operations (coins, canAfford, addCoins, spendCoins, refreshCoins):
 *   Replace `useCoins()` with `useCoinContext()`
 * - For award operations (daily, game, combo, ad):
 *   Use `useCoinContext()` which provides them directly
 *
 * Example migration:
 * ```ts
 * // Before
 * import { useCoins } from '@/hooks/useCoins';
 * const { coins, spendCoins } = useCoins();
 *
 * // After
 * import { useCoinContext } from '@/contexts/CoinContext';
 * const { coins, spendCoins } = useCoinContext();
 * ```
 */

// Re-export everything from CoinContext for backward compatibility
export type { CoinRewardResult, CoinRewardBreakdown } from '@/contexts/CoinContext';
export { useCoinContext, useCoinsFromContext } from '@/contexts/CoinContext';

import { useRef, useEffect } from 'react';
import { useCoinsFromContext } from '@/contexts/CoinContext';

/**
 * @deprecated Use `useCoinContext()` from '@/contexts/CoinContext' instead.
 *
 * This hook is a legacy wrapper around CoinContext that will be removed in a future version.
 * It provides the same basic operations (coins, canAfford, addCoins, spendCoins, refreshCoins)
 * but lacks the specialized award operations available in useCoinContext().
 */
export function useCoins() {
  const hasWarned = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasWarned.current) {
      console.warn(
        '[DEPRECATION] useCoins() from hooks/useCoins.ts is deprecated.\n' +
        'Please migrate to useCoinContext() from "@/contexts/CoinContext".\n' +
        'See the JSDoc in hooks/useCoins.ts for migration guide.'
      );
      hasWarned.current = true;
    }
  }, []);

  return useCoinsFromContext();
}
