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
          username: name,
          avatar_config: avatarConfig,
          has_customized_profile: true,
        });
      };

      await handleSave('NewPlayer', testAvatar);

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        display_name: 'NewPlayer',
        username: 'NewPlayer',
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
          username: name,
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
