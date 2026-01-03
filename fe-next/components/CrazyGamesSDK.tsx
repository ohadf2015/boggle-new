'use client';

import Script from 'next/script';
import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';

// CrazyGames SDK Type Definitions
declare global {
  interface Window {
    CrazyGames?: {
      SDK: CrazyGamesSDK;
    };
  }
}

type CrazyGamesEnvironment = 'crazygames' | 'local' | 'disabled';

interface AdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: string, errorData?: unknown) => void;
}

interface BannerOptions {
  id: string;
  width: number;
  height: number;
}

interface CrazyGamesSDK {
  getEnvironment: () => Promise<CrazyGamesEnvironment>;
  ad: {
    requestAd: (type: 'midgame' | 'rewarded', callbacks?: AdCallbacks) => void;
    hasAdblock: () => Promise<boolean>;
  };
  banner: {
    requestBanner: (options: BannerOptions) => void;
    requestResponsiveBanner: (containerId: string) => void;
    clearBanner: (containerId: string) => void;
    clearAllBanners: () => void;
  };
  game: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    loadingStart: () => void;
    loadingStop: () => void;
    happyTime: () => void;
    sdkGameLoadingStart: () => void;
    sdkGameLoadingStop: () => void;
  };
  user: {
    isUserAccountAvailable: () => Promise<boolean>;
    getUser: () => Promise<{ username: string; profilePictureUrl: string } | null>;
    showAuthPrompt: () => Promise<{ username: string; profilePictureUrl: string } | null>;
    getSystemInfo: () => Promise<{ countryCode: string; browser: { name: string; version: string }; os: { name: string; version: string }; device: { type: string } }>;
  };
  data: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
}

// Context types
interface CrazyGamesContextType {
  isAvailable: boolean;
  environment: CrazyGamesEnvironment | null;
  isLoading: boolean;
  // Gameplay events
  gameplayStart: () => void;
  gameplayStop: () => void;
  loadingStart: () => void;
  loadingStop: () => void;
  happyTime: () => void;
  // Ads
  showMidgameAd: (callbacks?: AdCallbacks) => void;
  showRewardedAd: (callbacks?: AdCallbacks) => void;
  hasAdblock: () => Promise<boolean>;
  // Data persistence
  saveData: (key: string, value: string) => Promise<void>;
  loadData: (key: string) => Promise<string | null>;
  removeData: (key: string) => Promise<void>;
  // User
  getUser: () => Promise<{ username: string; profilePictureUrl: string } | null>;
  showAuthPrompt: () => Promise<{ username: string; profilePictureUrl: string } | null>;
  isUserAccountAvailable: () => Promise<boolean>;
}

const CrazyGamesContext = createContext<CrazyGamesContextType | null>(null);

const CRAZYGAMES_ENABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'true';

/**
 * CrazyGames SDK Script Component
 *
 * Loads the CrazyGames SDK script when enabled via environment variable.
 * Set NEXT_PUBLIC_CRAZYGAMES_ENABLED=true to enable.
 */
export function CrazyGamesScript() {
  if (!CRAZYGAMES_ENABLED) {
    return null;
  }

  return (
    <Script
      src="https://sdk.crazygames.com/crazygames-sdk-v2.js"
      strategy="afterInteractive"
      id="crazygames-sdk"
    />
  );
}

/**
 * CrazyGames SDK Provider
 *
 * Provides access to all CrazyGames SDK features throughout the app.
 * Wrap your app with this provider to use the SDK.
 */
