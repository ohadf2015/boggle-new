/** Current schema version — increment when SaveData shape changes */
const CURRENT_VERSION = 2;

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
  /** Added v2: daily return streak tracking for D1 retention */
  retentionData?: {
    lastPlayedDate: string;  // ISO date YYYY-MM-DD, empty string when unset
    cgStreak: number;
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
    if (version < 2) {
      // v1 → v2: Add retentionData for D1 streak tracking
      if (!data.retentionData) {
        (data as Record<string, unknown>).retentionData = { lastPlayedDate: '', cgStreak: 0 };
      }
      data.version = 2;
    }
  }

  return data as unknown as SaveData;
}

/**
 * Access the CrazyGames SDK data module directly from window.
 * This avoids stale React context references and eliminates
 * the need for a cached context pattern.
 */
function getSDKData() {
  if (typeof window === 'undefined') return null;
  const sdk = window.CrazyGames?.SDK;
  if (!sdk || window.__crazyGamesEnvironment === 'disabled') return null;
  return sdk.data;
}

/**
 * Check if CrazyGames SDK is available and initialized.
 */
function isSDKAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.CrazyGames?.SDK && window.__crazyGamesEnvironment !== 'disabled';
}

/**
 * Save user data to CrazyGames cloud storage.
 * Uses the data module API for persistent cross-session storage.
 *
 * @param data - User progress data to save
 * @returns true if save succeeded, false otherwise
 */
export async function saveToCloud(data: SaveData): Promise<boolean> {
  const sdkData = getSDKData();
  if (!sdkData) return false;

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

    await sdkData.setItem('save_data_v1', serialized);
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
  const sdkData = getSDKData();
  if (!sdkData) return null;

  try {
    const serialized = await sdkData.getItem('save_data_v1');
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
  const sdkData = getSDKData();
  if (!sdkData) return false;

  try {
    await sdkData.removeItem('save_data_v1');
    return true;
  } catch (error) {
    console.error('Cloud clear error:', error);
    return false;
  }
}

/**
 * Check if CrazyGames cloud save is available.
 */
export { isSDKAvailable as isCloudSaveAvailable };
