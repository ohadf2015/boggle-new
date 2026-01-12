import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfilePictureUpload } from '@/hooks/useProfilePictureUpload';
import { uploadProfilePicture, removeProfilePicture } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { PROFILE_AVATAR_ID } from '@/components/Avatar';
import type { ProfileData } from '@/contexts/auth/authTypes';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  uploadProfilePicture: jest.fn(),
  removeProfilePicture: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('useProfilePictureUpload', () => {
  const mockUserId = 'test-user-123';
  const mockProfile: ProfileData = {
    id: mockUserId,
    username: 'testuser',
    display_name: 'Test User',
    avatar_emoji: '🎯',
    avatar_color: '#FFE135',
    avatar_image: 'broccoli-bob',
    profile_picture_url: null,
    profile_picture_provider: null,
    has_customized_profile: true,
  };

  const mockUpdateProfile = jest.fn();
  const mockRefreshProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleProfilePictureUpload', () => {
    it('should set avatar_image to PROFILE_AVATAR_ID when uploading a custom profile picture', async () => {
      // Arrange
      const mockUrl = 'https://example.com/profile.jpg?t=123456';
      (uploadProfilePicture as jest.Mock).mockResolvedValue({
        url: mockUrl,
        error: null,
      });
      mockUpdateProfile.mockResolvedValue({ data: { ...mockProfile }, error: null });

      const { result } = renderHook(() =>
        useProfilePictureUpload({
          userId: mockUserId,
          profile: mockProfile,
          updateProfile: mockUpdateProfile,
          refreshProfile: mockRefreshProfile,
        })
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      // Act
      await act(async () => {
        await result.current.handleProfilePictureUpload(mockEvent);
      });

      // Assert - The bug fix: avatar_image must be set to PROFILE_AVATAR_ID
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          profile_picture_url: mockUrl,
          profile_picture_provider: 'custom',
          avatar_image: PROFILE_AVATAR_ID, // This is the fix!
        });
      });

      expect(mockRefreshProfile).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });

    it('should upload the file to Supabase Storage', async () => {
      // Arrange
      const mockUrl = 'https://example.com/profile.jpg?t=123456';
      (uploadProfilePicture as jest.Mock).mockResolvedValue({
        url: mockUrl,
        error: null,
      });
      mockUpdateProfile.mockResolvedValue({ data: { ...mockProfile }, error: null });

      const { result } = renderHook(() =>
        useProfilePictureUpload({
          userId: mockUserId,
          profile: mockProfile,
          updateProfile: mockUpdateProfile,
          refreshProfile: mockRefreshProfile,
        })
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      // Act
      await act(async () => {
        await result.current.handleProfilePictureUpload(mockEvent);
      });

      // Assert
      expect(uploadProfilePicture).toHaveBeenCalledWith(mockUserId, file);
    });

    it('should reject files larger than 4MB', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useProfilePictureUpload({
          userId: mockUserId,
          profile: mockProfile,
          updateProfile: mockUpdateProfile,
          refreshProfile: mockRefreshProfile,
        })
      );

      // Create a file that's too large (5MB)
      const largeFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const mockEvent = {
        target: { files: [largeFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      // Act
      await act(async () => {
        await result.current.handleProfilePictureUpload(mockEvent);
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith('profile.imageTooLarge');
      expect(uploadProfilePicture).not.toHaveBeenCalled();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should reject invalid file types', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useProfilePictureUpload({
          userId: mockUserId,
          profile: mockProfile,
          updateProfile: mockUpdateProfile,
          refreshProfile: mockRefreshProfile,
        })
      );

      const invalidFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const mockEvent = {
        target: { files: [invalidFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      // Act
      await act(async () => {
        await result.current.handleProfilePictureUpload(mockEvent);
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith('profile.invalidImageType');
      expect(uploadProfilePicture).not.toHaveBeenCalled();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should handle upload errors gracefully', async () => {
      // Arrange
      (uploadProfilePicture as jest.Mock).mockResolvedValue({
        url: null,
        error: { message: 'Upload failed' },
      });

      const { result } = renderHook(() =>
        useProfilePictureUpload({
          userId: mockUserId,
          profile: mockProfile,
          updateProfile: mockUpdateProfile,
          refreshProfile: mockRefreshProfile,
        })
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      // Act
      await act(async () => {
        await result.current.handleProfilePictureUpload(mockEvent);
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith('profile.uploadError');
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  describe('handleRemoveProfilePicture', () => {
    it('should remove custom profile picture and reset avatar_image', async () => {
      // Arrange
      const profileWithCustomPicture: ProfileData = {
        ...mockProfile,
        profile_picture_url: 'https://example.com/profile.jpg',
        profile_picture_provider: 'custom',
        avatar_image: PROFILE_AVATAR_ID,
      };

      (removeProfilePicture as jest.Mock).mockResolvedValue({ error: null });
      mockUpdateProfile.mockResolvedValue({ data: profileWithCustomPicture, error: null });

      const { result } = renderHook(() =>
        useProfilePictureUpload({
          userId: mockUserId,
          profile: profileWithCustomPicture,
          updateProfile: mockUpdateProfile,
          refreshProfile: mockRefreshProfile,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleRemoveProfilePicture();
      });

      // Assert
      expect(removeProfilePicture).toHaveBeenCalledWith(mockUserId);
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        profile_picture_url: null,
        profile_picture_provider: null,
      });
      expect(mockRefreshProfile).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });

    it('should not call removeProfilePicture for OAuth pictures', async () => {
      // Arrange
      const profileWithOAuthPicture: ProfileData = {
        ...mockProfile,
        profile_picture_url: 'https://example.com/oauth-profile.jpg',
        profile_picture_provider: 'google',
        avatar_image: PROFILE_AVATAR_ID,
      };

      mockUpdateProfile.mockResolvedValue({ data: profileWithOAuthPicture, error: null });

      const { result } = renderHook(() =>
        useProfilePictureUpload({
          userId: mockUserId,
          profile: profileWithOAuthPicture,
          updateProfile: mockUpdateProfile,
          refreshProfile: mockRefreshProfile,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleRemoveProfilePicture();
      });

      // Assert
      expect(removeProfilePicture).not.toHaveBeenCalled();
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        profile_picture_url: null,
        profile_picture_provider: null,
      });
    });
  });
});