export function CrazyGamesProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [environment, setEnvironment] = useState<CrazyGamesEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize SDK and set up CrazyGames-specific handlers
  useEffect(() => {
    if (!CRAZYGAMES_ENABLED) {
      setIsLoading(false);
      return;
    }

    // Add CrazyGames-specific CSS class to body for mobile optimizations
    document.body.classList.add('crazygames-embed');

    // Prevent page scrolling (CrazyGames requirement)
    const preventScroll = (event: WheelEvent) => {
      event.preventDefault();
    };

    const preventKeyScroll = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown'].includes(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('keydown', preventKeyScroll);

    const checkSDK = async () => {
      // Wait for SDK to load
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max

      while (!window.CrazyGames?.SDK && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (window.CrazyGames?.SDK) {
        try {
          const env = await window.CrazyGames.SDK.getEnvironment();
          setEnvironment(env);
          setIsAvailable(env !== 'disabled');

          // Signal that game is ready to play
          if (env === 'crazygames') {
            window.CrazyGames.SDK.game.sdkGameLoadingStop();
          }
        } catch {
          setIsAvailable(false);
        }
      }
      setIsLoading(false);
    };

    checkSDK();

    return () => {
      document.body.classList.remove('crazygames-embed');
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('keydown', preventKeyScroll);
    };
  }, []);

  // Gameplay event handlers
  const gameplayStart = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.gameplayStart();
    }
  }, [isAvailable]);

  const gameplayStop = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.gameplayStop();
    }
  }, [isAvailable]);

  const loadingStart = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.loadingStart();
    }
  }, [isAvailable]);

  const loadingStop = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.loadingStop();
    }
  }, [isAvailable]);

  const happyTime = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.happyTime();
    }
  }, [isAvailable]);

  // Ad handlers
  const showMidgameAd = useCallback((callbacks?: AdCallbacks) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.ad.requestAd('midgame', callbacks);
    } else {
      callbacks?.adFinished?.();
    }
  }, [isAvailable]);

  const showRewardedAd = useCallback((callbacks?: AdCallbacks) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.ad.requestAd('rewarded', callbacks);
    } else {
      callbacks?.adError?.('SDK not available');
    }
  }, [isAvailable]);

  const hasAdblock = useCallback(async (): Promise<boolean> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.ad.hasAdblock();
    }
    return false;
  }, [isAvailable]);

  // Data persistence handlers
  const saveData = useCallback(async (key: string, value: string): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      await window.CrazyGames.SDK.data.setItem(key, value);
    } else {
      // Fallback to localStorage
      localStorage.setItem(`cg_${key}`, value);
    }
  }, [isAvailable]);

  const loadData = useCallback(async (key: string): Promise<string | null> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.data.getItem(key);
    }
    // Fallback to localStorage
    return localStorage.getItem(`cg_${key}`);
  }, [isAvailable]);

  const removeData = useCallback(async (key: string): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      await window.CrazyGames.SDK.data.removeItem(key);
    } else {
      localStorage.removeItem(`cg_${key}`);
    }
  }, [isAvailable]);

  // User handlers
  const getUser = useCallback(async () => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.user.getUser();
    }
    return null;
  }, [isAvailable]);

  const showAuthPrompt = useCallback(async () => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.user.showAuthPrompt();
    }
    return null;
  }, [isAvailable]);

  const isUserAccountAvailable = useCallback(async (): Promise<boolean> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.user.isUserAccountAvailable();
    }
    return false;
  }, [isAvailable]);

  const value: CrazyGamesContextType = {
    isAvailable,
    environment,
    isLoading,
    gameplayStart,
    gameplayStop,
    loadingStart,
    loadingStop,
    happyTime,
    showMidgameAd,
    showRewardedAd,
    hasAdblock,
    saveData,
    loadData,
    removeData,
    getUser,
    showAuthPrompt,
    isUserAccountAvailable,
  };

  return (
    <CrazyGamesContext.Provider value={value}>
      {children}
    </CrazyGamesContext.Provider>
  );
}

/**
 * Hook to access CrazyGames SDK functionality
 */
export function useCrazyGames(): CrazyGamesContextType {
  const context = useContext(CrazyGamesContext);
  if (!context) {
    // Return a no-op implementation when not in provider
    return {
      isAvailable: false,
      environment: null,
      isLoading: false,
      gameplayStart: () => {},
      gameplayStop: () => {},
      loadingStart: () => {},
      loadingStop: () => {},
      happyTime: () => {},
      showMidgameAd: (callbacks) => callbacks?.adFinished?.(),
      showRewardedAd: (callbacks) => callbacks?.adError?.('SDK not available'),
      hasAdblock: async () => false,
      saveData: async () => {},
      loadData: async () => null,
      removeData: async () => {},
      getUser: async () => null,
      showAuthPrompt: async () => null,
      isUserAccountAvailable: async () => false,
    };
  }
  return context;
}

/**
 * Utility to check if we're running on CrazyGames platform
 */
export function isCrazyGamesEnvironment(): boolean {
  return CRAZYGAMES_ENABLED && typeof window !== 'undefined' && !!window.CrazyGames?.SDK;
}

export default CrazyGamesScript;
