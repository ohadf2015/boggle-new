'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import EmojiAvatarPicker, { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { AVATARS, getAvatarById, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import { cn } from '@/lib/utils';
import { getStoredUsername, getStoredAvatarId, setStoredUsername, setStoredAvatarId } from '@/utils/profileStorage';

export interface ProfileData {
  username: string;
  avatarId: string;
  roomName?: string; // Only for create mode
}

interface ProfileSetupProps {
  mode: 'create' | 'join';
  initialUsername?: string;
  initialAvatarId?: string;
  isAuthenticated: boolean;
  displayName: string | null;
  profilePictureUrl?: string | null;
  onComplete: (profile: ProfileData) => void;
  onBack: () => void;
}

/**
 * ProfileSetup - Unified profile setup for both create/join paths
 * Screen 2 in the new multiplayer flow - collects name and avatar once
 */
const ProfileSetup: React.FC<ProfileSetupProps> = ({
  mode,
  initialUsername = '',
  initialAvatarId,
  isAuthenticated,
  displayName,
  profilePictureUrl,
  onComplete,
  onBack,
}) => {
  const { t, dir } = useLanguage();
  const [username, setUsername] = useState(initialUsername);
  // For authenticated users with a profile avatar, default to using their profile (PROFILE_AVATAR_ID)
  // They can change to a game avatar if they want, and can always go back to profile
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(() => {
    // If authenticated user has a profile picture or avatar, default to profile avatar
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
      const savedUsername = getStoredUsername();
      const savedAvatarId = getStoredAvatarId();

      if (savedUsername && !username) {
        setUsername(savedUsername);
      }
      if (savedAvatarId && !selectedAvatarId) {
        setSelectedAvatarId(savedAvatarId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally run only on mount
  }, []);

  // For authenticated users, use display name
  useEffect(() => {
    if (isAuthenticated && displayName && !username) {
      setUsername(displayName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when auth state changes
  }, [isAuthenticated, displayName]);

  // Real-time validation
  const usernameValidation = useDebouncedValidation(username, {
    validate: validateUsername,
    delay: 300,
    minLength: 2,
  });

  const showUsernameError = usernameError || usernameValidation.hasError;
  const usernameErrorMessage = usernameValidation.errorKey;

  // Authenticated users with a profile picture or avatar don't need to select one
  const hasAuthenticatedAvatar = isAuthenticated && (profilePictureUrl || initialAvatarId);

  // Check if form is valid
  // For authenticated users with existing avatar, they don't need to select one
  const isValid = username.trim().length >= 2 && (selectedAvatarId || hasAuthenticatedAvatar);

  // Handle avatar selection
  const handleAvatarSelect = (avatar: AvatarConfig) => {
    setSelectedAvatarId(avatar.id);
    setAvatarError(false); // Clear error when avatar is selected
    setStoredAvatarId(avatar.id);
    // Pre-fill username with avatar name if empty
    if (!username.trim()) {
      setUsername(avatar.name);
    }
  };

  // Handle avatar selection from picker (for authenticated users)
  const handleAvatarPickerSave = ({ avatarImage }: { avatarImage: string; emoji?: string; color?: string }) => {
    if (avatarImage === PROFILE_AVATAR_ID) {
      // User selected their profile avatar - clear the game avatar to use profile
      setSelectedAvatarId(PROFILE_AVATAR_ID);
    } else {
      const avatar = getAvatarById(avatarImage);
      if (avatar) {
        setSelectedAvatarId(avatar.id);
      }
    }
    setIsAvatarPickerOpen(false);
  };

  // Handle continue
  const handleContinue = () => {
    if (!isValid) {
      if (username.trim().length < 2) {
        setUsernameError(true);
      }
      if (!selectedAvatarId && !hasAuthenticatedAvatar) {
        setAvatarError(true);
      }
      return;
    }

    // For authenticated users, use their existing avatar if no new selection made
    // PROFILE_AVATAR_ID means "use profile picture/emoji" instead of a game avatar
    const effectiveAvatarId = selectedAvatarId || initialAvatarId || PROFILE_AVATAR_ID;

    // Save to localStorage (only for guests, authenticated users keep their profile settings)
    if (!isAuthenticated) {
      setStoredUsername(username);
      if (selectedAvatarId) {
        setStoredAvatarId(selectedAvatarId);
      }
    }

    // Generate room name for create mode
    const roomName = mode === 'create' ? `${username} Room` : undefined;

    onComplete({
      username,
      avatarId: effectiveAvatarId,
      roomName,
    });
  };

  return (
    <>
      <LandscapeIndicator />

      <div dir={dir} className="min-h-screen h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center py-4 sm:py-6 flex-shrink-0 px-4"
        >
          <button
            onClick={onBack}
            className="absolute start-4 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-neo-black dark:text-neo-white">
              {t('multiplayerFlow.profileSetup.title') || 'Player Setup'}
            </h1>
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-neo-cyan border-2 border-neo-black dark:border-slate-300" />
              <div className="w-3 h-3 rounded-full bg-neo-cream/30 dark:bg-slate-600/50 border-2 border-neo-black/30 dark:border-slate-500" />
              <span className="text-xs text-neo-black/60 dark:text-slate-400 ms-2">
                {t('multiplayerFlow.profileSetup.progress') || 'Step 1 of 2'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-4 pb-6 min-h-0 overflow-y-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-md"
          >
            <Card className="border-3 border-neo-black dark:border-slate-600 shadow-hard">
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Contextual message */}
                <p className="text-center text-sm text-neo-black/80 dark:text-slate-300">
                  {mode === 'create'
                    ? (t('multiplayerFlow.profileSetup.forCreate') || 'Almost there! Set up your profile to create a room.')
                    : (t('multiplayerFlow.profileSetup.forJoin') || 'Almost there! Set up your profile to join a room.')
                  }
                </p>

                {/* Avatar Selection - Authenticated users can change their avatar too */}
                {hasAuthenticatedAvatar ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.profileSetup.avatarLabel') || 'Your avatar'}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsAvatarPickerOpen(true)}
                      className="w-full p-3 rounded-neo bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 flex items-center gap-3 transition-colors group"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full border-3 border-neo-cyan shadow-hard overflow-hidden group-hover:border-purple-400 transition-colors">
                          {/* Show selected game avatar if set (not PROFILE_AVATAR_ID), otherwise profile picture or initial avatar */}
                          {selectedAvatarId && selectedAvatarId !== PROFILE_AVATAR_ID ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getAvatarPath(getAvatarById(selectedAvatarId) || AVATARS[0])}
                              alt={displayName || 'Avatar'}
                              className="w-full h-full object-cover"
                            />
                          ) : profilePictureUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={profilePictureUrl}
                              alt={displayName || 'Profile'}
                              className="w-full h-full object-cover"
                            />
                          ) : initialAvatarId ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getAvatarPath(getAvatarById(initialAvatarId) || AVATARS[0])}
                              alt={displayName || 'Avatar'}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        {/* Edit indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-neo-yellow text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm group-hover:scale-110 transition-transform">
                          <Pencil className="w-2 h-2" />
                        </div>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {selectedAvatarId && selectedAvatarId !== PROFILE_AVATAR_ID
                            ? (t('multiplayerFlow.profileSetup.usingGameAvatar') || 'Using game avatar')
                            : (t('multiplayerFlow.profileSetup.usingProfileAvatar') || 'Using your profile avatar')
                          }
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('multiplayerFlow.profileSetup.tapToChange') || 'Tap to change'}
                        </p>
                      </div>
                    </button>

                    {/* Avatar picker modal */}
                    <EmojiAvatarPicker
                      isOpen={isAvatarPickerOpen}
                      onClose={() => setIsAvatarPickerOpen(false)}
                      onSave={handleAvatarPickerSave}
                      currentAvatarImage={selectedAvatarId}
                      profileAvatar={{
                        profilePictureUrl: profilePictureUrl,
                        // Use initialAvatarId to show the profile's avatar_image in the picker
                        avatarEmoji: undefined,
                        avatarColor: undefined,
                        displayName: displayName || undefined,
                        // Pass the profile's avatar_image so it can be displayed as the "profile" option
                        avatarImage: initialAvatarId,
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.profileSetup.avatarLabel') || 'Choose your avatar'}
                      <span className="text-red-500 ms-1">*</span>
                    </Label>

                    {/* Scrollable avatar grid - shows all avatars */}
                    <div className={cn(
                      "max-h-48 overflow-y-auto rounded-lg border-2 p-3 bg-white/50 dark:bg-slate-700/50 transition-colors",
                      avatarError
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-slate-200 dark:border-slate-600"
                    )}>
                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                        {AVATARS.map((avatar) => {
                          const isSelected = selectedAvatarId === avatar.id;
                          const avatarConfig = getAvatarById(avatar.id);

                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => handleAvatarSelect(avatar)}
                            className={cn(
                              "aspect-square rounded-full border-3 shadow-hard-sm transition-all overflow-hidden",
                              isSelected
                                ? "border-neo-cyan scale-110 shadow-hard ring-2 ring-neo-cyan ring-offset-1"
                                : "border-neo-black hover:scale-105"
                            )}
                            aria-label={`Select ${avatar.name} avatar`}
                            aria-pressed={isSelected}
                          >
                            {avatarConfig && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={getAvatarPath(avatarConfig)}
                                alt={avatar.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    </div>
                    {/* Hint or error message */}
                    {avatarError ? (
                      <p className="text-xs text-red-500 font-medium" role="alert">
                        {t('multiplayerFlow.profileSetup.avatarRequired') || 'Please select an avatar to continue'}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('multiplayerFlow.profileSetup.avatarHint') || 'Pick an avatar to represent you'}
                      </p>
                    )}
                  </div>
                )}

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="profile-username" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                    {t('multiplayerFlow.profileSetup.usernameLabel') || 'What should we call you?'}
                  </Label>

                  {isAuthenticated && displayName ? (
                    // Authenticated user - show display name as badge
                    <div className="p-3 rounded-neo bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700">
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {t('joinView.playingAs') || 'Playing as'}{' '}
                        <span className="font-bold text-purple-600 dark:text-purple-400">{displayName}</span>
                      </p>
                    </div>
                  ) : (
                    // Guest user - editable input
                    <>
                      <Input
                        id="profile-username"
                        value={username}
                        onChange={(e) => {
                          setUsername(sanitizeInput(e.target.value, 20));
                          if (usernameError) setUsernameError(false);
                        }}
                        required
                        aria-invalid={showUsernameError ? 'true' : undefined}
                        aria-describedby={showUsernameError ? 'username-error' : 'username-hint'}
                        className={cn(
                          "h-14 text-lg bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500",
                          getValidationClasses(
                            usernameError ? 'invalid' : usernameValidation.state,
                            showUsernameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
                          )
                        )}
                        placeholder={t('multiplayerFlow.profileSetup.usernamePlaceholder') || 'Enter your name'}
                        maxLength={20}
                      />
                      <p id="username-hint" className="text-xs text-slate-500 dark:text-slate-400">
                        {t('multiplayerFlow.profileSetup.usernameHint') || '2-20 characters, letters and numbers'}
                      </p>
                      {showUsernameError && (
                        <p id="username-error" className="text-xs text-red-400" role="alert">
                          {t(usernameErrorMessage || 'validation.usernameRequired')}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleContinue}
                  disabled={!isValid}
                  variant="success"
                  size="lg"
                  className="w-full h-14 text-lg font-black uppercase"
                >
                  <Check className="mr-2" />
                  {t('multiplayerFlow.profileSetup.continueButton') || 'Continue'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ProfileSetup;
