'use client';

import Script from 'next/script';
import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useCrazyGamesViewport, type CrazyGamesDeviceType } from '@/hooks/useCrazyGamesViewport';
import { useCrazyGamesScrollPrevention } from '@/hooks/useCrazyGamesScrollPrevention';

// CrazyGames SDK Type Definitions
declare global {
  interface Window {
    CrazyGames?: {
      SDK: CrazyGamesSDK;
    };
    /** Cached CrazyGames environment for utility function access */
    __crazyGamesEnvironment?: CrazyGamesEnvironment;
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

// Standard banner sizes supported by CrazyGames
export type BannerSize =
  | '728x90'   // Leaderboard
  | '300x250'  // Medium Rectangle
  | '320x50'   // Mobile Banner
  | '468x60'   // Main Banner
  | '320x100'  // Large Mobile Banner
  | '160x600'  // Wide Skyscraper
  | '336x280'  // Large Rectangle
  | '300x600'  // Half Page
  | '970x90'   // Large Leaderboard
  | '970x250'  // Billboard
  | '250x250'  // Square
  | '120x600'; // Skyscraper

// Invite link parameters for multiplayer
export interface InviteLinkParams {
  roomId?: string;
  [key: string]: string | undefined;
}

// System info returned by SDK
export interface SystemInfo {
  countryCode: string;
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  device: {
    type: 'desktop' | 'tablet' | 'mobile';
  };
}

// CrazyGames friend object
export interface CrazyGamesFriend {
  id: string;
  username: string;
  profilePictureUrl: string;
}

// CrazyGames friends list response
export interface FriendsListResponse {
  friends: CrazyGamesFriend[];
  hasMore: boolean;
}

// Platform settings from CrazyGames
export interface CrazyGamesSettings {
  muteAudio: boolean;
  disableChat: boolean;
}

// Xsolla purchase tracking
export interface XsollaOrder {
  orderId: string;
  [key: string]: unknown;
}

interface CrazyGamesSDK {
  init: () => Promise<void>;
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
    // Invite link features
    inviteLink: (params: InviteLinkParams) => string;
    showInviteButton: (params: InviteLinkParams) => void;
    hideInviteButton: () => void;
    getInviteParam: (paramName: string) => string | null;
    inviteParams?: Record<string, string>;
    // Instant multiplayer flag
    isInstantMultiplayer: boolean;
    // Mid-session join room listener
    addJoinRoomListener: (callback: (params: Record<string, string>) => void) => void;
    removeJoinRoomListener: (callback: (params: Record<string, string>) => void) => void;
    // Platform settings
    settings: CrazyGamesSettings;
    addSettingsChangeListener: (callback: (key: string, value: unknown) => void) => void;
    removeSettingsChangeListener: (callback: (key: string, value: unknown) => void) => void;
  };
  user: {
    isUserAccountAvailable: () => Promise<boolean>;
    getUser: () => Promise<{ username: string; profilePictureUrl: string } | null>;
    showAuthPrompt: () => Promise<{ username: string; profilePictureUrl: string } | null>;
    getSystemInfo: () => Promise<SystemInfo>;
    systemInfo?: SystemInfo;
    getUserToken: () => Promise<string | null>;
    listFriends: (page?: number, size?: number) => Promise<FriendsListResponse>;
    addAuthListener: (callback: (user: { username: string; profilePictureUrl: string }) => void) => void;
    removeAuthListener: (callback: (user: { username: string; profilePictureUrl: string }) => void) => void;
    showAccountLinkPrompt: () => Promise<void>;
  };
  data: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  payment?: {
    getXsollaUserToken: () => Promise<string | null>;
    trackOrder: (provider: string, order: XsollaOrder) => Promise<void>;
  };
}

// Context types
interface CrazyGamesContextType {
  isAvailable: boolean;
  /** True only when actually running on CrazyGames platform (not local/standalone) */
  isOnCrazyGamesPlatform: boolean;
  environment: CrazyGamesEnvironment | null;
  isLoading: boolean;
  // Viewport information (based on iframe size, not parent window)
  /** Device type based on iframe viewport (not parent window) */
  deviceType: CrazyGamesDeviceType;
  /** Whether viewport is landscape orientation */
  isLandscape: boolean;
  /** Current viewport dimensions */
  viewportSize: { width: number; height: number };
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
  // Banner ads
  requestBanner: (containerId: string, width: number, height: number) => void;
  requestResponsiveBanner: (containerId: string) => void;
  clearBanner: (containerId: string) => void;
  clearAllBanners: () => void;
  // Data persistence
  saveData: (key: string, value: string) => Promise<void>;
  loadData: (key: string) => Promise<string | null>;
  removeData: (key: string) => Promise<void>;
  // User
  getUser: () => Promise<{ username: string; profilePictureUrl: string } | null>;
  showAuthPrompt: () => Promise<{ username: string; profilePictureUrl: string } | null>;
  isUserAccountAvailable: () => Promise<boolean>;
  getSystemInfo: () => Promise<SystemInfo | null>;
  getUserToken: () => Promise<string | null>;
  listFriends: (page?: number, size?: number) => Promise<FriendsListResponse>;
  showAccountLinkPrompt: () => Promise<void>;
  // Invite links & multiplayer
  inviteLink: (params: InviteLinkParams) => string | null;
  showInviteButton: (params: InviteLinkParams) => void;
  hideInviteButton: () => void;
  getInviteParam: (paramName: string) => string | null;
  getInviteParams: () => Record<string, string> | null;
  isInstantMultiplayer: boolean;
  addJoinRoomListener: (callback: (params: Record<string, string>) => void) => void;
  removeJoinRoomListener: (callback: (params: Record<string, string>) => void) => void;
  // Platform settings
  getSettings: () => CrazyGamesSettings | null;
  addSettingsChangeListener: (callback: (key: string, value: unknown) => void) => void;
  removeSettingsChangeListener: (callback: (key: string, value: unknown) => void) => void;
  // Auth listener
  addAuthListener: (callback: (user: { username: string; profilePictureUrl: string }) => void) => void;
  removeAuthListener: (callback: (user: { username: string; profilePictureUrl: string }) => void) => void;
  // In-game purchases (Xsolla)
  getXsollaUserToken: () => Promise<string | null>;
  trackOrder: (provider: string, order: XsollaOrder) => Promise<void>;
}

const CrazyGamesContext = createContext<CrazyGamesContextType | null>(null);

// Force-disable via env var; otherwise auto-detect CrazyGames iframe at runtime
const CRAZYGAMES_FORCE_DISABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'false';

/**
 * CrazyGames SDK Script Component
 *
 * Always loads the SDK script unless explicitly disabled via
 * NEXT_PUBLIC_CRAZYGAMES_ENABLED=false. The SDK self-detects whether
 * it's running inside a CrazyGames iframe and reports environment
 * accordingly ('crazygames' | 'disabled').
 */
/**
 * Initialize the SDK as soon as the script loads — regardless of which page
 * the player lands on. CrazyGames QA requires init() to be called early;
 * deferring it until CrazyGamesProvider mounts (game routes only) causes
 * "SDK not detected" failures when entering via the landing page.
 */
async function initSDKOnLoad() {
  const sdk = window.CrazyGames?.SDK;
  if (!sdk) return;

  try {
    await sdk.init();
    const env = await sdk.getEnvironment();
    window.__crazyGamesEnvironment = env;

    if (env === 'crazygames') {
      document.body.classList.add('crazygames-embed');
      sdk.game.sdkGameLoadingStart();
      const signalReady = () => sdk.game?.sdkGameLoadingStop();
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(signalReady, { timeout: 3000 });
      } else {
        setTimeout(signalReady, 1000);
      }
    }
  } catch {
    // SDK init failed — game continues without SDK features
  }
}

