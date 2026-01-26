import { useCrazyGames } from '@/components/CrazyGamesSDK';

/**
 * Cloud save data structure for CrazyGames data module.
 * Syncs adventure progress, education XP, and user preferences.
 */
export interface SaveData {
  adventureProgress: {
    worldId: number;
    levelId: number;
    stars: number;
    completedLevels: string[];
  };
  educationProgress: {
    totalXp: number;
    level: number;
    streak: number;
    achievements: string[];
  };
  preferences: {
    musicVolume: number;
    soundVolume: number;
    language: string;
  };
}

// Cache SDK context for utility functions
let cachedContext: ReturnType<typeof useCrazyGames> | null = null;

/**
 * Internal helper to get SDK context.
 * Uses cached context if available, otherwise returns no-op implementation.
 */
function getSDKContext() {
  if (!cachedContext) {
    // Initialize with no-op implementation
    // Type assertion is safe because we only use saveData/loadData/removeData in this file
    cachedContext = {
      isAvailable: false,
      isOnCrazyGamesPlatform: false,
      environment: null,
      isLoading: false,
      deviceType: 'desktop',
      isLandscape: true,
      viewportSize: { width: 0, height: 0 },
      gameplayStart: () => {},
      gameplayStop: () => {},
      loadingStart: () => {},
      loadingStop: () => {},
      happyTime: () => {},
      showMidgameAd: () => {},
      showRewardedAd: () => {},
      hasAdblock: async () => false,
      requestBanner: () => {},
      requestResponsiveBanner: () => {},
      clearBanner: () => {},
      clearAllBanners: () => {},
      saveData: async () => {},
      loadData: async () => null,
      removeData: async () => {},
      getUser: async () => null,
      showAuthPrompt: async () => null,
      isUserAccountAvailable: async () => false,
      getSystemInfo: async () => null,
      inviteLink: () => null,
      showInviteButton: () => {},
      hideInviteButton: () => {},
      getInviteParam: () => null,
      isInstantMultiplayer: false,
    } as ReturnType<typeof useCrazyGames>;
  }
  return cachedContext;
}

/**
 * Set the SDK context for utility functions.
 * Call this from a React component that has access to useCrazyGames().
 */
export function setSDKContext(context: ReturnType<typeof useCrazyGames>) {
  cachedContext = context;
}

/**
 * Save user data to CrazyGames cloud storage.
 * Uses the data module API for persistent cross-session storage.
 *
 * @param data - User progress data to save
 * @returns true if save succeeded, false otherwise
 */
export async function saveToCloud(data: SaveData): Promise<boolean> {
  const sdk = getSDKContext();
  if (!sdk.isAvailable) return false;

  try {
    const serialized = JSON.stringify(data);
    await sdk.saveData('save_data_v1', serialized);
    return true;
  } catch (error) {
    console.error('Cloud save error:', error);
    return false;
  }
}

/**
 * Load user data from CrazyGames cloud storage.
 * Returns null if no data exists or on error.
 *
 * @returns Saved user data or null
 */
export async function loadFromCloud(): Promise<SaveData | null> {
  const sdk = getSDKContext();
  if (!sdk.isAvailable) return null;

  try {
    const serialized = await sdk.loadData('save_data_v1');
    if (!serialized) return null;
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Cloud load error:', error);
    return null;
  }
}

/**
 * Clear cloud save data.
 * Used for sign-out or data reset.
 *
 * @returns true if clear succeeded, false otherwise
 */
export async function clearCloudSave(): Promise<boolean> {
  const sdk = getSDKContext();
  if (!sdk.isAvailable) return false;

  try {
    await sdk.removeData('save_data_v1');
    return true;
  } catch (error) {
    console.error('Cloud clear error:', error);
    return false;
  }
}
