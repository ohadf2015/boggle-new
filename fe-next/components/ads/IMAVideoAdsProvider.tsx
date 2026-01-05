'use client';

import Script from 'next/script';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
  useEffect,
} from 'react';

// IMA SDK - using 'any' for SDK objects to avoid type conflicts with global declarations
// The SDK is loaded dynamically and we access it via window.google.ima

interface IMAVideoAdsContextType {
  /** Whether IMA SDK script has loaded */
  isLoaded: boolean;
  /** Whether ads are available */
  isAvailable: boolean;
  /** Show a rewarded video ad */
  showRewardedAd: (callbacks: {
    onAdStarted?: () => void;
    onAdComplete?: () => void;
    onAdError?: (error: string) => void;
  }) => void;
}

const IMAVideoAdsContext = createContext<IMAVideoAdsContextType | null>(null);

// Environment variables
const GAM_NETWORK_ID = process.env.NEXT_PUBLIC_GAM_NETWORK_ID;
const GAM_AD_UNIT_PATH = process.env.NEXT_PUBLIC_GAM_AD_UNIT_PATH;

// Google's sample VAST tag for testing (15-second skippable video ad)
const TEST_VAST_TAG =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

/**
 * Build the VAST tag URL for Google Ad Manager
 */
function buildVASTTagUrl(): string {
  // Use test tag if no credentials configured
  if (!GAM_NETWORK_ID || !GAM_AD_UNIT_PATH) {
    console.log('[IMA SDK] Using test VAST tag (no credentials configured)');
    return TEST_VAST_TAG;
  }

  const params = new URLSearchParams({
    iu: `/${GAM_NETWORK_ID}${GAM_AD_UNIT_PATH}`,
    sz: '640x480',
    gdfp_req: '1',
    output: 'vast',
    unviewed_position_start: '1',
    env: 'vp',
    impl: 's',
    correlator: Date.now().toString(),
    description_url: typeof window !== 'undefined' ? window.location.href : '',
  });

  return `https://pubads.g.doubleclick.net/gampad/ads?${params.toString()}`;
}

/**
 * IMAVideoAdsProvider - Provides Google IMA SDK video ad functionality
 *
 * Environment variables:
 * - NEXT_PUBLIC_GAM_NETWORK_ID: Your Google Ad Manager network ID
 * - NEXT_PUBLIC_GAM_AD_UNIT_PATH: Your ad unit path (e.g., /rewarded_video)
 *
 * If not configured, uses Google's test VAST tag.
 */
