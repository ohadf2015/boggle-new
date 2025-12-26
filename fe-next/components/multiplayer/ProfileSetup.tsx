'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import AvatarSelectorButton from '@/components/join/AvatarSelectorButton';
import { AVATARS, getAvatarById, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import { cn } from '@/lib/utils';

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
  onComplete,
  onBack,
}) => {
  const { t, dir } = useLanguage();
  const [username, setUsername] = useState(initialUsername);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(initialAvatarId);
  const [usernameError, setUsernameError] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUsername = localStorage.getItem('boggle_username');
      const savedAvatarId = localStorage.getItem('boggle_avatar_id');

      if (savedUsername && !username) {
        setUsername(savedUsername);
      }
      if (savedAvatarId && !selectedAvatarId) {
        setSelectedAvatarId(savedAvatarId);
      }
    }
  }, []);

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
  const usernameErrorMessage = usernameValidation.errorKey;

  // Check if form is valid
  const isValid = username.trim().length >= 2 && selectedAvatarId;

  // Handle avatar selection
  const handleAvatarSelect = (avatar: AvatarConfig) => {
    setSelectedAvatarId(avatar.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('boggle_avatar_id', avatar.id);
    }
    // Pre-fill username with avatar name if empty
    if (!username.trim()) {
      setUsername(avatar.name);
    }
  };

  // Handle continue
  const handleContinue = () => {
    if (!isValid) {
      setUsernameError(true);
      return;
    }

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('boggle_username', username);
      if (selectedAvatarId) {
        localStorage.setItem('boggle_avatar_id', selectedAvatarId);
      }
    }

    // Generate room name for create mode
    const roomName = mode === 'create' ? `${username} Room` : undefined;

    onComplete({
      username,
      avatarId: selectedAvatarId!,
      roomName,
    });
  };

  // Quick avatar selection (first 5 avatars)
  const quickAvatars = AVATARS.slice(0, 5);

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
            <FaArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-neo-black dark:text-neo-white">
              {t('multiplayerFlow.profileSetup.title') || 'Player Setup'}
            </h1>
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-neo-cyan border-2 border-neo-black" />
              <div className="w-3 h-3 rounded-full bg-neo-cream/30 border-2 border-neo-black/30" />
              <span className="text-xs text-neo-black/50 dark:text-neo-cream/50 ms-2">
                {t('multiplayerFlow.profileSetup.progress') || 'Step 1 of 2'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-6 min-h-0">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-md"
          >
            <Card className="border-3 border-neo-black dark:border-slate-600 shadow-hard">
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Contextual message */}
                <p className="text-center text-sm text-neo-black/70 dark:text-neo-cream/70">
                  {mode === 'create'
                    ? (t('multiplayerFlow.profileSetup.forCreate') || 'Almost there! Set up your profile to create a room.')
                    : (t('multiplayerFlow.profileSetup.forJoin') || 'Almost there! Set up your profile to join a room.')
                  }
                </p>

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="profile-username" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                    {t('multiplayerFlow.profileSetup.usernameLabel') || 'What should we call you?'}
                  </Label>

                  {isAuthenticated && displayName ? (
                    // Authenticated user - show display name as badge
                    <div className="p-3 rounded-neo bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-slate-600 dark:text-gray-300">
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
                      <p id="username-hint" className="text-xs text-neo-black/50 dark:text-neo-cream/50">
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

                {/* Avatar Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                    {t('multiplayerFlow.profileSetup.avatarLabel') || 'Choose your avatar'}
                  </Label>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Quick avatar buttons */}
                    {quickAvatars.map((avatar) => {
                      const isSelected = selectedAvatarId === avatar.id;
                      const avatarConfig = getAvatarById(avatar.id);

                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => handleAvatarSelect(avatar)}
                          className={cn(
                            "w-14 h-14 rounded-full border-3 shadow-hard-sm transition-all overflow-hidden",
                            isSelected
                              ? "border-neo-cyan scale-110 shadow-hard"
                              : "border-neo-black hover:scale-105"
                          )}
                          aria-label={`Select ${avatar.name} avatar`}
                          aria-pressed={isSelected}
                        >
                          {avatarConfig && (
                            <img
                              src={getAvatarPath(avatarConfig)}
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </button>
                      );
                    })}

                    {/* More avatars button */}
                    <AvatarSelectorButton
                      selectedAvatarId={selectedAvatarId}
                      onAvatarSelect={handleAvatarSelect}
                      t={t}
                      size="lg"
                      className="!w-14 !h-14"
                    />
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleContinue}
                  disabled={!isValid}
                  variant="success"
                  size="lg"
                  className="w-full h-14 text-lg font-black uppercase"
                >
                  <FaCheck className="mr-2" />
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