export function CrazyGamesScript() {
  if (CRAZYGAMES_FORCE_DISABLED) {
    return null;
  }

  return (
    <Script
      src="https://sdk.crazygames.com/crazygames-sdk-v3.js"
      strategy="afterInteractive"
      id="crazygames-sdk"
      onLoad={() => { initSDKOnLoad(); }}
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
  const [isInstantMultiplayer, setIsInstantMultiplayer] = useState(false);

  // Use viewport hook for CrazyGames-specific viewport handling
  const { deviceType, isLandscape, viewportSize } = useCrazyGamesViewport();

  // Prevent page scrolling in CrazyGames iframe (delegates to dedicated hook)
  useCrazyGamesScrollPrevention(!CRAZYGAMES_FORCE_DISABLED);

  // Initialize SDK and set up CrazyGames-specific handlers
  useEffect(() => {
    if (CRAZYGAMES_FORCE_DISABLED) {
      setIsLoading(false);
      return;
    }

    // CSS class added by initSDKOnLoad — no need to duplicate here

    const checkSDK = async () => {
      // Wait for SDK to load (init() is called by CrazyGamesScript onLoad)
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max

      while (!window.CrazyGames?.SDK && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (window.CrazyGames?.SDK) {
        try {
          // init() may already have been called by CrazyGamesScript onLoad.
          // If not (e.g., provider mounted before script loaded), call it now.
          if (!window.__crazyGamesEnvironment) {
            await window.CrazyGames.SDK.init();
            const env = await window.CrazyGames.SDK.getEnvironment();
            window.__crazyGamesEnvironment = env;
          }

          const env = window.__crazyGamesEnvironment!;
          setEnvironment(env);
          setIsAvailable(env !== 'disabled');

          // Check for instant multiplayer mode
          const instantMultiplayer = window.CrazyGames.SDK.game.isInstantMultiplayer;
          setIsInstantMultiplayer(!!instantMultiplayer);

          // Persist invite params to sessionStorage so they survive route changes
          const params = window.CrazyGames.SDK.game.inviteParams;
          if (params && Object.keys(params).length > 0) {
            try {
              sessionStorage.setItem('cg_invite_params', JSON.stringify(params));
            } catch { /* sessionStorage unavailable */ }
          }
        } catch {
          setIsAvailable(false);
        }
      }
      setIsLoading(false);
    };

    checkSDK();

    return () => {
      // crazygames-embed class is managed by initSDKOnLoad, not this provider
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

  // System info handler
  const getSystemInfo = useCallback(async (): Promise<SystemInfo | null> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      // Try direct property first (v3 SDK), then fall back to method
      if (window.CrazyGames.SDK.user.systemInfo) {
        return window.CrazyGames.SDK.user.systemInfo;
      }
      return window.CrazyGames.SDK.user.getSystemInfo();
    }
    return null;
  }, [isAvailable]);

  // Banner ad handlers
  const requestBanner = useCallback((containerId: string, width: number, height: number) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.banner.requestBanner({ id: containerId, width, height });
    }
  }, [isAvailable]);

  const requestResponsiveBanner = useCallback((containerId: string) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.banner.requestResponsiveBanner(containerId);
    }
  }, [isAvailable]);

  const clearBanner = useCallback((containerId: string) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.banner.clearBanner(containerId);
    }
  }, [isAvailable]);

  const clearAllBanners = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.banner.clearAllBanners();
    }
  }, [isAvailable]);

  // Invite link handlers
  const inviteLink = useCallback((params: InviteLinkParams): string | null => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.game.inviteLink(params);
    }
    return null;
  }, [isAvailable]);

  const showInviteButton = useCallback((params: InviteLinkParams) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.showInviteButton(params);
    }
  }, [isAvailable]);

  const hideInviteButton = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.hideInviteButton();
    }
  }, [isAvailable]);

  const getInviteParam = useCallback((paramName: string): string | null => {
    if (isAvailable && window.CrazyGames?.SDK) {
      const value = window.CrazyGames.SDK.game.getInviteParam(paramName);
      if (value) return value;
    }
    // Fallback: check sessionStorage (invite params persisted on SDK init)
    try {
      const stored = sessionStorage.getItem('cg_invite_params');
      if (stored) {
        const params = JSON.parse(stored) as Record<string, string>;
        return params[paramName] ?? null;
      }
    } catch { /* sessionStorage unavailable */ }
    return null;
  }, [isAvailable]);

  const getInviteParams = useCallback((): Record<string, string> | null => {
    if (isAvailable && window.CrazyGames?.SDK) {
      const params = window.CrazyGames.SDK.game.inviteParams;
      if (params && Object.keys(params).length > 0) return params;
    }
    // Fallback: check sessionStorage
    try {
      const stored = sessionStorage.getItem('cg_invite_params');
      if (stored) return JSON.parse(stored) as Record<string, string>;
    } catch { /* sessionStorage unavailable */ }
    return null;
  }, [isAvailable]);

  // Mid-session join room listener
  const addJoinRoomListener = useCallback((callback: (params: Record<string, string>) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.addJoinRoomListener(callback);
    }
  }, [isAvailable]);

  const removeJoinRoomListener = useCallback((callback: (params: Record<string, string>) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.removeJoinRoomListener(callback);
    }
  }, [isAvailable]);

  // Platform settings
  const getSettings = useCallback((): CrazyGamesSettings | null => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.game.settings ?? null;
    }
    return null;
  }, [isAvailable]);

  const addSettingsChangeListener = useCallback((callback: (key: string, value: unknown) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.addSettingsChangeListener(callback);
    }
  }, [isAvailable]);

  const removeSettingsChangeListener = useCallback((callback: (key: string, value: unknown) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.removeSettingsChangeListener(callback);
    }
  }, [isAvailable]);

  // Auth listener for mid-session login
  const addAuthListener = useCallback((callback: (user: { username: string; profilePictureUrl: string }) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.user.addAuthListener(callback);
    }
  }, [isAvailable]);

  const removeAuthListener = useCallback((callback: (user: { username: string; profilePictureUrl: string }) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.user.removeAuthListener(callback);
    }
  }, [isAvailable]);

  // Server-side auth token (validated non-empty before returning)
  const getUserToken = useCallback(async (): Promise<string | null> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      try {
        const token = await window.CrazyGames.SDK.user.getUserToken();
        if (token && typeof token === 'string' && token.length > 0) {
          return token;
        }
        return null;
      } catch {
        return null;
      }
    }
    return null;
  }, [isAvailable]);

  // Friends list
  const listFriends = useCallback(async (page?: number, size?: number): Promise<FriendsListResponse> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.user.listFriends(page, size);
    }
    return { friends: [], hasMore: false };
  }, [isAvailable]);

  // Account linking
  const showAccountLinkPrompt = useCallback(async (): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      await window.CrazyGames.SDK.user.showAccountLinkPrompt();
    }
  }, [isAvailable]);

  // In-game purchases (Xsolla)
  const getXsollaUserToken = useCallback(async (): Promise<string | null> => {
    if (isAvailable && window.CrazyGames?.SDK?.payment) {
      return window.CrazyGames.SDK.payment.getXsollaUserToken();
    }
    return null;
  }, [isAvailable]);

  const trackOrder = useCallback(async (provider: string, order: XsollaOrder): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK?.payment) {
      await window.CrazyGames.SDK.payment.trackOrder(provider, order);
    }
  }, [isAvailable]);

  const value: CrazyGamesContextType = {
    isAvailable,
    isOnCrazyGamesPlatform: environment === 'crazygames',
    environment,
    isLoading,
    // Viewport information
    deviceType,
    isLandscape,
    viewportSize,
    // Gameplay events
    gameplayStart,
    gameplayStop,
    loadingStart,
    loadingStop,
    happyTime,
    // Video ads
    showMidgameAd,
    showRewardedAd,
    hasAdblock,
    // Banner ads
    requestBanner,
    requestResponsiveBanner,
    clearBanner,
    clearAllBanners,
    // Data persistence
    saveData,
    loadData,
    removeData,
    // User
    getUser,
    showAuthPrompt,
    isUserAccountAvailable,
    getSystemInfo,
    // Invite links & multiplayer
    inviteLink,
    showInviteButton,
    hideInviteButton,
    getInviteParam,
    getInviteParams,
    isInstantMultiplayer,
    addJoinRoomListener,
    removeJoinRoomListener,
    // Platform settings
    getSettings,
    addSettingsChangeListener,
    removeSettingsChangeListener,
    // Auth listener
    addAuthListener,
    removeAuthListener,
    // User (new)
    getUserToken,
    listFriends,
    showAccountLinkPrompt,
    // In-game purchases
    getXsollaUserToken,
    trackOrder,
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
      isOnCrazyGamesPlatform: false,
      environment: null,
      isLoading: false,
      // Viewport information
      deviceType: 'desktop',
      isLandscape: true,
      viewportSize: { width: 1024, height: 768 },
      // Gameplay events
      gameplayStart: () => {},
      gameplayStop: () => {},
      loadingStart: () => {},
      loadingStop: () => {},
      happyTime: () => {},
      // Video ads
      showMidgameAd: (callbacks) => callbacks?.adFinished?.(),
      showRewardedAd: (callbacks) => callbacks?.adError?.('SDK not available'),
      hasAdblock: async () => false,
      // Banner ads
      requestBanner: () => {},
      requestResponsiveBanner: () => {},
      clearBanner: () => {},
      clearAllBanners: () => {},
      // Data persistence
      saveData: async () => {},
      loadData: async () => null,
      removeData: async () => {},
      // User
      getUser: async () => null,
      showAuthPrompt: async () => null,
      isUserAccountAvailable: async () => false,
      getSystemInfo: async () => null,
      // Invite links & multiplayer
      inviteLink: () => null,
      showInviteButton: () => {},
      hideInviteButton: () => {},
      getInviteParam: () => null,
      getInviteParams: () => null,
      isInstantMultiplayer: false,
      addJoinRoomListener: () => {},
      removeJoinRoomListener: () => {},
      // Platform settings
      getSettings: () => null,
      addSettingsChangeListener: () => {},
      removeSettingsChangeListener: () => {},
      // Auth listener
      addAuthListener: () => {},
      removeAuthListener: () => {},
      // User (new)
      getUserToken: async () => null,
      listFriends: async () => ({ friends: [], hasMore: false }),
      showAccountLinkPrompt: async () => {},
      // In-game purchases
      getXsollaUserToken: async () => null,
      trackOrder: async () => {},
    };
  }
  return context;
}

/**
 * Utility to check if we're running on CrazyGames platform (runtime detection)
 * Uses the cached environment from SDK.getEnvironment() - returns true only when
 * actually running on CrazyGames portal, not when running locally with SDK enabled.
 *
 * @deprecated Prefer using `useCrazyGames().isOnCrazyGamesPlatform` in React components
 */
export function isCrazyGamesEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  // Use cached runtime environment - only true when SDK reports 'crazygames'
  return window.__crazyGamesEnvironment === 'crazygames';
}

/**
 * Check if external login should be hidden (CrazyGames requirement)
 * Returns true only when actually on CrazyGames portal - use to hide login modals, signup prompts, etc.
 *
 * @deprecated Prefer using `useCrazyGames().isOnCrazyGamesPlatform` in React components
 */
export function shouldHideExternalLogin(): boolean {
  return isCrazyGamesEnvironment();
}

export default CrazyGamesScript;
