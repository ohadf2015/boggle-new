'use client';

/**
 * @deprecated Profile picture upload has been removed.
 * This stub is kept for backward compatibility.
 */

interface UseProfilePictureUploadReturn {
  isUploading: boolean;
  handleProfilePictureUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveProfilePicture: () => Promise<void>;
}

export function useProfilePictureUpload(): UseProfilePictureUploadReturn {
  return {
    isUploading: false,
    handleProfilePictureUpload: async () => {},
    handleRemoveProfilePicture: async () => {},
  };
}

export default useProfilePictureUpload;
