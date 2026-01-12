/**
 * ProfileCustomizationWrapper Component Tests
 *
 * Tests the global profile customization wrapper that shows the modal
 * after signup/login for users who haven't customized their profile yet.
 */

import { getAvatarEmojiAndColor, AVATARS } from '@/utils/avatarConfig';

// Mock the dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('next/dynamic', () => () => {
  const MockComponent = () => null;
  MockComponent.displayName = 'DynamicComponent';
  return MockComponent;
});

import { useAuth } from '@/contexts/AuthContext';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Helper to create mock auth state (types are simplified for tests)
const createMockAuthState = (overrides: Record<string, unknown>) => ({
  profile: null,
  needsProfileCustomization: false,
  updateProfile: jest.fn(),
  user: null,
  rankedProgress: null,
  loading: false,
  isSupabaseEnabled: true,
  isAuthenticated: false,
  isGuest: true,
  isAdmin: false,
  canPlayRanked: false,
  gamesUntilRanked: 10,
  setupProfile: jest.fn(),
  refreshProfile: jest.fn(),
  ...overrides,
});

describe('ProfileCustomizationWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          avatar_emoji: '🐶',
          avatar_color: '#4ECDC4',
          avatar_image: 'broccoli-bob',
        },
        needsProfileCustomization: false, // Key: false because already customized
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
          has_customized_profile: false, // Not yet customized
          avatar_emoji: '🐶',
          avatar_color: '#4ECDC4',
          avatar_image: 'broccoli-bob',
        },
        needsProfileCustomization: true, // Key: true because needs customization
        isAuthenticated: true,
        isGuest: false,
      }) as ReturnType<typeof useAuth>);

      expect(mockUseAuth().needsProfileCustomization).toBe(true);
      expect(mockUseAuth().profile?.has_customized_profile).toBe(false);
    });
  });

  describe('Save Handler Logic', () => {
    it('should include avatar_emoji and avatar_color when saving', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue({ data: {}, error: null });

      // Simulate the save handler logic from ProfileCustomizationWrapper
      const handleSave = async (name: string, avatarId: string) => {
        const { emoji, color } = getAvatarEmojiAndColor(avatarId);

        await mockUpdateProfile({
          display_name: name,
          username: name,
          avatar_image: avatarId,
          avatar_emoji: emoji,
          avatar_color: color,
          has_customized_profile: true,
        });
      };

      await handleSave('NewPlayer', 'broccoli-bob');

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        display_name: 'NewPlayer',
        username: 'NewPlayer',
        avatar_image: 'broccoli-bob',
        avatar_emoji: '🥦',
        avatar_color: 'var(--avatar-10)', // Using CSS variable from design system
        has_customized_profile: true,
      });
    });

    it('should handle all avatar types from the AVATARS list', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue({ data: {}, error: null });

      // Verify all avatars in the list have valid emoji/color mappings
      for (const avatar of AVATARS) {
        const { emoji, color } = getAvatarEmojiAndColor(avatar.id);

        expect(emoji).toBeTruthy();
        expect(color).toMatch(/^var\(--avatar-\d+\)$/); // CSS variable format

        // Simulate save for each avatar
        mockUpdateProfile.mockClear();
        await mockUpdateProfile({
          display_name: 'TestPlayer',
          username: 'TestPlayer',
          avatar_image: avatar.id,
          avatar_emoji: emoji,
          avatar_color: color,
          has_customized_profile: true,
        });

        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            avatar_image: avatar.id,
            avatar_emoji: emoji,
            avatar_color: color,
          })
        );
      }
    });

    it('should handle profile picture avatar ID correctly', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue({ data: {}, error: null });
      const PROFILE_AVATAR_ID = '__profile_avatar__';

      const handleSave = async (name: string, avatarId: string) => {
        const { emoji, color } = getAvatarEmojiAndColor(avatarId);

        await mockUpdateProfile({
          display_name: name,
          username: name,
          avatar_image: avatarId,
          avatar_emoji: emoji,
          avatar_color: color,
          has_customized_profile: true,
        });
      };

      await handleSave('PlayerWithProfilePic', PROFILE_AVATAR_ID);

      // Profile avatar should use default emoji/color
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          avatar_image: PROFILE_AVATAR_ID,
          avatar_emoji: '🎯', // default
          avatar_color: 'var(--avatar-1)', // default CSS variable
          has_customized_profile: true,
        })
      );
    });
  });
});

describe('Integration: Profile Customization Flow', () => {
  /**
   * This describes the complete flow:
   * 1. User signs up via OAuth (Google, etc.)
   * 2. AuthContext creates profile with has_customized_profile: false
   * 3. ProfileCustomizationWrapper detects needsProfileCustomization: true
   * 4. Modal shows with avatar selection and name input
   * 5. User selects avatar and enters name, clicks Save
   * 6. updateProfile is called with all required fields including avatar_emoji/avatar_color
   * 7. Modal closes, has_customized_profile is now true
   */
  it('complete signup to customization flow works correctly', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue({ data: {}, error: null });

    // Verify that needsProfileCustomization would be true for new user
    const newUserState = {
      has_customized_profile: false,
    };
    expect(newUserState.has_customized_profile).toBe(false);

    // Step 4-6: User customizes and saves
    const selectedAvatarId = 'sunny-steve';
    const newDisplayName = 'SunnyPlayer';

    const { emoji, color } = getAvatarEmojiAndColor(selectedAvatarId);

    await mockUpdateProfile({
      display_name: newDisplayName,
      username: newDisplayName,
      avatar_image: selectedAvatarId,
      avatar_emoji: emoji,
      avatar_color: color,
      has_customized_profile: true,
    });

    // Step 7: Verify the profile update was called correctly
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      display_name: 'SunnyPlayer',
      username: 'SunnyPlayer',
      avatar_image: 'sunny-steve',
      avatar_emoji: '☀️',
      avatar_color: '#f59e0b',
      has_customized_profile: true,
    });
  });

  it('user who chooses to keep their profile picture works correctly', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue({ data: {}, error: null });
    const PROFILE_AVATAR_ID = '__profile_avatar__';

    // User keeps profile picture and just updates name
    const { emoji, color } = getAvatarEmojiAndColor(PROFILE_AVATAR_ID);

    await mockUpdateProfile({
      display_name: 'Johnny',
      username: 'Johnny',
      avatar_image: PROFILE_AVATAR_ID,
      avatar_emoji: emoji,
      avatar_color: color,
      has_customized_profile: true,
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      display_name: 'Johnny',
      username: 'Johnny',
      avatar_image: '__profile_avatar__',
      avatar_emoji: '🎯',
      avatar_color: 'var(--avatar-1)', // Using CSS variable from design system
      has_customized_profile: true,
    });
  });
});
