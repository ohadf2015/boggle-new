import { useCrazyGames } from '@/components/CrazyGamesSDK';

/** Current schema version — increment when SaveData shape changes */
const CURRENT_VERSION = 1;

/**
 * Cloud save data structure for CrazyGames data module.
 * Syncs adventure progress, education XP, and user preferences.
 *
 * When changing this interface, increment CURRENT_VERSION and add a
 * migration case in migrateSaveData().
 */
export interface SaveData {
  /** Schema version for forward-compatible migrations */
  version: number;
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

/**
 * Validate that loaded data matches the SaveData shape.
 * Returns false for null, non-objects, or missing required fields.
 */
function isValidSaveData(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.adventureProgress === 'object' && d.adventureProgress !== null &&
    typeof d.educationProgress === 'object' && d.educationProgress !== null &&
    typeof d.preferences === 'object' && d.preferences !== null
  );
}

/**
 * Migrate save data from older versions to the current schema.
 * Each case falls through to apply all needed migrations in order.
 */
function migrateSaveData(data: Record<string, unknown>): SaveData | null {
  if (!data || typeof data !== 'object') return null;

  const version = typeof data.version === 'number' ? data.version : 0;

  // Only apply version migrations to complete save data.
  // Partial saves (e.g. from older clients) are returned as-is;
  // strict field validation happens at the usage site.
  if (isValidSaveData(data)) {
    if (version < 1) {
      // v0 → v1: Add version field (original schema had no version)
      data.version = 1;
    }
    // Future migrations go here:
    // if (version < 2) { /* v1 → v2 migration */ }
  }

  return data as unknown as SaveData;
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
      getXsollaUserToken: async () => null,
      trackOrder: async () => {},
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
 * Reset the SDK context cache. Call on logout/sign-out to prevent
 * stale context references from persisting across sessions.
 */
export function resetSDKContext() {
  cachedContext = null;
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
    // Always stamp current version before saving
    const versioned = { ...data, version: CURRENT_VERSION };
    const serialized = JSON.stringify(versioned);

    // CrazyGames enforces a 1MB limit per game for cloud data
    const MAX_CLOUD_SAVE_BYTES = 1_000_000;
    if (serialized.length > MAX_CLOUD_SAVE_BYTES) {
      console.warn(`Cloud save exceeds 1MB limit (${serialized.length} bytes), save aborted`);
      return false;
    }

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

    const raw = JSON.parse(serialized);
    // Validate and migrate from older versions
    const migrated = migrateSaveData(raw);
    if (!migrated) {
      console.warn('Cloud save data failed validation, ignoring corrupt save');
      return null;
    }
    return migrated;
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