export function IMAVideoAdsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);

  // Refs for IMA SDK objects (using any for dynamically loaded SDK types)
  const adContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const adDisplayContainerRef = useRef<any>(null);
  const adsLoaderRef = useRef<any>(null);
  const adsManagerRef = useRef<any>(null);
  const callbacksRef = useRef<{
    onAdStarted?: () => void;
    onAdComplete?: () => void;
    onAdError?: (error: string) => void;
  } | null>(null);

  // Cleanup ad resources - defined first as other callbacks depend on it
  const cleanupAd = useCallback(() => {
    if (adsManagerRef.current) {
      adsManagerRef.current.destroy();
      adsManagerRef.current = null;
    }
    setIsShowingAd(false);
    callbacksRef.current = null;
  }, []);

  // Handle ad errors
  const handleAdError = useCallback((event: any) => {
    const error = event.getError();
    const errorCode = error.getErrorCode();
    const message = error.getMessage();

    console.error(`[IMA SDK] Ad error ${errorCode}: ${message}`);
    cleanupAd();

    // User-friendly error messages
    const errorMessages: Record<number, string> = {
      301: 'No ads available at this time',
      303: 'No ads available at this time',
      400: 'Invalid ad response',
      402: 'Ad playback error',
      900: 'Network error - check your connection',
    };

    callbacksRef.current?.onAdError?.(
      errorMessages[errorCode] || 'Failed to load ad'
    );
  }, [cleanupAd]);

  // Handle ad events
  const handleAdEvent = useCallback((event: any) => {
    const callbacks = callbacksRef.current;

    switch (event.type) {
      case window.google!.ima.AdEvent.Type.STARTED:
        console.log('[IMA SDK] Ad started');
        callbacks?.onAdStarted?.();
        break;

      case window.google!.ima.AdEvent.Type.COMPLETE:
        console.log('[IMA SDK] Ad completed - granting reward');
        cleanupAd();
        callbacks?.onAdComplete?.();
        break;

      case window.google!.ima.AdEvent.Type.SKIPPED:
        console.log('[IMA SDK] Ad skipped - no reward');
        cleanupAd();
        callbacks?.onAdError?.('Ad was skipped');
        break;

      case window.google!.ima.AdEvent.Type.USER_CLOSE:
        console.log('[IMA SDK] Ad closed by user - no reward');
        cleanupAd();
        callbacks?.onAdError?.('Ad was closed');
        break;

      case window.google!.ima.AdEvent.Type.ALL_ADS_COMPLETED:
        console.log('[IMA SDK] All ads completed');
        cleanupAd();
        break;
    }
  }, [cleanupAd]);

  // Handle successful ads manager load
  const handleAdsManagerLoaded = useCallback((event: any) => {
      try {
        const adsRenderingSettings = {
          restoreCustomPlaybackStateOnAdBreakComplete: true,
        };

        adsManagerRef.current = event.getAdsManager(
          { currentTime: 0, duration: 0 },
          adsRenderingSettings
        );

        const adsManager = adsManagerRef.current;

        // Add event listeners for ad events
        adsManager.addEventListener(
          window.google!.ima.AdEvent.Type.STARTED,
          handleAdEvent
        );
        adsManager.addEventListener(
          window.google!.ima.AdEvent.Type.COMPLETE,
          handleAdEvent
        );
        adsManager.addEventListener(
          window.google!.ima.AdEvent.Type.SKIPPED,
          handleAdEvent
        );
        adsManager.addEventListener(
          window.google!.ima.AdEvent.Type.USER_CLOSE,
          handleAdEvent
        );
        adsManager.addEventListener(
          window.google!.ima.AdEvent.Type.ALL_ADS_COMPLETED,
          handleAdEvent
        );
        adsManager.addEventListener('adError', handleAdError);

        // Initialize and start
        const width = window.innerWidth;
        const height = window.innerHeight;
        adsManager.init(width, height, window.google!.ima.ViewMode.FULLSCREEN);
        adsManager.start();
      } catch (error) {
        console.error('[IMA SDK] Error initializing ads manager:', error);
        cleanupAd();
        callbacksRef.current?.onAdError?.('Failed to initialize ad');
      }
    },
    [cleanupAd, handleAdEvent, handleAdError]
  );

  // Initialize IMA SDK after script loads
  const initializeIMA = useCallback(() => {
    if (!window.google?.ima || !adContainerRef.current || !videoRef.current) {
      return;
    }

    try {
      // Create ad display container
      adDisplayContainerRef.current = new window.google.ima.AdDisplayContainer(
        adContainerRef.current,
        videoRef.current
      );

      // Create ads loader
      adsLoaderRef.current = new window.google.ima.AdsLoader(adDisplayContainerRef.current);

      // Set up event listeners
      adsLoaderRef.current.addEventListener(
        'adsManagerLoaded',
        handleAdsManagerLoaded,
        false
      );
      adsLoaderRef.current.addEventListener('adError', handleAdError, false);

      setIsAvailable(true);
      console.log('[IMA SDK] Initialized successfully');
    } catch (error) {
      console.error('[IMA SDK] Initialization error:', error);
      setIsAvailable(false);
    }
  }, [handleAdsManagerLoaded, handleAdError]);

  // Handle script load
  const handleScriptLoad = useCallback(() => {
    console.log('[IMA SDK] Script loaded');
    setIsLoaded(true);
    // Small delay to ensure SDK is ready
    setTimeout(initializeIMA, 100);
  }, [initializeIMA]);

  // Handle script error (expected when ad blockers are active)
  const handleScriptError = useCallback(() => {
    // Use debug level - script failures are expected when ad blockers are active
    console.debug('[IMA SDK] Script failed to load (likely blocked by ad blocker)');
    setIsLoaded(true);
    setIsAvailable(false);
  }, []);

  // Show rewarded ad
  const showRewardedAd = useCallback(
    (callbacks: {
      onAdStarted?: () => void;
      onAdComplete?: () => void;
      onAdError?: (error: string) => void;
    }) => {
      if (!isAvailable || !adsLoaderRef.current || !adDisplayContainerRef.current) {
        callbacks.onAdError?.('Ads not available');
        return;
      }

      if (isShowingAd) {
        callbacks.onAdError?.('Ad already playing');
        return;
      }

      // Store callbacks
      callbacksRef.current = callbacks;
      setIsShowingAd(true);

      try {
        // Initialize ad display container (required before first ad)
        adDisplayContainerRef.current.initialize();

        // Create and request ad
        const adsRequest = new window.google!.ima.AdsRequest();
        adsRequest.adTagUrl = buildVASTTagUrl();
        adsRequest.linearAdSlotWidth = window.innerWidth;
        adsRequest.linearAdSlotHeight = window.innerHeight;
        adsRequest.nonLinearAdSlotWidth = window.innerWidth;
        adsRequest.nonLinearAdSlotHeight = window.innerHeight / 3;

        console.log('[IMA SDK] Requesting ad...');
        adsLoaderRef.current.requestAds(adsRequest);
      } catch (error) {
        console.error('[IMA SDK] Error requesting ad:', error);
        cleanupAd();
        callbacks.onAdError?.('Failed to request ad');
      }
    },
    [isAvailable, isShowingAd, cleanupAd]
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (adsManagerRef.current && isShowingAd) {
        adsManagerRef.current.resize(
          window.innerWidth,
          window.innerHeight,
          window.google!.ima.ViewMode.FULLSCREEN
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isShowingAd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (adsManagerRef.current) {
        adsManagerRef.current.destroy();
      }
      if (adsLoaderRef.current) {
        adsLoaderRef.current.destroy();
      }
      if (adDisplayContainerRef.current) {
        adDisplayContainerRef.current.destroy();
      }
    };
  }, []);

  const value: IMAVideoAdsContextType = {
    isLoaded,
    isAvailable,
    showRewardedAd,
  };

  return (
    <IMAVideoAdsContext.Provider value={value}>
      {/* IMA SDK Script */}
      <Script
        src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />

      {/* Video Ad Overlay */}
      <div
        ref={adContainerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'black',
          zIndex: 99999,
          display: isShowingAd ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {children}
    </IMAVideoAdsContext.Provider>
  );
}

/**
 * Hook to access IMA video ads functionality
 */
export function useIMAVideoAds(): IMAVideoAdsContextType {
  const context = useContext(IMAVideoAdsContext);

  if (!context) {
    // Return no-op implementation when not in provider
    return {
      isLoaded: false,
      isAvailable: false,
      showRewardedAd: (callbacks) => {
        callbacks.onAdError?.('IMAVideoAdsProvider not found');
      },
    };
  }

  return context;
}

export default IMAVideoAdsProvider;
