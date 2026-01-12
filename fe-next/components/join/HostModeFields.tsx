'use client';

import React, { useState, useEffect } from 'react';
import { Dices, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { validateUsername, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import AvatarSelectorButton from './AvatarSelectorButton';
import EmojiAvatarPicker, { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { AVATARS, getAvatarById, type AvatarConfig } from '@/utils/avatarConfig';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';
import { getStoredAvatarId, setStoredAvatarId, setStoredUsername } from '@/utils/profileStorage';

export interface HostModeFieldsProps {
  gameCode: string;
  setGameCode: (code: string) => void;
  gameCodeError: boolean;
  setGameCodeError: (error: boolean) => void;
  gameCodeErrorKey: string | undefined;
  roomName: string;
  setRoomName: (name: string) => void;
  roomNameError: boolean;
  setRoomNameError: (error: boolean) => void;
  roomNameErrorKey: string | undefined;
  hostUsername: string;
  setHostUsername: (name: string) => void;
  hostUsernameError: boolean;
  setHostUsernameError: (error: boolean) => void;
  hostUsernameErrorKey: string | undefined;
  generateRoomCode: () => void;
  isAuthenticated: boolean;
  displayName: string;
  isProfileLoading: boolean;
  t: (key: string) => string;
}

const HostModeFields: React.FC<HostModeFieldsProps> = ({
  gameCode,
  setGameCode,
  gameCodeError,
  setGameCodeError,
  gameCodeErrorKey,
  hostUsername,
  setHostUsername,
  hostUsernameError,
  setHostUsernameError,
  hostUsernameErrorKey,
  generateRoomCode,
  isAuthenticated,
  displayName,
  isProfileLoading,
  t,
}) => {
  const { profile, updateProfile } = useAuth();

  // Avatar selection state
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(undefined);
  const [isAuthAvatarPickerOpen, setIsAuthAvatarPickerOpen] = useState(false);

  // Load avatar from profile (for auth users) or localStorage (for guests) on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isAuthenticated) {
        // Authenticated users: only use profile avatar_image if explicitly set
        // Don't fall back to localStorage game avatars - use profile picture or emoji/color fallback instead
        if (profile?.avatar_image) {
          setSelectedAvatarId(profile.avatar_image);
        } else {
          // Clear any guest avatar to prevent showing wrong avatar
          setSelectedAvatarId(undefined);
        }
      } else {
        // Guest users: load from localStorage
        const saved = getStoredAvatarId();
        if (saved) {
          setSelectedAvatarId(saved);
        }
      }
    }
  }, [isAuthenticated, profile?.avatar_image]);

  // Check if a name is one of the avatar default names
  const isAvatarDefaultName = (name: string): boolean => {
    return AVATARS.some(a => a.name === name);
  };

  // Handle avatar selection
  const handleAvatarSelect = async (avatar: AvatarConfig) => {
    setSelectedAvatarId(avatar.id);

    if (isAuthenticated && updateProfile) {
      // Authenticated users: save to profile
      await updateProfile({ avatar_image: avatar.id });
    } else {
      // Guest users: save to localStorage
      setStoredAvatarId(avatar.id);
      // Pre-fill host username with avatar name ONLY if username is empty
      // Don't override if user has already entered a name (even if it matches an avatar name)
      if (!hostUsername || hostUsername.trim() === '') {
        setHostUsername(avatar.name);
        // Save the avatar name to localStorage to persist across page reloads
        setStoredUsername(avatar.name);
      }
    }
  };

  // Handle avatar selection from picker for authenticated users
  const handleAuthAvatarSave = ({ avatarImage }: { avatarImage: string; emoji?: string; color?: string }) => {
    if (avatarImage === PROFILE_AVATAR_ID) {
      // User selected their profile avatar - clear the game avatar
      setSelectedAvatarId(PROFILE_AVATAR_ID);
      // No need to update profile - PROFILE_AVATAR_ID means use profile picture/emoji
    } else {
      const avatar = getAvatarById(avatarImage);
      if (avatar) {
        handleAvatarSelect(avatar);
      }
    }
    setIsAuthAvatarPickerOpen(false);
  };

  // Real-time validation with debounce
  const hostUsernameValidation = useDebouncedValidation(hostUsername, {
    validate: validateUsername,
    delay: 300,
    minLength: 2,
  });

  const gameCodeValidation = useDebouncedValidation(gameCode, {
    validate: validateGameCode,
    delay: 200,
    minLength: 1,
  });

  // Combine real-time and submit-time errors
  const showHostUsernameError = hostUsernameError || hostUsernameValidation.hasError;
  const showGameCodeError = gameCodeError || gameCodeValidation.hasError;
  const hostUsernameErrorMessage = hostUsernameErrorKey || hostUsernameValidation.errorKey;
  const gameCodeErrorMessage = gameCodeErrorKey || gameCodeValidation.errorKey;

  return (
    <div className="space-y-3">
      {/* Show loading indicator when profile is loading */}
      {isAuthenticated && !displayName && isProfileLoading && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t('joinView.loadingProfile') || 'Loading your profile...'}
          </p>
        </div>
      )}

      {/* Show "Hosting as" for authenticated users with their profile avatar */}
      {isAuthenticated && displayName && (
        <div className="p-3 rounded-neo bg-neo-purple border-2 border-neo-magenta/50 shadow-hard-sm">
          <div className="flex items-center gap-3">
            {/* Clickable avatar - allows authenticated users to change to a game avatar */}
            <button
              type="button"
              onClick={() => setIsAuthAvatarPickerOpen(true)}
              className="relative group flex-shrink-0"
              aria-label={t('joinView.changeAvatar') || 'Change avatar'}
            >
              {/* Show selected game avatar if set (not PROFILE_AVATAR_ID), otherwise profile picture or emoji fallback */}
              {selectedAvatarId && selectedAvatarId !== PROFILE_AVATAR_ID ? (
                <Avatar
                  avatarImage={selectedAvatarId}
                  size="lg"
                  className="border-3 border-neo-black shadow-hard-sm group-hover:border-neo-magenta transition-colors"
                />
              ) : profile?.profile_picture_url ? (
                <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-neo-black shadow-hard-sm group-hover:border-neo-magenta transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.profile_picture_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <Avatar
                  avatarImage={profile?.avatar_image}
                  size="lg"
                  className="border-3 border-neo-black shadow-hard-sm group-hover:border-neo-magenta transition-colors"
                />
              )}
              {/* Edit indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 rtl:-right-auto rtl:-left-0.5 w-5 h-5 bg-neo-lime text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm group-hover:scale-110 transition-transform">
                <Pencil className="w-2 h-2" />
              </div>
            </button>
            <div className="flex-1">
              <p className="text-xs text-neo-cream/70 font-bold uppercase tracking-wide">
                {t('joinView.hostingAs') || 'Hosting as'}
              </p>
              <p className="text-sm text-neo-magenta font-black">
                {displayName}
              </p>
              <p className="text-xs text-neo-cream/50 mt-0.5">
                {t('profile.connectedAccount') || 'Connected with your account'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Avatar picker for authenticated users */}
      <EmojiAvatarPicker
        isOpen={isAuthAvatarPickerOpen}
        onClose={() => setIsAuthAvatarPickerOpen(false)}
        onSave={handleAuthAvatarSave}
        currentAvatarImage={selectedAvatarId}
        profileAvatar={isAuthenticated ? {
          profilePictureUrl: profile?.profile_picture_url,
          avatarImage: profile?.avatar_image,
          displayName: displayName,
        } : undefined}
      />

      {/* Guest: Avatar + Name inline */}
      {!isAuthenticated && !isProfileLoading && (
        <div className="space-y-1.5">
          <Label htmlFor="hostUsername" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
            {t('joinView.hostPlayerName')}
          </Label>
          <div className="flex gap-2">
            <AvatarSelectorButton
              selectedAvatarId={selectedAvatarId}
              onAvatarSelect={handleAvatarSelect}
              t={t}
            />
            <Input
              id="hostUsername"
              value={hostUsername}
              onChange={(e) => {
                setHostUsername(sanitizeInput(e.target.value, 20));
                if (hostUsernameError) setHostUsernameError(false);
              }}
              required
              aria-invalid={showHostUsernameError ? 'true' : undefined}
              aria-describedby={showHostUsernameError ? 'hostUsername-error' : undefined}
              className={cn(
                "flex-1 h-10 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors",
                getValidationClasses(
                  hostUsernameError ? 'invalid' : hostUsernameValidation.state,
                  showHostUsernameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
                )
              )}
              placeholder={t('joinView.hostPlayerNamePlaceholder')}
              maxLength={20}
            />
          </div>
          {showHostUsernameError && (
            <p id="hostUsername-error" className="text-xs text-red-400" role="alert">
              {t(hostUsernameErrorMessage || 'validation.hostUsernameRequired')}
            </p>
          )}
        </div>
      )}

      {/* Room Code - inline with generate button */}
      <div className="space-y-1.5">
        <Label htmlFor="gameCode" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
          {t('hostView.roomCode')}
        </Label>
        <div className="relative">
          <Input
            id="gameCode"
            value={gameCode}
            onChange={(e) => {
              setGameCode(e.target.value);
              if (gameCodeError) setGameCodeError(false);
            }}
            required
            placeholder={t('validation.enterGameCode')}
            maxLength={10}
            pattern="[A-Za-z0-9]*"
            inputMode="text"
            aria-invalid={showGameCodeError ? 'true' : undefined}
            aria-describedby={showGameCodeError ? 'host-gameCode-error' : undefined}
            className={cn(
              "h-10 pr-12 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors",
              getValidationClasses(
                gameCodeError ? 'invalid' : gameCodeValidation.state,
                showGameCodeError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
              )
            )}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={generateRoomCode}
                  size="icon"
                  aria-label={t('joinView.generateNewCode') || 'Generate new room code'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
                >
                  <Dices className="text-sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('joinView.generateNewCode')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {showGameCodeError && (
          <p id="host-gameCode-error" className="text-xs text-red-400" role="alert">
            {t(gameCodeErrorMessage || 'validation.gameCodeInvalid')}
          </p>
        )}
      </div>
    </div>
  );
};

export default HostModeFields;
