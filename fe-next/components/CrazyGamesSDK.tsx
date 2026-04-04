'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useCrazyGamesViewport } from '@/hooks/useCrazyGamesViewport';
import { useCrazyGamesScrollPrevention } from '@/hooks/useCrazyGamesScrollPrevention';
import {
  CRAZYGAMES_NOOP_CONTEXT,
  type CrazyGamesEnvironment,
  type AdCallbacks,
  type InviteLinkParams,
  type CrazyGamesContextType,
  type SystemInfo,
  type FriendsListResponse,
  type CrazyGamesSettings,
  type XsollaOrder,
} from '@/types/crazygames';

// Re-export types for consumers that import from this file
export type { BannerSize, InviteLinkParams, SystemInfo, CrazyGamesFriend, FriendsListResponse, CrazyGamesSettings, XsollaOrder } from '@/types/crazygames';

const CrazyGamesContext = createContext<CrazyGamesContextType | null>(null);

// Force-disable via env var; otherwise auto-detect CrazyGames iframe at runtime
const CRAZYGAMES_FORCE_DISABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'false';

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

  const { deviceType, isLandscape, viewportSize } = useCrazyGamesViewport();
  useCrazyGamesScrollPrevention(environment === 'crazygames');

  // Initialize SDK
  useEffect(() => {
    if (CRAZYGAMES_FORCE_DISABLED) {
      setIsLoading(false);
      return;
    }

    // Fallback: detect CrazyGames iframe via referrer/ancestor origins when SDK fails
    const isCrazyGamesIframe = (): boolean => {
      try {
        // Check ancestor origins (Chrome/Edge)
        if (window.location.ancestorOrigins?.length) {
          for (let i = 0; i < window.location.ancestorOrigins.length; i++) {
            if (window.location.ancestorOrigins[i]?.includes('crazygames.com')) return true;
          }
        }
      } catch { /* cross-origin access denied — expected */ }
      try {
        if (document.referrer?.includes('crazygames.com')) return true;
      } catch { /* noop */ }
      try {
        if (window.self !== window.top && window.__crazyGamesEnvironment === 'crazygames') return true;
      } catch { /* cross-origin — likely an iframe */ }
      return false;
    };

    const checkSDK = async () => {
      let attempts = 0;
      // Non-CG users: bail after 500ms (5 attempts) instead of 5s (50 attempts)
      // CG iframe users get the full 5s to allow slow SDK loads
      const quickBailAttempts = 5;
      const maxAttempts = 50;

      while (!window.CrazyGames?.SDK && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        // Early exit: if not in a CG iframe and SDK hasn't appeared after 500ms, stop waiting
        if (attempts === quickBailAttempts && !window.CrazyGames?.SDK && !isCrazyGamesIframe()) {
          break;
        }
      }

      if (window.CrazyGames?.SDK) {
        try {
          // Always init — SDK state resets on soft navigations even if env is cached
          await window.CrazyGames.SDK.init();
          if (!window.__crazyGamesEnvironment) {
            const env = await window.CrazyGames.SDK.getEnvironment();
            window.__crazyGamesEnvironment = env;
          }

          const env = window.__crazyGamesEnvironment!;
          setEnvironment(env);
          setIsAvailable(env !== 'disabled');
          try {
            setIsInstantMultiplayer(!!window.CrazyGames.SDK.game.isInstantMultiplayer);
          } catch {
            setIsInstantMultiplayer(false);
          }

          // Persist invite params to sessionStorage so they survive route changes
          try {
            const params = window.CrazyGames.SDK.game.inviteParams;
            if (params && Object.keys(params).length > 0) {
              sessionStorage.setItem('cg_invite_params', JSON.stringify(params));
            }
          } catch { /* SDK not ready or sessionStorage unavailable */ }
        } catch {
          setIsAvailable(false);
        }
      } else if (isCrazyGamesIframe()) {
        // SDK failed to load but we're definitely on CrazyGames — hide external auth
        setEnvironment('crazygames');
        setIsAvailable(false);
      }
      setIsLoading(false);

      // Signal loading complete — bootstrap calls sdkGameLoadingStart() early
      if (window.CrazyGames?.SDK && window.__crazyGamesEnvironment === 'crazygames') {
        try { window.CrazyGames.SDK.game.sdkGameLoadingStop(); } catch { /* noop */ }
      }
    };

    checkSDK();
  }, []);

  // Gameplay event handlers
  const gameplayStart = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.gameplayStart();
  }, [isAvailable]);

  const gameplayStop = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.gameplayStop();
  }, [isAvailable]);

  const loadingStart = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.loadingStart();
  }, [isAvailable]);

  const loadingStop = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.loadingStop();
  }, [isAvailable]);

  const happyTime = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.happyTime();
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
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.ad.hasAdblock();
    return false;
  }, [isAvailable]);

  // Data persistence handlers
  const saveData = useCallback(async (key: string, value: string): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      await window.CrazyGames.SDK.data.setItem(key, value);
    } else {
      localStorage.setItem(`cg_${key}`, value);
    }
  }, [isAvailable]);

  const loadData = useCallback(async (key: string): Promise<string | null> => {
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.data.getItem(key);
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
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.user.getUser();
    return null;
  }, [isAvailable]);

  const showAuthPrompt = useCallback(async () => {
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.user.showAuthPrompt();
    return null;
  }, [isAvailable]);

  const isUserAccountAvailable = useCallback(async (): Promise<boolean> => {
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.user.isUserAccountAvailable();
    return false;
  }, [isAvailable]);

  const getSystemInfo = useCallback(async (): Promise<SystemInfo | null> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      if (window.CrazyGames.SDK.user.systemInfo) return window.CrazyGames.SDK.user.systemInfo;
      return window.CrazyGames.SDK.user.getSystemInfo();
    }
    return null;
  }, [isAvailable]);

  // Banner ad handlers
  const requestBanner = useCallback((containerId: string, width: number, height: number) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.banner.requestBanner({ id: containerId, width, height });
  }, [isAvailable]);

  const requestResponsiveBanner = useCallback((containerId: string) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.banner.requestResponsiveBanner(containerId);
  }, [isAvailable]);

  const clearBanner = useCallback((containerId: string) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.banner.clearBanner(containerId);
  }, [isAvailable]);

  const clearAllBanners = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.banner.clearAllBanners();
  }, [isAvailable]);

  // Invite link handlers
  const inviteLink = useCallback((params: InviteLinkParams): string | null => {
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.game.inviteLink(params);
    return null;
  }, [isAvailable]);

  const showInviteButton = useCallback((params: InviteLinkParams) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.showInviteButton(params);
  }, [isAvailable]);

  const hideInviteButton = useCallback(() => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.hideInviteButton();
  }, [isAvailable]);

  const getInviteParam = useCallback((paramName: string): string | null => {
    if (isAvailable && window.CrazyGames?.SDK) {
      const value = window.CrazyGames.SDK.game.getInviteParam(paramName);
      if (value) return value;
    }
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
    try {
      const stored = sessionStorage.getItem('cg_invite_params');
      if (stored) return JSON.parse(stored) as Record<string, string>;
    } catch { /* sessionStorage unavailable */ }
    return null;
  }, [isAvailable]);

  // Mid-session join room listener
  const addJoinRoomListener = useCallback((callback: (params: Record<string, string>) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.addJoinRoomListener(callback);
  }, [isAvailable]);

  const removeJoinRoomListener = useCallback((callback: (params: Record<string, string>) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.removeJoinRoomListener(callback);
  }, [isAvailable]);

  // Platform settings
  const getSettings = useCallback((): CrazyGamesSettings | null => {
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.game.settings ?? null;
    return null;
  }, [isAvailable]);

  const addSettingsChangeListener = useCallback((callback: (key: string, value: unknown) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.addSettingsChangeListener(callback);
  }, [isAvailable]);

  const removeSettingsChangeListener = useCallback((callback: (key: string, value: unknown) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.game.removeSettingsChangeListener(callback);
  }, [isAvailable]);

  // Auth listener
  const addAuthListener = useCallback((callback: (user: { username: string; profilePictureUrl: string }) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.user.addAuthListener(callback);
  }, [isAvailable]);

  const removeAuthListener = useCallback((callback: (user: { username: string; profilePictureUrl: string }) => void) => {
    if (isAvailable && window.CrazyGames?.SDK) window.CrazyGames.SDK.user.removeAuthListener(callback);
  }, [isAvailable]);

  // Server-side auth token
  const getUserToken = useCallback(async (): Promise<string | null> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      try {
        const token = await window.CrazyGames.SDK.user.getUserToken();
        if (token && typeof token === 'string' && token.length > 0) return token;
        return null;
      } catch { return null; }
    }
    return null;
  }, [isAvailable]);

  // Friends list
  const listFriends = useCallback(async (page?: number, size?: number): Promise<FriendsListResponse> => {
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.user.listFriends(page, size);
    return { friends: [], hasMore: false };
  }, [isAvailable]);

  // Account linking
  const showAccountLinkPrompt = useCallback(async (): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK) await window.CrazyGames.SDK.user.showAccountLinkPrompt();
  }, [isAvailable]);

  // In-game purchases (Xsolla)
  const getXsollaUserToken = useCallback(async (): Promise<string | null> => {
    if (isAvailable && window.CrazyGames?.SDK?.payment) return window.CrazyGames.SDK.payment.getXsollaUserToken();
    return null;
  }, [isAvailable]);

  const trackOrder = useCallback(async (provider: string, order: XsollaOrder): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK?.payment) await window.CrazyGames.SDK.payment.trackOrder(provider, order);
  }, [isAvailable]);

  const value: CrazyGamesContextType = {
    isAvailable,
    isOnCrazyGamesPlatform: environment === 'crazygames',
    environment,
    isLoading,
    deviceType,
    isLandscape,
    viewportSize,
    gameplayStart, gameplayStop, loadingStart, loadingStop, happyTime,
    showMidgameAd, showRewardedAd, hasAdblock,
    requestBanner, requestResponsiveBanner, clearBanner, clearAllBanners,
    saveData, loadData, removeData,
    getUser, showAuthPrompt, isUserAccountAvailable, getSystemInfo,
    inviteLink, showInviteButton, hideInviteButton, getInviteParam, getInviteParams,
    isInstantMultiplayer,
    addJoinRoomListener, removeJoinRoomListener,
    getSettings, addSettingsChangeListener, removeSettingsChangeListener,
    addAuthListener, removeAuthListener,
    getUserToken, listFriends, showAccountLinkPrompt,
    getXsollaUserToken, trackOrder,
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
  if (!context) return CRAZYGAMES_NOOP_CONTEXT;
  return context;
}

/**
 * Utility to check if we're running on CrazyGames platform (runtime detection)
 * @deprecated Prefer using `useCrazyGames().isOnCrazyGamesPlatform` in React components
 */
export function isCrazyGamesEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.__crazyGamesEnvironment === 'crazygames';
}

/**
 * Check if external login should be hidden (CrazyGames requirement)
 * @deprecated Prefer using `useCrazyGames().isOnCrazyGamesPlatform` in React components
 */
export function shouldHideExternalLogin(): boolean {
  return isCrazyGamesEnvironment();
}

export default CrazyGamesProvider;
