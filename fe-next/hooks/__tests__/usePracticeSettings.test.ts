/**
 * usePracticeSettings Hook Tests
 *
 * Tests for practice session timing preferences stored in localStorage
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeSettings, DEFAULT_PRACTICE_SETTINGS } from '../usePracticeSettings';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('usePracticeSettings', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return default settings when localStorage is empty', () => {
      const { result } = renderHook(() => usePracticeSettings());

      expect(result.current.settings).toEqual(DEFAULT_PRACTICE_SETTINGS);
    });

    it('should load saved settings from localStorage', () => {
      const savedSettings = {
        autoAdvanceCorrect: 2000,
        autoAdvanceIncorrect: 4000,
        autoAdvanceEnabled: true,
        requireTypeOnIncorrect: false,
      };
      mockLocalStorage.setItem('lexiclash_practice_settings', JSON.stringify(savedSettings));

      const { result } = renderHook(() => usePracticeSettings());

      expect(result.current.settings).toEqual(savedSettings);
    });

    it('should use defaults for missing fields in saved settings', () => {
      const partialSettings = {
        autoAdvanceCorrect: 2000,
      };
      mockLocalStorage.setItem('lexiclash_practice_settings', JSON.stringify(partialSettings));

      const { result } = renderHook(() => usePracticeSettings());

      expect(result.current.settings.autoAdvanceCorrect).toBe(2000);
      expect(result.current.settings.autoAdvanceIncorrect).toBe(DEFAULT_PRACTICE_SETTINGS.autoAdvanceIncorrect);
      expect(result.current.settings.autoAdvanceEnabled).toBe(DEFAULT_PRACTICE_SETTINGS.autoAdvanceEnabled);
    });
  });

  describe('updateSettings', () => {
    it('should update a single setting', () => {
      const { result } = renderHook(() => usePracticeSettings());

      act(() => {
        result.current.updateSettings({ autoAdvanceCorrect: 2000 });
      });

      expect(result.current.settings.autoAdvanceCorrect).toBe(2000);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should update multiple settings at once', () => {
      const { result } = renderHook(() => usePracticeSettings());

      act(() => {
        result.current.updateSettings({
          autoAdvanceCorrect: 1000,
          autoAdvanceIncorrect: 5000,
        });
      });

      expect(result.current.settings.autoAdvanceCorrect).toBe(1000);
      expect(result.current.settings.autoAdvanceIncorrect).toBe(5000);
    });

    it('should persist settings to localStorage', () => {
      const { result } = renderHook(() => usePracticeSettings());

      act(() => {
        result.current.updateSettings({ autoAdvanceEnabled: false });
      });

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData.autoAdvanceEnabled).toBe(false);
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      const { result } = renderHook(() => usePracticeSettings());

      // First update settings
      act(() => {
        result.current.updateSettings({
          autoAdvanceCorrect: 5000,
          autoAdvanceIncorrect: 10000,
          autoAdvanceEnabled: false,
        });
      });

      // Then reset
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(DEFAULT_PRACTICE_SETTINGS);
    });
  });

  describe('timing presets', () => {
    it('should have correct default timing values', () => {
      expect(DEFAULT_PRACTICE_SETTINGS.autoAdvanceCorrect).toBe(1500);
      expect(DEFAULT_PRACTICE_SETTINGS.autoAdvanceIncorrect).toBe(3000);
      expect(DEFAULT_PRACTICE_SETTINGS.autoAdvanceEnabled).toBe(true);
      expect(DEFAULT_PRACTICE_SETTINGS.requireTypeOnIncorrect).toBe(true);
    });
  });

  describe('isLoaded state', () => {
    it('should indicate when settings are loaded', () => {
      const { result } = renderHook(() => usePracticeSettings());

      // After mount, settings should be loaded
      expect(result.current.isLoaded).toBe(true);
    });
  });
});
