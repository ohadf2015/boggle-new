import { useState, useEffect, useCallback } from 'react';
import { validateUsername } from '@/utils/validation';
import { useDebouncedValidation } from '@/hooks/useDebouncedValidation';
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { getAvatarById, type AvatarConfig } from '@/utils/avatarConfig';

interface UseProfileSetupOptions {
  isAuthenticated: boolean;
  displayName?: string | null;
  profilePictureUrl?: string | null;
  initialAvatarId?: string;
  /** Initial username to use */
  initialUsername?: string;
}

interface UseProfileSetupReturn {
  // State
  username: string;
  selectedAvatarId: string | undefined;
  usernameError: boolean;
  avatarError: boolean;
  isAvatarPickerOpen: boolean;

  // Setters
  setUsername: (value: string) => void;
  setSelectedAvatarId: (id: string | undefined) => void;
  setUsernameError: (value: boolean) => void;
  setAvatarError: (value: boolean) => void;
  setIsAvatarPickerOpen: (value: boolean) => void;

  // Validation
  usernameValidation: ReturnType<typeof useDebouncedValidation>;
  showUsernameError: boolean;
  usernameErrorMessage: string | null;

  // Derived state
  hasAuthenticatedAvatar: boolean;
  isProfileValid: boolean;

  // Handlers
  handleAvatarSelect: (avatar: AvatarConfig) => void;
  handleAvatarPickerSave: (data: { avatarImage: string; emoji?: string; color?: string }) => void;
  validate: () => boolean;
  saveToLocalStorage: () => void;
}

/**
 * Hook for managing profile setup state (username + avatar)
 *
 * Used by CreateRoomSetup, JoinRoomSetup, ProfileSetup, and similar components
 * that need to collect user profile information.
 *
 * Handles:
 * - Username state with validation
 * - Avatar selection with localStorage persistence
 * - Authentication-aware defaults (profile picture for logged-in users)
 * - Error state management
 *
 * @example
 * ```tsx
 * const {
 *   username, setUsername,
 *   selectedAvatarId,
 *   handleAvatarSelect,
 *   isProfileValid,
 *   showUsernameError,
 *   usernameErrorMessage,
 * } = useProfileSetup({
 *   isAuthenticated,
 *   displayName,
 *   profilePictureUrl,
 *   initialAvatarId,
 * });
 * ```
 */
export function useProfileSetup(options: UseProfileSetupOptions): UseProfileSetupReturn {
  const {
    isAuthenticated,
    displayName,
    profilePictureUrl,
    initialAvatarId,
    initialUsername = '',
  } = options;

  // Profile state
  const [username, setUsername] = useState(initialUsername);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(() => {
    if (isAuthenticated && (profilePictureUrl || initialAvatarId)) {
      return PROFILE_AVATAR_ID;
    }
    return initialAvatarId;
  });
  const [usernameError, setUsernameError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Load from localStorage on mount (only for guests)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated) {
      const savedUsername = localStorage.getItem('boggle_username');
      const savedAvatarId = localStorage.getItem('boggle_avatar_id');

      if (savedUsername && !username) {
        setUsername(savedUsername);
      }
      if (savedAvatarId && !selectedAvatarId) {
        setSelectedAvatarId(savedAvatarId);
      }
    }
  }, [isAuthenticated]); // Only run on mount and auth change

  // For authenticated users, use display name
  useEffect(() => {
    if (isAuthenticated && displayName && !username) {
      setUsername(displayName);
    }
  }, [isAuthenticated, displayName]);

  // Real-time validation
  const usernameValidation = useDebouncedValidation(username, {
    validate: validateUsername,
    delay: 300,
    minLength: 2,
  });

  const showUsernameError = usernameError || usernameValidation.hasError;
  const usernameErrorMessage = usernameValidation.errorKey ?? null;

  // Authenticated users with a profile picture or avatar don't need to select one
  const hasAuthenticatedAvatar = isAuthenticated && !!(profilePictureUrl || initialAvatarId);

  // Check if profile is valid
  const isProfileValid = username.trim().length >= 2 && !!(selectedAvatarId || hasAuthenticatedAvatar);

  // Handle avatar selection from grid
  const handleAvatarSelect = useCallback(
    (avatar: AvatarConfig) => {
      setSelectedAvatarId(avatar.id);
      setAvatarError(false);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('boggle_avatar_id', avatar.id);
      }

      // Pre-fill username with avatar name if empty
      if (!username.trim()) {
        setUsername(avatar.name);
      }
    },
    [username]
  );

  // Handle avatar selection from picker (for authenticated users)
  const handleAvatarPickerSave = useCallback(
    ({ avatarImage }: { avatarImage: string; emoji?: string; color?: string }) => {
      if (avatarImage === PROFILE_AVATAR_ID) {
        setSelectedAvatarId(PROFILE_AVATAR_ID);
      } else {
        const avatar = getAvatarById(avatarImage);
        if (avatar) {
          setSelectedAvatarId(avatar.id);
        }
      }
      setAvatarError(false);
      setIsAvatarPickerOpen(false);
    },
    []
  );

  // Validate profile and set error states
  const validate = useCallback((): boolean => {
    let isValid = true;

    if (!username.trim() || username.trim().length < 2) {
      setUsernameError(true);
      isValid = false;
    } else {
      setUsernameError(false);
    }

    if (!selectedAvatarId && !hasAuthenticatedAvatar) {
      setAvatarError(true);
      isValid = false;
    } else {
      setAvatarError(false);
    }

    return isValid;
  }, [username, selectedAvatarId, hasAuthenticatedAvatar]);

  // Save current state to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (username.trim()) {
        localStorage.setItem('boggle_username', username.trim());
      }
      if (selectedAvatarId && selectedAvatarId !== PROFILE_AVATAR_ID) {
        localStorage.setItem('boggle_avatar_id', selectedAvatarId);
      }
    }
  }, [username, selectedAvatarId]);

  return {
    // State
    username,
    selectedAvatarId,
    usernameError,
    avatarError,
    isAvatarPickerOpen,

    // Setters
    setUsername,
    setSelectedAvatarId,
    setUsernameError,
    setAvatarError,
    setIsAvatarPickerOpen,

    // Validation
    usernameValidation,
    showUsernameError,
    usernameErrorMessage,

    // Derived state
    hasAuthenticatedAvatar,
    isProfileValid,

    // Handlers
    handleAvatarSelect,
    handleAvatarPickerSave,
    validate,
    saveToLocalStorage,
  };
}

export default useProfileSetup;
