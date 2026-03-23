import { saveToCloud, loadFromCloud, clearCloudSave, setSDKContext, type SaveData } from '../cloudSave';

describe('cloudSave', () => {
  let mockSaveData: jest.Mock;
  let mockLoadData: jest.Mock;
  let mockRemoveData: jest.Mock;

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

  beforeEach(() => {
    mockSaveData = jest.fn();
    mockLoadData = jest.fn();
    mockRemoveData = jest.fn();

    // Default: successful operations
    mockSaveData.mockResolvedValue(undefined);
    mockLoadData.mockResolvedValue(JSON.stringify(mockSaveDataValue));
    mockRemoveData.mockResolvedValue(undefined);

    // Set SDK context for utility functions
    setSDKContext({
      isAvailable: true,
      saveData: mockSaveData,
      loadData: mockLoadData,
      removeData: mockRemoveData,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveToCloud', () => {
    it('should return false when SDK unavailable', async () => {
      setSDKContext({
        isAvailable: false,
        saveData: mockSaveData,
        loadData: mockLoadData,
        removeData: mockRemoveData,
      } as any);

      const result = await saveToCloud(mockSaveDataValue);

      expect(result).toBe(false);
      expect(mockSaveData).not.toHaveBeenCalled();
    });

    it('should serialize data to JSON and save to cloud', async () => {
      const result = await saveToCloud(mockSaveDataValue);

      expect(result).toBe(true);
      expect(mockSaveData).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(mockSaveDataValue)
      );
    });

    it('should handle save errors gracefully', async () => {
      mockSaveData.mockRejectedValue(new Error('Network error'));

      const result = await saveToCloud(mockSaveDataValue);

      expect(result).toBe(false);
    });

    it('should not log sensitive data in errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSaveData.mockRejectedValue(new Error('Network error'));

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
      expect(mockSaveData).toHaveBeenCalledWith(
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
      expect(mockSaveData).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(maxData)
      );
    });
  });

  describe('loadFromCloud', () => {
    it('should return null when SDK unavailable', async () => {
      setSDKContext({
        isAvailable: false,
        saveData: mockSaveData,
        loadData: mockLoadData,
        removeData: mockRemoveData,
      } as any);

      const result = await loadFromCloud();

      expect(result).toBeNull();
      expect(mockLoadData).not.toHaveBeenCalled();
    });

    it('should load and deserialize data from cloud', async () => {
      const result = await loadFromCloud();

      expect(result).toEqual(mockSaveDataValue);
      expect(mockLoadData).toHaveBeenCalledWith('save_data_v1');
    });

    it('should return null when no data exists', async () => {
      mockLoadData.mockResolvedValue(null);

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle load errors gracefully', async () => {
      mockLoadData.mockRejectedValue(new Error('Network error'));

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle malformed JSON gracefully', async () => {
      mockLoadData.mockResolvedValue('{ invalid json }');

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle empty string gracefully', async () => {
      mockLoadData.mockResolvedValue('');

      const result = await loadFromCloud();

      expect(result).toBeNull();
    });

    it('should handle partial data gracefully', async () => {
      const partialData = {
        adventureProgress: {
          worldId: 2,
          levelId: 5,
          // Missing stars and completedLevels
        },
      };

      mockLoadData.mockResolvedValue(JSON.stringify(partialData));

      const result = await loadFromCloud();

      // Should return the data even if incomplete
      // (validation happens at usage site)
      expect(result).toEqual(partialData);
    });

    it('should log error for malformed data', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLoadData.mockResolvedValue('{ invalid }');

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
      setSDKContext({
        isAvailable: false,
        saveData: mockSaveData,
        loadData: mockLoadData,
        removeData: mockRemoveData,
      } as any);

      const result = await clearCloudSave();

      expect(result).toBe(false);
      expect(mockRemoveData).not.toHaveBeenCalled();
    });

    it('should remove cloud save data', async () => {
      const result = await clearCloudSave();

      expect(result).toBe(true);
      expect(mockRemoveData).toHaveBeenCalledWith('save_data_v1');
    });

    it('should handle clear errors gracefully', async () => {
      mockRemoveData.mockRejectedValue(new Error('Network error'));

      const result = await clearCloudSave();

      expect(result).toBe(false);
    });

    it('should log error on clear failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRemoveData.mockRejectedValue(new Error('Permission denied'));

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
      // Save data
      const saveResult = await saveToCloud(mockSaveDataValue);
      expect(saveResult).toBe(true);

      // Load data
      const loadResult = await loadFromCloud();
      expect(loadResult).toEqual(mockSaveDataValue);
    });

    it('should handle save then clear cycle correctly', async () => {
      // Save data
      await saveToCloud(mockSaveDataValue);

      // Clear data
      const clearResult = await clearCloudSave();
      expect(clearResult).toBe(true);

      // Load should return null after clear
      mockLoadData.mockResolvedValue(null);
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

      // First save
      await saveToCloud(firstSave);
      expect(mockSaveData).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(firstSave)
      );

      // Second save (overwrites first)
      await saveToCloud(secondSave);
      expect(mockSaveData).toHaveBeenCalledWith(
        'save_data_v1',
        JSON.stringify(secondSave)
      );

      expect(mockSaveData).toHaveBeenCalledTimes(2);
    });
  });
});
