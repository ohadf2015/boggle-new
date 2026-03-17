'use client';

import Script from 'next/script';
import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useCrazyGamesViewport, type CrazyGamesDeviceType } from '@/hooks/useCrazyGamesViewport';

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
      src="https://sdk.crazygames.com/crazygames-sdk-v3.js"
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
  const [isInstantMultiplayer, setIsInstantMultiplayer] = useState(false);

  // Use viewport hook for CrazyGames-specific viewport handling
  const { deviceType, isLandscape, viewportSize } = useCrazyGamesViewport();

  // Initialize SDK and set up CrazyGames-specific handlers
  useEffect(() => {
    if (!CRAZYGAMES_ENABLED) {
      setIsLoading(false);
      return;
    }

    // Add CrazyGames-specific CSS class to body for mobile optimizations
    document.body.classList.add('crazygames-embed');

    // Prevent page scrolling (CrazyGames requirement)
    // But allow scrolling within scrollable containers
    const preventScroll = (event: WheelEvent) => {
      // Check if the event target or any parent is a scrollable container
      let target = event.target as HTMLElement | null;

      while (target && target !== document.body) {
        const style = window.getComputedStyle(target);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;

        // Check if this element is scrollable
        const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight;
        const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && target.scrollWidth > target.clientWidth;

        if (isScrollableY || isScrollableX) {
          // Check if we can scroll in the direction the user is trying to scroll
          if (event.deltaY !== 0 && isScrollableY) {
            const canScrollUp = target.scrollTop > 0;
            const canScrollDown = target.scrollTop < target.scrollHeight - target.clientHeight;

            if ((event.deltaY < 0 && canScrollUp) || (event.deltaY > 0 && canScrollDown)) {
              // Allow this scroll event - we're inside a scrollable container
              return;
            }
          }

          if (event.deltaX !== 0 && isScrollableX) {
            const canScrollLeft = target.scrollLeft > 0;
            const canScrollRight = target.scrollLeft < target.scrollWidth - target.clientWidth;

            if ((event.deltaX < 0 && canScrollLeft) || (event.deltaX > 0 && canScrollRight)) {
              // Allow this scroll event - we're inside a scrollable container
              return;
            }
          }
        }

        target = target.parentElement;
      }

      // Prevent page-level scrolling
      event.preventDefault();
    };

    const preventKeyScroll = (event: KeyboardEvent) => {
      // Check if the active element or event target is within a scrollable container
      const activeElement = document.activeElement as HTMLElement | null;
      const target = (event.target as HTMLElement) || activeElement;

      if (target) {
        let element: HTMLElement | null = target;

        while (element && element !== document.body) {
          const style = window.getComputedStyle(element);
          const overflowY = style.overflowY;

          // If we're inside a scrollable container, allow keyboard scrolling
          if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
            return;
          }

          element = element.parentElement;
        }
      }

      // Only prevent keyboard scroll for page-level scrolling
      if (['ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown'].includes(event.key)) {
        event.preventDefault();
      }
    };

    // Helper to check if an element is a scrollable container
    const isScrollableElement = (element: HTMLElement | null): boolean => {
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;

        if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
          return true;
        }

        element = element.parentElement;
      }
      return false;
    };

    // Track touch start position for touch scroll prevention
    let touchStartY = 0;
    let touchStartElement: HTMLElement | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchStartY = event.touches[0].clientY;
        touchStartElement = event.target as HTMLElement;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !touchStartElement) return;

      // Check if we're inside a scrollable container
      if (isScrollableElement(touchStartElement)) {
        // Find the scrollable container
        let element: HTMLElement | null = touchStartElement;
        while (element && element !== document.body) {
          const style = window.getComputedStyle(element);
          const overflowY = style.overflowY;

          if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
            const touchY = event.touches[0].clientY;
            const deltaY = touchStartY - touchY;

            const canScrollUp = element.scrollTop > 0;
            const canScrollDown = element.scrollTop < element.scrollHeight - element.clientHeight;

            // Allow scroll if we can scroll in that direction
            if ((deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp)) {
              return; // Allow scroll
            }
            break;
          }

          element = element.parentElement;
        }
      }

      // Prevent page-level touch scrolling
      event.preventDefault();
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('keydown', preventKeyScroll);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

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
          // Cache environment on window for utility function access
          window.__crazyGamesEnvironment = env;
          setEnvironment(env);
          setIsAvailable(env !== 'disabled');

          // Check for instant multiplayer mode
          const instantMultiplayer = window.CrazyGames.SDK.game.isInstantMultiplayer;
          setIsInstantMultiplayer(!!instantMultiplayer);

          // Signal loading lifecycle to CrazyGames
          if (env === 'crazygames') {
            // sdkGameLoadingStart must be called before sdkGameLoadingStop
            // This signals to CrazyGames that the game is actively loading
            window.CrazyGames.SDK.game.sdkGameLoadingStart();
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
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
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
      return window.CrazyGames.SDK.game.getInviteParam(paramName);
    }
    return null;
  }, [isAvailable]);

  const getInviteParams = useCallback((): Record<string, string> | null => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.game.inviteParams ?? null;
    }
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

  // Server-side auth token
  const getUserToken = useCallback(async (): Promise<string | null> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK.user.getUserToken();
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
