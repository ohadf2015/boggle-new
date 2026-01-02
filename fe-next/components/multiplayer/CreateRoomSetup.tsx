'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername, validateRoomName, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import { generateRoomCode } from '@/utils/utils';
import { LanguageSelector } from '@/components/join/LanguageSelector';
import EmojiAvatarPicker, { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { AVATARS, getAvatarById, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types/game';
import { getStoredUsername, getStoredAvatarId, setStoredUsername, setStoredAvatarId } from '@/utils/profileStorage';

interface CreateRoomSetupProps {
  // Auth state
  isAuthenticated: boolean;
  displayName: string | null;
  profilePictureUrl?: string | null;
  initialAvatarId?: string;

  // Game settings
  defaultLanguage: Language;
  isSubmitting: boolean;

  // Callbacks
  onSubmit: (config: {
    gameCode: string;
    roomName: string;
    language: Language;
    hostUsername: string;
    avatarId: string;
  }) => void;
  onBack: () => void;
}

/**
 * CreateRoomSetup - Single-step room creation with profile setup
 * Combines avatar/name selection with room configuration
 */
const CreateRoomSetup: React.FC<CreateRoomSetupProps> = ({
  isAuthenticated,
  displayName,
  profilePictureUrl,
  initialAvatarId,
  defaultLanguage,
  isSubmitting,
  onSubmit,
  onBack,
}) => {
  const { t, dir } = useLanguage();

  // Auto-generate game code on mount (hidden from user)
  const [gameCode] = useState(() => generateRoomCode());

  // Profile state
  const [username, setUsername] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(() => {
    if (isAuthenticated && (profilePictureUrl || initialAvatarId)) {
      return PROFILE_AVATAR_ID;
    }
    return initialAvatarId;
  });
  const [usernameError, setUsernameError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Room settings
  const [roomName, setRoomName] = useState('');
  const [roomNameError, setRoomNameError] = useState(false);
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  // Load from localStorage on mount (only for guests)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated) {
      const savedUsername = getStoredUsername();
      const savedAvatarId = getStoredAvatarId();

      if (savedUsername && !username) {
        setUsername(savedUsername);
        setRoomName(`${savedUsername} Room`);
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
      setRoomName(`${displayName} Room`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when auth state changes
  }, [isAuthenticated, displayName]);

  // Real-time validation
  const usernameValidation = useDebouncedValidation(username, {
    validate: validateUsername,
    delay: 300,
    minLength: 2,
  });

  const roomNameValidation = useDebouncedValidation(roomName, {
    validate: validateRoomName,
    delay: 300,
    minLength: 1,
  });

  const showUsernameError = usernameError || usernameValidation.hasError;
  const usernameErrorMessage = usernameValidation.errorKey;
  const showRoomNameError = roomNameError || roomNameValidation.hasError;
  const roomNameErrorMessage = roomNameValidation.errorKey;

  // Authenticated users with a profile picture or avatar don't need to select one
  const hasAuthenticatedAvatar = isAuthenticated && (profilePictureUrl || initialAvatarId);

  // Check if form is valid
  const isValid = username.trim().length >= 2 && (selectedAvatarId || hasAuthenticatedAvatar);

  // Handle avatar selection
  const handleAvatarSelect = (avatar: AvatarConfig) => {
    setSelectedAvatarId(avatar.id);
    setAvatarError(false);
    setStoredAvatarId(avatar.id);
    // Pre-fill username with avatar name if empty
    if (!username.trim()) {
      setUsername(avatar.name);
      setRoomName(`${avatar.name} Room`);
    }
  };

  // Handle avatar selection from picker (for authenticated users)
  const handleAvatarPickerSave = ({ avatarImage }: { avatarImage: string; emoji?: string; color?: string }) => {
    if (avatarImage === PROFILE_AVATAR_ID) {
      setSelectedAvatarId(PROFILE_AVATAR_ID);
    } else {
      const avatar = getAvatarById(avatarImage);
      if (avatar) {
        setSelectedAvatarId(avatar.id);
      }
    }
    setIsAvatarPickerOpen(false);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      if (username.trim().length < 2) {
        setUsernameError(true);
      }
      if (!selectedAvatarId && !hasAuthenticatedAvatar) {
        setAvatarError(true);
      }
      return;
    }

    const effectiveAvatarId = selectedAvatarId || initialAvatarId || PROFILE_AVATAR_ID;
    const finalRoomName = roomName.trim() || `${username} Room`;

    // Save to localStorage (only for guests)
    if (!isAuthenticated) {
      setStoredUsername(username);
      if (selectedAvatarId) {
        setStoredAvatarId(selectedAvatarId);
      }
    }

    onSubmit({
      gameCode,
      roomName: finalRoomName,
      language,
      hostUsername: isAuthenticated && displayName ? displayName : username,
      avatarId: effectiveAvatarId,
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
            disabled={isSubmitting}
            className="absolute start-4 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-neo-black dark:text-neo-white">
              {t('multiplayerFlow.createSetup.title') || 'Create Room'}
            </h1>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-2 pb-6 min-h-0 overflow-y-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-md"
          >
            <Card className="border-3 border-neo-black dark:border-slate-600 shadow-hard">
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Avatar and Name Row */}
                  <div className="flex items-start gap-4">
                    {/* Avatar Selection */}
                    {hasAuthenticatedAvatar ? (
                      <button
                        type="button"
                        onClick={() => setIsAvatarPickerOpen(true)}
                        className="relative flex-shrink-0 group"
                      >
                        <div className="w-20 h-20 rounded-full border-3 border-neo-cyan shadow-hard overflow-hidden group-hover:border-purple-400 transition-colors">
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
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neo-yellow text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm group-hover:scale-110 transition-transform">
                          <Pencil className="w-3 h-3" />
                        </div>
                      </button>
                    ) : (
                      <div className="relative flex-shrink-0">
                        {selectedAvatarId ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAvatarId(undefined)}
                            className="relative group"
                          >
                            <div className={cn(
                              "w-20 h-20 rounded-full border-3 shadow-hard overflow-hidden transition-all",
                              avatarError ? "border-red-500" : "border-neo-cyan"
                            )}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getAvatarPath(getAvatarById(selectedAvatarId) || AVATARS[0])}
                                alt="Selected avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neo-yellow text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm group-hover:scale-110 transition-transform">
                              <Pencil className="w-3 h-3" />
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              // Select first available avatar
                              if (AVATARS.length > 0) {
                                handleAvatarSelect(AVATARS[0]);
                              }
                            }}
                            className={cn(
                              "w-20 h-20 rounded-full border-3 border-dashed flex items-center justify-center transition-all",
                              avatarError
                                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                : "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 hover:border-neo-cyan"
                            )}
                          >
                            <span className="text-2xl text-slate-400">?</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Name Input */}
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="create-username" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                        {t('multiplayerFlow.createSetup.nameLabel') || 'Your name'}
                      </Label>

                      {isAuthenticated && displayName ? (
                        <div className="p-2.5 rounded-neo bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700">
                          <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{displayName}</p>
                        </div>
                      ) : (
                        <>
                          <Input
                            id="create-username"
                            value={username}
                            onChange={(e) => {
                              const newName = sanitizeInput(e.target.value, 20);
                              setUsername(newName);
                              // Auto-update room name if it matches the pattern
                              if (!roomName || roomName === `${username} Room`) {
                                setRoomName(`${newName} Room`);
                              }
                              if (usernameError) setUsernameError(false);
                            }}
                            required
                            aria-invalid={showUsernameError ? 'true' : undefined}
                            className={cn(
                              "h-11 text-base bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400",
                              getValidationClasses(
                                usernameError ? 'invalid' : usernameValidation.state,
                                showUsernameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
                              )
                            )}
                            placeholder={t('multiplayerFlow.createSetup.namePlaceholder') || 'Enter your name'}
                            maxLength={20}
                          />
                          {showUsernameError && (
                            <p className="text-xs text-red-400" role="alert">
                              {t(usernameErrorMessage || 'validation.usernameRequired')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Avatar Grid (for guests without selection) */}
                  {!hasAuthenticatedAvatar && !selectedAvatarId && (
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                        {t('multiplayerFlow.createSetup.avatarLabel') || 'Pick an avatar'}
                        <span className="text-red-500 ms-1">*</span>
                      </Label>
                      <div className={cn(
                        "max-h-32 overflow-y-auto rounded-lg border-2 p-2 bg-white/50 dark:bg-slate-700/50 transition-colors",
                        avatarError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-slate-200 dark:border-slate-600"
                      )}>
                        <div className="grid grid-cols-6 gap-1.5">
                          {AVATARS.map((avatar) => (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => handleAvatarSelect(avatar)}
                              className="aspect-square rounded-full border-2 border-neo-black hover:scale-105 shadow-hard-sm transition-all overflow-hidden"
                              aria-label={`Select ${avatar.name} avatar`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getAvatarPath(avatar)}
                                alt={avatar.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      {avatarError && (
                        <p className="text-xs text-red-500 font-medium" role="alert">
                          {t('multiplayerFlow.createSetup.avatarRequired') || 'Please select an avatar'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Room Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-room-name" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.createSetup.roomNameLabel') || 'Room name'}
                    </Label>
                    <Input
                      id="create-room-name"
                      value={roomName}
                      onChange={(e) => {
                        setRoomName(sanitizeInput(e.target.value, 30));
                        if (roomNameError) setRoomNameError(false);
                      }}
                      aria-invalid={showRoomNameError ? 'true' : undefined}
                      className={cn(
                        "h-11 text-base bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400",
                        getValidationClasses(
                          roomNameError ? 'invalid' : roomNameValidation.state,
                          showRoomNameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
                        )
                      )}
                      placeholder={t('multiplayerFlow.createSetup.roomNamePlaceholder') || 'My awesome room'}
                      maxLength={30}
                    />
                    <p className="text-xs text-neo-black/60 dark:text-slate-400">
                      {t('multiplayerFlow.createSetup.roomNameHint') || 'This name is shown to other players'}
                    </p>
                    {showRoomNameError && (
                      <p className="text-xs text-red-400" role="alert">
                        {t(roomNameErrorMessage || 'validation.roomNameInvalid')}
                      </p>
                    )}
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-1.5">
                    <LanguageSelector
                      selectedLanguage={language}
                      onLanguageChange={setLanguage}
                    />
                    <p className="text-xs text-neo-black/60 dark:text-slate-400">
                      {t('multiplayerFlow.createSetup.languageHint') || 'Players will find words in this language'}
                    </p>
                  </div>

                  {/* Create Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    variant="success"
                    size="lg"
                    className="w-full h-14 text-lg font-black uppercase mt-2"
                  >
                    <Crown className="mr-2 w-5 h-5" />
                    {isSubmitting
                      ? (t('multiplayerFlow.createSetup.creating') || 'Creating...')
                      : (t('multiplayerFlow.createSetup.createButton') || 'Create Room')
                    }
                  </Button>
                </form>

                {/* Avatar picker modal for authenticated users */}
                {hasAuthenticatedAvatar && (
                  <EmojiAvatarPicker
                    isOpen={isAvatarPickerOpen}
                    onClose={() => setIsAvatarPickerOpen(false)}
                    onSave={handleAvatarPickerSave}
                    currentAvatarImage={selectedAvatarId}
                    profileAvatar={{
                      profilePictureUrl: profilePictureUrl,
                      avatarEmoji: undefined,
                      avatarColor: undefined,
                      displayName: displayName || undefined,
                      avatarImage: initialAvatarId,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CreateRoomSetup;
