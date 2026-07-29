'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useCrazyGamesViewport } from '@/hooks/useCrazyGamesViewport';
import { useCrazyGamesScrollPrevention } from '@/hooks/useCrazyGamesScrollPrevention';
import { trackAdLifecycle, setPostHogSuperProps, type AdType } from '@/utils/posthogEngagement';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  CRAZYGAMES_NOOP_CONTEXT,
  type CrazyGamesEnvironment,
  type AdCallbacks,
  type InviteLinkParams,
  type CrazyGamesContextType,
  type SystemInfo,
  type FriendsListResponse,
  type CrazyGamesSettings,
} from '@/types/crazygames';

// Re-export types for consumers that import from this file
export type { BannerSize, InviteLinkParams, SystemInfo, CrazyGamesFriend, FriendsListResponse, CrazyGamesSettings } from '@/types/crazygames';

const CrazyGamesContext = createContext<CrazyGamesContextType | null>(null);

// Force-disable via env var; otherwise auto-detect CrazyGames iframe at runtime
const CRAZYGAMES_FORCE_DISABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'false';

// Synchronous iframe detection used for SSR-safe initial state so CG-specific UI
// (hidden external auth, scroll prevention) is correct on first paint.
export function detectCrazyGamesSync(): boolean {
  if (typeof window === 'undefined') return false;

  // NB: do NOT honor `NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'true'` here.
  // That env var only controls SDK script loading (see next.config.mjs); using
  // it as a force-on for embed detection inlines `true` into every prod client
  // and mis-declares all devices as CrazyGames embeds → hides global nav,
  // mobile menu, and external auth on the public site. Use `?cg=1` for QA.

  // Dev/QA override: ?crazygames=1 persists to sessionStorage + window flag
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('crazygames') === '1' || params.get('cg') === '1') {
      window.__crazyGamesEnvironment = 'crazygames';
      try { sessionStorage.setItem('__cg_override', '1'); } catch { /* noop */ }
      return true;
    }
    if (sessionStorage.getItem('__cg_override') === '1') {
      window.__crazyGamesEnvironment = 'crazygames';
      return true;
    }
  } catch { /* noop */ }

  try {
    if (window.location.ancestorOrigins?.length) {
      for (let i = 0; i < window.location.ancestorOrigins.length; i++) {
        if (window.location.ancestorOrigins[i]?.includes('crazygames.com')) return true;
      }
    }
  } catch { /* cross-origin access denied */ }
  try {
    if (document.referrer?.includes('crazygames.com')) return true;
  } catch { /* noop */ }
  try {
    if (window.__crazyGamesEnvironment === 'crazygames') return true;
  } catch { /* noop */ }
  try {
    const host = window.location?.hostname;
    if (host === 'icecream.me' || host?.endsWith('.icecream.me')) return true;
  } catch { /* noop */ }

  // Iframe fallback: CG embeds us cross-origin. Firefox lacks ancestorOrigins,
  // and strict referrer-policy strips Referer — so the only first-paint signal
  // left is "are we in a cross-origin iframe?". Same-origin iframes (Storybook,
  // Vercel preview) can read parent.location.href; cross-origin throws. Treat
  // any cross-origin iframe as a portal embed (CG, itch, gamejolt, etc.) so
  // external sign-in/sign-up stay hidden until the SDK confirms otherwise.
  try {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      const href = window.location.href;
      if (/crazygames|cg[_-]?embed|icecream/i.test(href)) return true;
      try {
        // Cross-origin parent access throws SecurityError. If readable, parent
        // is same-origin → not a portal embed.
        void window.parent.location.href;
      } catch {
        return true;
      }
    }
  } catch { /* cross-origin top access denied — still an iframe; fall through */ }

  return false;
}

/**
 * CrazyGames SDK Provider
 *
 * Provides access to all CrazyGames SDK features throughout the app.
 * Wrap your app with this provider to use the SDK.
 */
