import { saveToCloud, loadFromCloud, clearCloudSave, type SaveData } from '../cloudSave';

describe('cloudSave', () => {
  let mockSetItem: jest.Mock;
  let mockGetItem: jest.Mock;
  let mockRemoveItem: jest.Mock;

  const mockSaveDataValue: SaveData = {
    version: 1,
    adventureProgress: {
      worldId: 2,
      levelId: 5,
      stars: 12,
      completedLevels: ['1-1', '1-2', '1-3', '2-1', '2-2'],
    },
    educationProgress: {
      totalXp: 1250,
      level: 5,
      streak: 7,
      achievements: ['first-word', 'combo-5', 'speed-demon'],
    },
    preferences: {
      musicVolume: 0.7,
      soundVolume: 0.9,
      language: 'en',
    },
  };

  function setupSDKMock(environment: string = 'crazygames') {
    mockSetItem = vi.fn().mockResolvedValue(undefined);
    mockGetItem = vi.fn().mockResolvedValue(JSON.stringify(mockSaveDataValue));
    mockRemoveItem = vi.fn().mockResolvedValue(undefined);

    (window as any).CrazyGames = {
      SDK: {
        data: {
          setItem: mockSetItem,
          getItem: mockGetItem,
          removeItem: mockRemoveItem,
          clear: vi.fn(),
        },
      },
    };
    (window as any).__crazyGamesEnvironment = environment;
  }

  function clearSDKMock() {
    delete (window as any).CrazyGames;
    delete (window as any).__crazyGamesEnvironment;
  }

  beforeEach(() => {
    setupSDKMock();
  });

  afterEach(() => {
    clearSDKMock();
    vi.clearAllMocks();
  });

  describe('saveToCloud', () => {
    it('should return false when SDK unavailable', async () => {
      clearSDKMock();

      const result = await saveToCloud(mockSaveDataValue);

      expect(result).toBe(false);
    });

    it('should return false when environment is disabled', async () => {
      setupSDKMock('disabled');

      const result = await saveToCloud(mockSaveDataValue);

      expect(result).toBe(false);
    });

    it('should serialize data to JSON and save to cloud', async () => {
      const result = await saveToCloud(mockSaveDataValue);

      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(mockSaveDataValue)
      );
    });

    it('should handle save errors gracefully', async () => {
      mockSetItem.mockRejectedValue(new Error('Network error'));

      const result = await saveToCloud(mockSaveDataValue);

      expect(result).toBe(false);
    });

    it('should not log sensitive data in errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      mockSetItem.mockRejectedValue(new Error('Network error'));

      await saveToCloud(mockSaveDataValue);

      // Error log should not contain user data
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cloud save error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should save minimal data correctly', async () => {
      const minimalData: SaveData = {
        version: 1,
        adventureProgress: {
          worldId: 1,
          levelId: 1,
          stars: 0,
          completedLevels: [],
        },
        educationProgress: {
          totalXp: 0,
          level: 1,
          streak: 0,
          achievements: [],
        },
        preferences: {
          musicVolume: 1.0,
          soundVolume: 1.0,
          language: 'en',
        },
      };

      const result = await saveToCloud(minimalData);

      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(minimalData)
      );
    });

    it('should save maximum data correctly', async () => {
      const maxData: SaveData = {
        version: 1,
        adventureProgress: {
          worldId: 10,
          levelId: 50,
          stars: 150,
          completedLevels: Array.from({ length: 50 }, (_, i) => `${i + 1}-${i + 1}`),
        },
        educationProgress: {
          totalXp: 99999,
          level: 100,
          streak: 365,
          achievements: Array.from({ length: 50 }, (_, i) => `achievement-${i}`),
        },
        preferences: {
          musicVolume: 0.0,
          soundVolume: 0.0,
          language: 'ja',
        },
      };

      const result = await saveToCloud(maxData);

      expect(result).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(maxData)
      );
    });
  });

  describe('loadFromCloud', () => {
    it('should return null when SDK unavailable', async () => {
      clearSDKMock();

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should load and deserialize data from cloud', async () => {
      const result = await loadFromCloud();

      expect(result).toEqual(mockSaveDataValue);
      expect(mockGetItem).toHaveBeenCalledWith('save_data_v1');
    });

    it('should return null when no data exists', async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle load errors gracefully', async () => {
      mockGetItem.mockRejectedValue(new Error('Network error'));

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle malformed JSON gracefully', async () => {
      mockGetItem.mockResolvedValue('{ invalid json }');

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle empty string gracefully', async () => {
      mockGetItem.mockResolvedValue('');

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle partial data gracefully', async () => {
      const partialData = {
        adventureProgress: {
          worldId: 2,
          levelId: 5,
        },
      };

      mockGetItem.mockResolvedValue(JSON.stringify(partialData));

      const result = await loadFromCloud();

      // Should return the data even if incomplete
      // (validation happens at usage site)
      expect(result).toEqual(partialData);
    });

    it('should log error for malformed data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      mockGetItem.mockResolvedValue('{ invalid }');

      await loadFromCloud();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cloud load error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearCloudSave', () => {
    it('should return false when SDK unavailable', async () => {
      clearSDKMock();

      const result = await clearCloudSave();

      expect(result).toBe(false);
    });

    it('should remove cloud save data', async () => {
      const result = await clearCloudSave();

      expect(result).toBe(true);
      expect(mockRemoveItem).toHaveBeenCalledWith('save_data_v1');
    });

    it('should handle clear errors gracefully', async () => {
      mockRemoveItem.mockRejectedValue(new Error('Network error'));

      const result = await clearCloudSave();

      expect(result).toBe(false);
    });

    it('should log error on clear failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      mockRemoveItem.mockRejectedValue(new Error('Permission denied'));

      await clearCloudSave();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cloud clear error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    it('should handle save then load cycle correctly', async () => {
      const saveResult = await saveToCloud(mockSaveDataValue);
      expect(saveResult).toBe(true);

      const loadResult = await loadFromCloud();
      expect(loadResult).toEqual(mockSaveDataValue);
    });

    it('should handle save then clear cycle correctly', async () => {
      await saveToCloud(mockSaveDataValue);

      const clearResult = await clearCloudSave();
      expect(clearResult).toBe(true);

      mockGetItem.mockResolvedValue(null);
      const loadResult = await loadFromCloud();
      expect(loadResult).toBeNull();
    });

    it('should handle multiple saves with overwrite', async () => {
      const firstSave: SaveData = {
        ...mockSaveDataValue,
        adventureProgress: {
          ...mockSaveDataValue.adventureProgress,
          stars: 5,
        },
      };

      const secondSave: SaveData = {
        ...mockSaveDataValue,
        adventureProgress: {
          ...mockSaveDataValue.adventureProgress,
          stars: 10,
        },
      };

      await saveToCloud(firstSave);
      expect(mockSetItem).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(firstSave)
      );

      await saveToCloud(secondSave);
      expect(mockSetItem).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(secondSave)
      );

      expect(mockSetItem).toHaveBeenCalledTimes(2);
    });
  });
});
