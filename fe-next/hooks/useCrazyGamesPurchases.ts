'use client';

import { useState, useCallback } from 'react';
import { useCrazyGames, type XsollaOrder } from '@/components/CrazyGamesSDK';

interface UseCrazyGamesPurchasesReturn {
  /** Whether IAP is available (SDK loaded + payment module exists) */
  isAvailable: boolean;
  /** Get Xsolla user token for opening PayStation */
  getXsollaToken: () => Promise<string | null>;
  /** Track a completed order with CrazyGames */
  trackOrder: (orderId: string, extraData?: Record<string, unknown>) => Promise<boolean>;
  /** Whether a purchase operation is in progress */
  isProcessing: boolean;
}

/**
 * Hook for CrazyGames in-game purchases (Xsolla integration).
 *
 * Provides access to CrazyGames payment features:
 * - Get Xsolla bearer tokens for PayStation widget
 * - Track completed orders for CrazyGames analytics
 *
 * NOTE: Requires CrazyGames approval and Xsolla setup before use.
 * User must be signed in (no guest checkout).
 *
 * @example
 * ```tsx
 * const { isAvailable, getXsollaToken, trackOrder } = useCrazyGamesPurchases();
 *
 * const handlePurchase = async () => {
 *   const token = await getXsollaToken();
 *   if (!token) return;
 *   // Open Xsolla PayStation with token
 *   // After successful payment:
 *   await trackOrder(orderId);
 * };
 * ```
 */
export function useCrazyGamesPurchases(): UseCrazyGamesPurchasesReturn {
  const {
    isAvailable: sdkAvailable,
    getXsollaUserToken,
    trackOrder: sdkTrackOrder,
  } = useCrazyGames();

  const [isProcessing, setIsProcessing] = useState(false);

  const getXsollaToken = useCallback(async (): Promise<string | null> => {
    if (!sdkAvailable) return null;

    setIsProcessing(true);
    try {
      return await getXsollaUserToken();
    } catch (error) {
      console.error('Failed to get Xsolla token:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [sdkAvailable, getXsollaUserToken]);

  const trackOrder = useCallback(async (
    orderId: string,
    extraData?: Record<string, unknown>,
  ): Promise<boolean> => {
    if (!sdkAvailable) return false;

    try {
      const order: XsollaOrder = { orderId, ...extraData };
      await sdkTrackOrder('xsolla', order);
      return true;
    } catch (error) {
      console.error('Failed to track order:', error);
      return false;
    }
  }, [sdkAvailable, sdkTrackOrder]);

  return {
    isAvailable: sdkAvailable,
    getXsollaToken,
    trackOrder,
    isProcessing,
  };
}

export default useCrazyGamesPurchases;
