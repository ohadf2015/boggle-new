/**
 * CrazyGames SDK Type Definitions
 *
 * Extracted from CrazyGamesSDK.tsx to keep the provider under 500 lines.
 * These types mirror the CrazyGames SDK v3 API surface.
 */

// Global window extensions for CrazyGames SDK
declare global {
  interface Window {
    CrazyGames?: {
      SDK: CrazyGamesSDKInterface;
    };
    /** Cached CrazyGames environment for utility function access */
    __crazyGamesEnvironment?: CrazyGamesEnvironment;
    /** Set to true once SDK init completes (or fails after retries) */
    __crazyGamesReady?: boolean;
  }
}

export type CrazyGamesEnvironment = 'crazygames' | 'local' | 'disabled';

export interface AdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: string, errorData?: unknown) => void;
}

export interface BannerOptions {
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

export interface CrazyGamesSDKInterface {
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
    trackEvent?: (eventName: string) => void;
    sdkGameLoadingStart: () => void;
    sdkGameLoadingStop: () => void;
    inviteLink: (params: InviteLinkParams) => string;
    showInviteButton: (params: InviteLinkParams) => void;
    hideInviteButton: () => void;
    getInviteParam: (paramName: string) => string | null;
    inviteParams?: Record<string, string>;
    isInstantMultiplayer: boolean;
    addJoinRoomListener: (callback: (params: Record<string, string>) => void) => void;
    removeJoinRoomListener: (callback: (params: Record<string, string>) => void) => void;
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
  leaderboard?: {
    submitScore: (score: number) => Promise<void>;
  };
}

// Context type exposed by CrazyGamesProvider
export interface CrazyGamesContextType {
  isAvailable: boolean;
  /** True only when actually running on CrazyGames platform (not local/standalone) */
  isOnCrazyGamesPlatform: boolean;
  environment: CrazyGamesEnvironment | null;
  isLoading: boolean;
  deviceType: import('@/hooks/useCrazyGamesViewport').CrazyGamesDeviceType;
  isLandscape: boolean;
  viewportSize: { width: number; height: number };
  cgUser: { username: string | null } | null;
  // Gameplay events
  gameplayStart: () => void;
  gameplayStop: () => void;
  loadingStart: () => void;
  loadingStop: () => void;
  happyTime: () => void;
  trackEvent: (eventName: string) => void;
  // Ads
  showMidgameAd: (callbacks?: AdCallbacks, placement?: string) => void;
  showRewardedAd: (callbacks?: AdCallbacks, placement?: string) => void;
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
  clearData: () => Promise<void>;
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
  // Leaderboard
  submitLeaderboardScore: (score: number) => Promise<void>;
}

/**
 * No-op implementation of CrazyGamesContextType.
 * Used when the hook is called outside the provider or SDK is unavailable.
 */
export const CRAZYGAMES_NOOP_CONTEXT: CrazyGamesContextType = {
  isAvailable: false,
  isOnCrazyGamesPlatform: false,
  environment: null,
  isLoading: false,
  deviceType: 'desktop',
  isLandscape: true,
  viewportSize: { width: 1024, height: 768 },
  cgUser: null,
  gameplayStart: () => {},
  gameplayStop: () => {},
  loadingStart: () => {},
  loadingStop: () => {},
  happyTime: () => {},
  trackEvent: () => {},
  showMidgameAd: (callbacks) => callbacks?.adFinished?.(),
  showRewardedAd: (callbacks) => callbacks?.adError?.('SDK not available'),
  hasAdblock: async () => false,
  requestBanner: () => {},
  requestResponsiveBanner: () => {},
  clearBanner: () => {},
  clearAllBanners: () => {},
  saveData: async () => {},
  loadData: async () => null,
  removeData: async () => {},
  clearData: async () => {},
  getUser: async () => null,
  showAuthPrompt: async () => null,
  isUserAccountAvailable: async () => false,
  getSystemInfo: async () => null,
  inviteLink: () => null,
  showInviteButton: () => {},
  hideInviteButton: () => {},
  getInviteParam: () => null,
  getInviteParams: () => null,
  isInstantMultiplayer: false,
  addJoinRoomListener: () => {},
  removeJoinRoomListener: () => {},
  getSettings: () => null,
  addSettingsChangeListener: () => {},
  removeSettingsChangeListener: () => {},
  addAuthListener: () => {},
  removeAuthListener: () => {},
  getUserToken: async () => null,
  listFriends: async () => ({ friends: [], hasMore: false }),
  showAccountLinkPrompt: async () => {},
  submitLeaderboardScore: async () => {},
};
