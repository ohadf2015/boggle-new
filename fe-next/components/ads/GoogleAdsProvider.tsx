'use client';

import Script from 'next/script';
import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';

// AdSense type declarations
interface AdsByGoogleArray extends Array<Record<string, unknown>> {
  push: (params: Record<string, unknown>) => number;
  loaded?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: AdsByGoogleArray;
  }
}

interface GoogleAdsContextType {
  /** Whether AdSense script has loaded */
  isLoaded: boolean;
  /** Whether ads are available (not blocked) */
  isAvailable: boolean;
  /** Show a rewarded/interstitial ad and call onComplete when done */
  showRewardedAd: (callbacks: {
    onAdStarted?: () => void;
    onAdComplete?: () => void;
    onAdError?: (error: string) => void;
  }) => void;
}

const GoogleAdsContext = createContext<GoogleAdsContextType | null>(null);

// Get AdSense Publisher ID from environment
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const ADSENSE_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_REWARDED_SLOT;

/**
 * GoogleAdsProvider - Provides Google AdSense functionality as fallback
 *
 * Required environment variables:
 * - NEXT_PUBLIC_ADSENSE_CLIENT_ID: Your AdSense publisher ID (ca-pub-XXXXXXXX)
 * - NEXT_PUBLIC_ADSENSE_REWARDED_SLOT: Your ad unit slot ID for rewarded/interstitial ads
 */
export function GoogleAdsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if ads are available after script loads
  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    // Small delay to check if adblocker is present
    const timer = setTimeout(() => {
      const adsAvailable = !!(window.adsbygoogle && !document.querySelector('.adsbygoogle[data-ad-status="unfilled"]'));
      setIsAvailable(adsAvailable);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  const handleScriptLoad = useCallback(() => {
    setIsLoaded(true);
    setIsAvailable(true);
  }, []);

  // Handle script error (expected when ad blockers are active)
  const handleScriptError = useCallback(() => {
    // Use debug level - script failures are expected when ad blockers are active
    console.debug('[AdSense] Script failed to load (likely blocked by ad blocker)');
    setIsLoaded(true);
    setIsAvailable(false);
  }, []);

  /**
   * Show a rewarded ad (interstitial style)
   * Since AdSense doesn't have true rewarded video for web, we use an interstitial approach
   */
  const showRewardedAd = useCallback((callbacks: {
    onAdStarted?: () => void;
    onAdComplete?: () => void;
    onAdError?: (error: string) => void;
  }) => {
    const { onAdStarted, onAdComplete, onAdError } = callbacks;

    if (!ADSENSE_CLIENT_ID || !ADSENSE_AD_SLOT) {
      console.warn('AdSense not configured. Set NEXT_PUBLIC_ADSENSE_CLIENT_ID and NEXT_PUBLIC_ADSENSE_REWARDED_SLOT');
      onAdError?.('Ads not configured');
      return;
    }

    if (!isAvailable) {
      onAdError?.('Ads not available');
      return;
    }

    onAdStarted?.();

    try {
      // Create a fullscreen overlay for the ad
      const overlay = document.createElement('div');
      overlay.id = 'adsense-rewarded-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;

      // Add close button (appears after ad loads)
      const closeContainer = document.createElement('div');
      closeContainer.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        opacity: 0;
        transition: opacity 0.3s;
      `;

      const closeButton = document.createElement('button');
      closeButton.innerText = 'Close & Claim Reward';
      closeButton.style.cssText = `
        padding: 12px 24px;
        background: #10b981;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        font-size: 16px;
      `;
      closeButton.onclick = () => {
        document.body.removeChild(overlay);
        onAdComplete?.();
      };
      closeContainer.appendChild(closeButton);

      // Add ad container
      const adContainer = document.createElement('div');
      adContainer.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 12px;
        max-width: 90vw;
        max-height: 70vh;
        overflow: hidden;
      `;

      // Create the AdSense ad unit
      const adUnit = document.createElement('ins');
      adUnit.className = 'adsbygoogle';
      adUnit.style.cssText = 'display:block;width:336px;height:280px;';
      adUnit.setAttribute('data-ad-client', ADSENSE_CLIENT_ID);
      adUnit.setAttribute('data-ad-slot', ADSENSE_AD_SLOT);
      adUnit.setAttribute('data-ad-format', 'rectangle');
      adUnit.setAttribute('data-full-width-responsive', 'false');

      adContainer.appendChild(adUnit);
      overlay.appendChild(closeContainer);
      overlay.appendChild(adContainer);
      document.body.appendChild(overlay);

      // Push the ad
      try {
        const adsbygoogle = window.adsbygoogle || [] as unknown as AdsByGoogleArray;
        window.adsbygoogle = adsbygoogle;
        adsbygoogle.push({});

        // Show close button after 3 seconds (simulates watching the ad)
        setTimeout(() => {
          closeContainer.style.opacity = '1';
        }, 3000);
      } catch (adError) {
        console.error('AdSense push error:', adError);
        document.body.removeChild(overlay);
        onAdError?.('Failed to load ad');
      }
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      onAdError?.('Failed to show ad');
    }
  }, [isAvailable]);

  // Memoize the context value to prevent unnecessary re-renders of all consumers
  const value = useMemo<GoogleAdsContextType>(() => ({
    isLoaded,
    isAvailable,
    showRewardedAd,
  }), [isLoaded, isAvailable, showRewardedAd]);

  return (
    <GoogleAdsContext.Provider value={value}>
      {ADSENSE_CLIENT_ID && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
          onLoad={handleScriptLoad}
          onError={handleScriptError}
        />
      )}
      {children}
    </GoogleAdsContext.Provider>
  );
}

/**
 * Hook to access Google Ads functionality
 */
export function useGoogleAds(): GoogleAdsContextType {
  const context = useContext(GoogleAdsContext);

  if (!context) {
    // Return no-op implementation when not in provider
    return {
      isLoaded: false,
      isAvailable: false,
      showRewardedAd: (callbacks) => {
        callbacks.onAdError?.('GoogleAdsProvider not found');
      },
    };
  }

  return context;
}

export default GoogleAdsProvider;
