/**
 * Category Preferences Tests
 * Tests for notification category preferences and push prompt logic
 */

import {
  loadCategoryPreferences,
  saveCategoryPreferences,
  shouldShowPushPrompt,
  dismissPushPrompt,
} from '../categoryPreferences';
import {
  DEFAULT_CATEGORY_PREFERENCES,
  CATEGORY_PREFERENCES_KEY,
  PROMPT_DISMISSED_UNTIL_KEY,
} from '../types';

// Mock localStorage
const localStorageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMap.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    localStorageMap.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageMap.clear();
  }),
  get length() {
    return localStorageMap.size;
  },
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('categoryPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMap.clear();
  });

  describe('loadCategoryPreferences', () => {
    it('should return defaults when nothing stored', () => {
      // GIVEN - Empty localStorage

      // WHEN
      const prefs = loadCategoryPreferences();

      // THEN
      expect(prefs).toEqual(DEFAULT_CATEGORY_PREFERENCES);
    });

    it('should load stored preferences', () => {
      // GIVEN - Custom preferences in localStorage
      const custom = {
        pushEnabled: true,
        dailyChallenge: false,
        streakWarning: true,
        friendInvites: false,
        weeklySummary: true,
      };
      localStorageMap.set(CATEGORY_PREFERENCES_KEY, JSON.stringify(custom));

      // WHEN
      const prefs = loadCategoryPreferences();

      // THEN
      expect(prefs).toEqual(custom);
    });

    it('should fill missing keys with defaults', () => {
      // GIVEN - Partial preferences
      localStorageMap.set(
        CATEGORY_PREFERENCES_KEY,
        JSON.stringify({ dailyChallenge: false })
      );

      // WHEN
      const prefs = loadCategoryPreferences();

      // THEN
      expect(prefs.pushEnabled).toBe(true);
      expect(prefs.dailyChallenge).toBe(false);
      expect(prefs.streakWarning).toBe(true);
      expect(prefs.friendInvites).toBe(true);
      expect(prefs.weeklySummary).toBe(false);
    });

    it('should return defaults on invalid JSON', () => {
      // GIVEN - Corrupt data
      localStorageMap.set(CATEGORY_PREFERENCES_KEY, 'not-json');

      // WHEN
      const prefs = loadCategoryPreferences();

      // THEN
      expect(prefs).toEqual(DEFAULT_CATEGORY_PREFERENCES);
    });
  });

  describe('saveCategoryPreferences', () => {
    it('should save preferences to localStorage', () => {
      // GIVEN - Custom preferences
      const custom = {
        pushEnabled: true,
        dailyChallenge: false,
        streakWarning: false,
        friendInvites: true,
        weeklySummary: true,
      };

      // WHEN
      saveCategoryPreferences(custom);

      // THEN
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        CATEGORY_PREFERENCES_KEY,
        JSON.stringify(custom)
      );
    });
  });

  describe('shouldShowPushPrompt', () => {
    let originalNotification: typeof Notification;

    beforeEach(() => {
      originalNotification = window.Notification;
    });

    afterEach(() => {
      Object.defineProperty(window, 'Notification', {
        value: originalNotification,
        writable: true,
        configurable: true,
      });
    });

    it('should return false when Notification API not supported', () => {
      // GIVEN - No Notification API
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // WHEN
      const result = shouldShowPushPrompt();

      // THEN
      expect(result).toBe(false);
    });

    it('should return false when permission already granted', () => {
      // GIVEN - Permission granted
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      // WHEN
      const result = shouldShowPushPrompt();

      // THEN
      expect(result).toBe(false);
    });

    it('should return false when permission denied', () => {
      // GIVEN - Permission denied
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'denied' },
        writable: true,
        configurable: true,
      });

      // WHEN
      const result = shouldShowPushPrompt();

      // THEN
      expect(result).toBe(false);
    });

    it('should return false when prompt was recently dismissed', () => {
      // GIVEN - Permission default, dismissed recently
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });
      const future = Date.now() + 1000 * 60 * 60 * 24;
      localStorageMap.set(PROMPT_DISMISSED_UNTIL_KEY, String(future));
      localStorageMap.set('lexiclash_games_played', '10');

      // WHEN
      const result = shouldShowPushPrompt();

      // THEN
      expect(result).toBe(false);
    });

    it('should return false when not enough games played', () => {
      // GIVEN - Permission default, only 1 game
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });
      localStorageMap.set('lexiclash_games_played', '1');

      // WHEN
      const result = shouldShowPushPrompt();

      // THEN
      expect(result).toBe(false);
    });

    it('should return true when all criteria met', () => {
      // GIVEN - Permission default, 5 games, no dismissal
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });
      localStorageMap.set('lexiclash_games_played', '5');

      // WHEN
      const result = shouldShowPushPrompt();

      // THEN
      expect(result).toBe(true);
    });

    it('should return true when dismissal has expired', () => {
      // GIVEN - Permission default, dismissed in the past
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default' },
        writable: true,
        configurable: true,
      });
      const past = Date.now() - 1000;
      localStorageMap.set(PROMPT_DISMISSED_UNTIL_KEY, String(past));
      localStorageMap.set('lexiclash_games_played', '5');

      // WHEN
      const result = shouldShowPushPrompt();

      // THEN
      expect(result).toBe(true);
    });
  });

  describe('dismissPushPrompt', () => {
    it('should set dismissal timestamp 7 days in the future', () => {
      // GIVEN - Current time
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // WHEN
      dismissPushPrompt();

      // THEN
      const expectedUntil = now + 7 * 24 * 60 * 60 * 1000;
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        PROMPT_DISMISSED_UNTIL_KEY,
        String(expectedUntil)
      );

      vi.restoreAllMocks();
    });
  });
});