export function CrazyGamesProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  // Sticky iframe detection — if we ever detect we're embedded in CrazyGames,
  // we keep this true regardless of what SDK.getEnvironment() reports later.
  // CG QA preview / `?disable*` flags can flip the SDK env to 'disabled' even
  // though we're still rendered inside crazygames.com — UI policy (hiding
  // external Sign In/Sign Up) must follow embed status, not ad-runtime status.
  const [isInCrazyGamesIframe, setIsInCrazyGamesIframe] = useState<boolean>(
    () => !CRAZYGAMES_FORCE_DISABLED && detectCrazyGamesSync()
  );
  const [environment, setEnvironment] = useState<CrazyGamesEnvironment | null>(
    () => (!CRAZYGAMES_FORCE_DISABLED && detectCrazyGamesSync() ? 'crazygames' : null)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isInstantMultiplayer, setIsInstantMultiplayer] = useState(false);
  const [cgUser, setCgUser] = useState<{ username: string | null } | null>(null);

  const { deviceType, isLandscape, viewportSize } = useCrazyGamesViewport();
  useCrazyGamesScrollPrevention(environment === 'crazygames');

  // Tag every PostHog event with `is_cg` so funnel queries don't have to chain
  // referrer/url filters that drop on cross-domain bounce. Re-fire on every
  // sticky transition so the prop survives async SDK init that lands later
  // than PostHogProvider's 2s platform recheck.
  useEffect(() => {
    if (isInCrazyGamesIframe) setPostHogSuperProps({ is_cg: true });
  }, [isInCrazyGamesIframe]);

  // Initialize SDK
  useEffect(() => {
    if (CRAZYGAMES_FORCE_DISABLED) {
      setIsLoading(false);
      return;
    }

    const isCrazyGamesIframe = detectCrazyGamesSync();

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
        if (attempts === quickBailAttempts && !window.CrazyGames?.SDK && !isCrazyGamesIframe) {
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
          if (env === 'crazygames' || isCrazyGamesIframe) {
            setIsInCrazyGamesIframe(true);
          }
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
      } else if (isCrazyGamesIframe) {
        // SDK failed to load but we're definitely on CrazyGames — hide external auth
        setEnvironment('crazygames');
        setIsAvailable(false);
        setIsInCrazyGamesIframe(true);
      }
      setIsLoading(false);

      // Signal loading complete — bootstrap calls sdkGameLoadingStart() early.
      // Gate on portal-presence not env: CG QA preview / `?disableAds` flips env to
      // 'disabled' while the iframe still shows the portal loader. Skipping Stop in
      // that path leaves the kawaii portal loader hung forever (the original bug).
      // Wait briefly for `__crazyGamesReady` so we don't race the bootstrap's Start.
      const cgReadyDeadline = Date.now() + 500;
      while (!window.__crazyGamesReady && Date.now() < cgReadyDeadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      const inCgPortal =
        window.__crazyGamesEnvironment === 'crazygames' || isCrazyGamesIframe;
      if (window.CrazyGames?.SDK && inCgPortal) {
        const stopFn = window.CrazyGames.SDK.game?.sdkGameLoadingStop;
        if (typeof stopFn === 'function') {
          try {
            stopFn.call(window.CrazyGames.SDK.game);
          } catch (err) {
            // CG SDK internal — non-actionable, warn-level so we surface SDK issues.
            console.warn('[CG] sdkGameLoadingStop failed', err);
          }
        } else {
          // Partial SDK shape (seen on some embeds). Loader still resolves via portal-side timeout.
          console.debug('[CG] sdkGameLoadingStop unavailable on game namespace');
        }
      }
    };

    checkSDK();
  }, []);

  // Fetch CrazyGames user after SDK is ready
  useEffect(() => {
    if (!isAvailable || isLoading) return;

    const fetchCgUser = async () => {
      try {
        if (window.CrazyGames?.SDK) {
          const user = await window.CrazyGames.SDK.user.getUser();
          setCgUser(user ? { username: user.username } : null);
        }
      } catch {
        // Silently ignore errors; cgUser remains null
        setCgUser(null);
      }
    };

    fetchCgUser();
  }, [isAvailable, isLoading]);

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
    if (isAvailable && typeof window.CrazyGames?.SDK?.game?.happyTime === 'function') window.CrazyGames.SDK.game.happyTime();
  }, [isAvailable]);

  const trackEvent = useCallback((eventName: string) => {
    if (isAvailable && typeof window.CrazyGames?.SDK?.game?.trackEvent === 'function') window.CrazyGames.SDK.game.trackEvent(eventName);
  }, [isAvailable]);

  // Ad handlers — wrap callbacks with lifecycle telemetry so PostHog can
  // compute fill rate (shown/requested) and completion rate (completed/shown).
  // CG revenue tracks completion; surfacing skip/error helps tune frequency.
  const wrapAdCallbacks = useCallback((adType: AdType, placement: string, callbacks?: AdCallbacks): AdCallbacks => {
    return {
      adStarted: () => {
        trackAdLifecycle({ event: 'shown', adType, placement });
        callbacks?.adStarted?.();
      },
      adFinished: () => {
        trackAdLifecycle({ event: 'completed', adType, placement });
        callbacks?.adFinished?.();
      },
      adError: (err: string) => {
        trackAdLifecycle({ event: 'error', adType, placement, errorMessage: err });
        callbacks?.adError?.(err);
      },
    };
  }, []);

  const showMidgameAd = useCallback((callbacks?: AdCallbacks, placement: string = 'between_games') => {
    trackAdLifecycle({ event: 'requested', adType: 'midgame', placement });
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.ad.requestAd('midgame', wrapAdCallbacks('midgame', placement, callbacks));
    } else {
      // No SDK → mark as skipped so the funnel reflects denominator correctly.
      trackAdLifecycle({ event: 'skipped', adType: 'midgame', placement });
      callbacks?.adFinished?.();
    }
  }, [isAvailable, wrapAdCallbacks]);

  const showRewardedAd = useCallback((callbacks?: AdCallbacks, placement: string = 'reward') => {
    trackAdLifecycle({ event: 'requested', adType: 'rewarded', placement });
    if (isAvailable && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.ad.requestAd('rewarded', wrapAdCallbacks('rewarded', placement, callbacks));
    } else {
      trackAdLifecycle({ event: 'error', adType: 'rewarded', placement, errorMessage: 'SDK not available' });
      callbacks?.adError?.('SDK not available');
    }
  }, [isAvailable, wrapAdCallbacks]);

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

  const clearData = useCallback(async (): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK) {
      await window.CrazyGames.SDK.data.clear();
    }
  }, [isAvailable]);

  // User handlers
  const getUser = useCallback(async () => {
    if (isAvailable && window.CrazyGames?.SDK) return window.CrazyGames.SDK.user.getUser();
    return null;
  }, [isAvailable]);

  const showAuthPrompt = useCallback(async () => {
    if (!isAvailable || !window.CrazyGames?.SDK) return null;
    const sdkUser = window.CrazyGames.SDK.user;
    try {
      const existing = await sdkUser.getUser();
      if (existing) {
        trackGrowthEvent('cg_auth_prompt_outcome', { result: 'success', via: 'existing_session' });
        return existing;
      }
      const result = await sdkUser.showAuthPrompt();
      trackGrowthEvent('cg_auth_prompt_outcome', { result: result ? 'success' : 'dismiss' });
      return result;
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === 'userAlreadySignedIn') {
        trackGrowthEvent('cg_auth_prompt_outcome', { result: 'already_signed_in' });
        try { return await sdkUser.getUser(); } catch { return null; }
      }
      trackGrowthEvent('cg_auth_prompt_outcome', { result: 'error', errorCode: code ?? 'unknown' });
      return null;
    }
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


  // Leaderboard
  const submitLeaderboardScore = useCallback(async (score: number): Promise<void> => {
    if (isAvailable && window.CrazyGames?.SDK?.leaderboard) {
      await window.CrazyGames.SDK.leaderboard.submitScore(score);
    }
  }, [isAvailable]);

  const value: CrazyGamesContextType = {
    isAvailable,
    // Embed-aware: stays true when SDK env is 'disabled' but the app is still
    // rendered inside a CrazyGames iframe (e.g. CG QA preview, ?disableAds=true).
    isOnCrazyGamesPlatform: environment === 'crazygames' || isInCrazyGamesIframe,
    environment,
    isLoading,
    deviceType,
    isLandscape,
    viewportSize,
    cgUser,
    gameplayStart, gameplayStop, loadingStart, loadingStop, happyTime, trackEvent,
    showMidgameAd, showRewardedAd, hasAdblock,
    requestBanner, requestResponsiveBanner, clearBanner, clearAllBanners,
    saveData, loadData, removeData, clearData,
    getUser, showAuthPrompt, isUserAccountAvailable, getSystemInfo,
    inviteLink, showInviteButton, hideInviteButton, getInviteParam, getInviteParams,
    isInstantMultiplayer,
    addJoinRoomListener, removeJoinRoomListener,
    getSettings, addSettingsChangeListener, removeSettingsChangeListener,
    addAuthListener, removeAuthListener,
    getUserToken, listFriends, showAccountLinkPrompt,
    submitLeaderboardScore,
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
  if (typeof window === 'undefined') return false;
  return window.__crazyGamesEnvironment === 'crazygames';
}

export default CrazyGamesProvider;
