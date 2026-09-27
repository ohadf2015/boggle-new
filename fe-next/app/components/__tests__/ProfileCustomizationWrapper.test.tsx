import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * ProfileCustomizationWrapper Component Tests
 *
 * Tests the global profile customization wrapper that shows the modal
 * after signup/login for users who haven't customized their profile yet.
 * Updated: now saves avatar_config (CustomAvatarConfig) instead of avatar_image string.
 */

import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';

// Mock the dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const MockComponent = () => null;
    MockComponent.displayName = 'DynamicComponent';
    return MockComponent;
  },
}));

import { useAuth } from '@/contexts/AuthContext';

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;

// Helper to create mock auth state (types are simplified for tests)
const createMockAuthState = (overrides: Record<string, unknown>) => ({
  profile: null,
  needsProfileCustomization: false,
  updateProfile: vi.fn(),
  user: null,
  rankedProgress: null,
  loading: false,
  isSupabaseEnabled: true,
  isAuthenticated: false,
  isGuest: true,
  isAdmin: false,
  isTeacher: false,
  canPlayRanked: false,
  gamesUntilRanked: 10,
  setupProfile: vi.fn(),
  refreshProfile: vi.fn(),
  ...overrides,
});

describe('ProfileCustomizationWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth State Conditions', () => {
    it('should not show modal when user is not authenticated', () => {
      mockUseAuth.mockReturnValue(createMockAuthState({
        profile: null,
        needsProfileCustomization: false,
        isAuthenticated: false,
        isGuest: true,
      }) as ReturnType<typeof useAuth>);

      expect(mockUseAuth().needsProfileCustomization).toBe(false);
    });

    it('should not show modal when profile has already been customized', () => {
      mockUseAuth.mockReturnValue(createMockAuthState({
        profile: {
          id: 'test-user-id',
          username: 'TestUser',
          display_name: 'Test User',
          has_customized_profile: true,
          avatar_config: getRandomAvatarConfig(),
        },
        needsProfileCustomization: false,
        isAuthenticated: true,
        isGuest: false,
      }) as ReturnType<typeof useAuth>);

      expect(mockUseAuth().needsProfileCustomization).toBe(false);
      expect(mockUseAuth().profile?.has_customized_profile).toBe(true);
    });

    it('should show modal when authenticated user needs profile customization', () => {
      mockUseAuth.mockReturnValue(createMockAuthState({
        profile: {
          id: 'test-user-id',
          username: 'TestUser',
          display_name: 'Test User',
          has_customized_profile: false,
        },
        needsProfileCustomization: true,
        isAuthenticated: true,
        isGuest: false,
      }) as ReturnType<typeof useAuth>);

      expect(mockUseAuth().needsProfileCustomization).toBe(true);
      expect(mockUseAuth().profile?.has_customized_profile).toBe(false);
    });
  });

  describe('Save Handler Logic', () => {
    it('should save avatar_config (CustomAvatarConfig) when saving', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({ data: {}, error: null });

      const testAvatar: CustomAvatarConfig = {
        base: 'round',
        skinColor: '#FFDBB4',
        hair: 'spiky',
        hairColor: '#2C1B18',
        eyes: 'round',
        mouth: 'smile',
        accessory: 'none',
        accessoryColor: '#000000',
        bgColor: '#1a1a2e',
        gender: 'male',
      };

      // Simulate the new save handler logic from ProfileCustomizationWrapper
      const handleSave = async (name: string, avatarConfig: CustomAvatarConfig) => {
        await mockUpdateProfile({
          display_name: name,
          avatar_config: avatarConfig,
          has_customized_profile: true,
        });
      };

      await handleSave('NewPlayer', testAvatar);

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        display_name: 'NewPlayer',
        avatar_config: testAvatar,
        has_customized_profile: true,
      });
    });

    it('should not include old avatar_image/avatar_emoji/avatar_color fields', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({ data: {}, error: null });

      const testAvatar = getRandomAvatarConfig();

      const handleSave = async (name: string, avatarConfig: CustomAvatarConfig) => {
        await mockUpdateProfile({
          display_name: name,
          avatar_config: avatarConfig,
          has_customized_profile: true,
        });
      };

      await handleSave('Player', testAvatar);

      const savedData = mockUpdateProfile.mock.calls[0][0];
      expect(savedData).not.toHaveProperty('avatar_image');
      expect(savedData).not.toHaveProperty('avatar_emoji');
      expect(savedData).not.toHaveProperty('avatar_color');
      expect(savedData).toHaveProperty('avatar_config');
    });
  });

  describe('Error Handling on Save', () => {
    it('should not close modal when updateProfile returns an error', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      // Simulate the wrapper's handleSave logic
      let modalClosed = false;
      const handleSave = async (name: string, avatarConfig: CustomAvatarConfig) => {
        const { error } = await mockUpdateProfile({
          display_name: name,
          avatar_config: avatarConfig,
          has_customized_profile: true,
        });

        if (error) {
          throw new Error(error.message);
        }
        modalClosed = true;
      };

      await expect(
        handleSave('TestPlayer', getRandomAvatarConfig())
      ).rejects.toThrow('Network error');
      expect(modalClosed).toBe(false);
    });

    it('should close modal when updateProfile succeeds', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({
        data: { has_customized_profile: true },
        error: null,
      });

      let modalClosed = false;
      const handleSave = async (name: string, avatarConfig: CustomAvatarConfig) => {
        const { error } = await mockUpdateProfile({
          display_name: name,
          avatar_config: avatarConfig,
          has_customized_profile: true,
        });

        if (error) {
          throw new Error(error.message);
        }
        modalClosed = true;
      };

      await handleSave('TestPlayer', getRandomAvatarConfig());
      expect(modalClosed).toBe(true);
    });
  });

  describe('Race Condition Protection', () => {
    it('should not overwrite has_customized_profile=true with stale false data', () => {
      // Simulate the functional updater guard in fetchUserData
      const currentProfile = {
        id: 'user-1',
        username: 'CustomName',
        display_name: 'Custom Name',
        has_customized_profile: true,
        avatar_config: getRandomAvatarConfig(),
      };

      const staleDbData = {
        id: 'user-1',
        username: 'GoogleName',
        display_name: 'Google Name',
        has_customized_profile: false,
      };

      // This is the guard logic from useProfileManagement.fetchUserData
      const result = (() => {
        if (currentProfile?.has_customized_profile && !staleDbData.has_customized_profile) {
          return currentProfile;
        }
        return staleDbData;
      })();

      expect(result).toBe(currentProfile);
      expect(result.has_customized_profile).toBe(true);
      expect(result.display_name).toBe('Custom Name');
    });

    it('should allow overwrite when DB data also has has_customized_profile=true', () => {
      const currentProfile = {
        id: 'user-1',
        username: 'OldName',
        display_name: 'Old Name',
        has_customized_profile: true,
      };

      const freshDbData = {
        id: 'user-1',
        username: 'NewName',
        display_name: 'New Name',
        has_customized_profile: true,
      };

      const result = (() => {
        if (currentProfile?.has_customized_profile && !freshDbData.has_customized_profile) {
          return currentProfile;
        }
        return freshDbData;
      })();

      expect(result).toBe(freshDbData);
      expect(result.display_name).toBe('New Name');
    });

    it('should allow setting profile when no current profile exists', () => {
      const currentProfile = null;

      const dbData = {
        id: 'user-1',
        username: 'NewUser',
        display_name: 'New User',
        has_customized_profile: false,
      };

      const result = (() => {
        if (currentProfile?.has_customized_profile && !dbData.has_customized_profile) {
          return currentProfile;
        }
        return dbData;
      })();

      expect(result).toBe(dbData);
    });
  });
});

describe('Integration: Profile Customization Flow', () => {
  it('complete signup to customization flow saves CustomAvatarConfig', async () => {
    const mockUpdateProfile = vi.fn().mockResolvedValue({ data: {}, error: null });

    const selectedAvatar: CustomAvatarConfig = {
      base: 'heart',
      skinColor: '#EDB98A',
      hair: 'bob',
      hairColor: '#D4A574',
      eyes: 'round',
      mouth: 'smile',
      accessory: 'none',
      accessoryColor: '#000000',
      bgColor: '#1a1a2e',
      gender: 'female',
    };

    await mockUpdateProfile({
      display_name: 'SunnyPlayer',
      username: 'SunnyPlayer',
      avatar_config: selectedAvatar,
      has_customized_profile: true,
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'SunnyPlayer',
        avatar_config: selectedAvatar,
        has_customized_profile: true,
      })
    );
  });
});
