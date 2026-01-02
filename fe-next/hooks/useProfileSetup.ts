import { useState, useEffect, useCallback, useRef } from 'react';
import { validateUsername } from '@/utils/validation';
import { useDebouncedValidation } from '@/hooks/useDebouncedValidation';
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { getAvatarById, type AvatarConfig } from '@/utils/avatarConfig';
import {
  getStoredUsername,
  getStoredAvatarId,
  setStoredUsername,
  setStoredAvatarId,
  saveStoredProfile,
} from '@/utils/profileStorage';

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

  // Track if username has been manually set to prevent overwrites
  const usernameLoadedRef = useRef<boolean>(!!initialUsername);

  // Load from localStorage on mount (only for guests)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated && !usernameLoadedRef.current) {
      const savedUsername = getStoredUsername();
      const savedAvatarId = getStoredAvatarId();

      if (savedUsername && !username) {
        setUsername(savedUsername);
        usernameLoadedRef.current = true;
      }
      if (savedAvatarId && !selectedAvatarId) {
        setSelectedAvatarId(savedAvatarId);
      }
    }
  }, [isAuthenticated, username, selectedAvatarId]); // Include username/selectedAvatarId to properly check state

  // For authenticated users, use display name - but only if username hasn't been set yet
  useEffect(() => {
    if (isAuthenticated && displayName && !username && !usernameLoadedRef.current) {
      setUsername(displayName);
      usernameLoadedRef.current = true;
    }
  }, [isAuthenticated, displayName, username]);

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

      // Save to profile storage
      setStoredAvatarId(avatar.id);

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
    saveStoredProfile({
      username: username.trim() || undefined,
      avatarId: selectedAvatarId !== PROFILE_AVATAR_ID ? selectedAvatarId : undefined,
    });
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
