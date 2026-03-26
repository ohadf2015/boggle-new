/**
 * useRecentGameSettings Tests
 *
 * Tests for storing and retrieving recent classroom game configurations
 * Following TDD RED-GREEN-REFACTOR cycle
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentGameSettings, type GameConfiguration } from '../useRecentGameSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
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

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useRecentGameSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // Helper to create a valid game configuration
  const createConfig = (overrides: Partial<GameConfiguration> = {}): GameConfiguration => ({
    id: `config-${Date.now()}`,
    classroomId: 'classroom-1',
    classroomName: 'Test Classroom',
    lessonIds: ['lesson-1'],
    lessonNames: ['Test Lesson'],
    settings: {
      timerMinutes: 3,
      boardSize: 'medium',
      allowLateJoin: true,
    },
    savedAt: Date.now(),
    ...overrides,
  });

  describe('initialization', () => {
    it('should return empty array when no saved configurations exist', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      expect(result.current.recentConfigs).toEqual([]);
      expect(result.current.hasRecentConfig).toBe(false);
    });

    it('should load saved configurations from localStorage', () => {
      const config = createConfig();
      localStorageMock.setItem(
        'lexiclash_recent_game_settings',
        JSON.stringify([config])
      );

      const { result } = renderHook(() => useRecentGameSettings());

      expect(result.current.recentConfigs).toHaveLength(1);
      expect(result.current.recentConfigs[0].classroomId).toBe('classroom-1');
      expect(result.current.hasRecentConfig).toBe(true);
    });
  });

  describe('saveConfig', () => {
    it('should save a new configuration', () => {
      const { result } = renderHook(() => useRecentGameSettings());
      const config = createConfig();

      act(() => {
        result.current.saveConfig(config);
      });

      expect(result.current.recentConfigs).toHaveLength(1);
      expect(result.current.recentConfigs[0].classroomId).toBe('classroom-1');
    });

    it('should add savedAt timestamp if not provided', () => {
      const { result } = renderHook(() => useRecentGameSettings());
      const configWithoutTimestamp = {
        ...createConfig(),
      };
      delete (configWithoutTimestamp as Partial<GameConfiguration>).savedAt;

      act(() => {
        result.current.saveConfig(configWithoutTimestamp as unknown as GameConfiguration);
      });

      expect(result.current.recentConfigs[0].savedAt).toBeDefined();
    });

    it('should limit to 10 most recent configurations', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      // Add 12 configurations
      act(() => {
        for (let i = 0; i < 12; i++) {
          result.current.saveConfig(
            createConfig({ id: `config-${i}`, classroomName: `Classroom ${i}` })
          );
        }
      });

      expect(result.current.recentConfigs).toHaveLength(10);
      // Most recent should be last added
      expect(result.current.recentConfigs[0].classroomName).toBe('Classroom 11');
    });

    it('should persist to localStorage', () => {
      const { result } = renderHook(() => useRecentGameSettings());
      const config = createConfig();

      act(() => {
        result.current.saveConfig(config);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lexiclash_recent_game_settings',
        expect.any(String)
      );
    });
  });

  describe('getMostRecent', () => {
    it('should return null when no configurations exist', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      expect(result.current.getMostRecent()).toBeNull();
    });

    it('should return the most recent configuration', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      act(() => {
        result.current.saveConfig(createConfig({ classroomName: 'First' }));
        result.current.saveConfig(createConfig({ classroomName: 'Second' }));
      });

      expect(result.current.getMostRecent()?.classroomName).toBe('Second');
    });
  });

  describe('getByClassroom', () => {
    it('should return configurations filtered by classroom', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      act(() => {
        result.current.saveConfig(createConfig({ classroomId: 'class-a', classroomName: 'Class A' }));
        result.current.saveConfig(createConfig({ classroomId: 'class-b', classroomName: 'Class B' }));
        result.current.saveConfig(createConfig({ classroomId: 'class-a', classroomName: 'Class A v2' }));
      });

      const classAConfigs = result.current.getByClassroom('class-a');
      expect(classAConfigs).toHaveLength(2);
      expect(classAConfigs[0].classroomId).toBe('class-a');
    });

    it('should return empty array when no matching configurations', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      act(() => {
        result.current.saveConfig(createConfig({ classroomId: 'class-a' }));
      });

      expect(result.current.getByClassroom('class-z')).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('should remove all configurations', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      act(() => {
        result.current.saveConfig(createConfig());
        result.current.saveConfig(createConfig());
      });

      expect(result.current.recentConfigs).toHaveLength(2);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.recentConfigs).toEqual([]);
      expect(result.current.hasRecentConfig).toBe(false);
    });

    it('should remove from localStorage', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      act(() => {
        result.current.saveConfig(createConfig());
        result.current.clearAll();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'lexiclash_recent_game_settings'
      );
    });
  });

  describe('removeConfig', () => {
    it('should remove a specific configuration by id', () => {
      const { result } = renderHook(() => useRecentGameSettings());

      act(() => {
        result.current.saveConfig(createConfig({ id: 'keep-1' }));
        result.current.saveConfig(createConfig({ id: 'remove-me' }));
        result.current.saveConfig(createConfig({ id: 'keep-2' }));
      });

      expect(result.current.recentConfigs).toHaveLength(3);

      act(() => {
        result.current.removeConfig('remove-me');
      });

      expect(result.current.recentConfigs).toHaveLength(2);
      expect(result.current.recentConfigs.find((c) => c.id === 'remove-me')).toBeUndefined();
    });
  });
});
