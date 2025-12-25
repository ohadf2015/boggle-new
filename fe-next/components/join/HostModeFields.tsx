'use client';

import React, { useState, useEffect } from 'react';
import { FaDice } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { validateUsername, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import AvatarSelectorButton from './AvatarSelectorButton';
import type { AvatarConfig } from '@/utils/avatarConfig';

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
  // Avatar selection state
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(undefined);

  // Load avatar from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('boggle_avatar_id');
      if (saved) {
        setSelectedAvatarId(saved);
      }
    }
  }, []);

  // Handle avatar selection
  const handleAvatarSelect = (avatar: AvatarConfig) => {
    setSelectedAvatarId(avatar.id);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('boggle_avatar_id', avatar.id);
    }
    // Pre-fill host username with avatar name if username is empty
    if ((!hostUsername || hostUsername.trim() === '') && !isAuthenticated) {
      setHostUsername(avatar.name);
    }
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
      {/* Show "Hosting as" for authenticated users */}
      {isAuthenticated && displayName && (
        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-slate-600 dark:text-gray-300">
            {t('joinView.hostingAs') || 'Hosting as'}{' '}
            <span className="font-semibold text-purple-600 dark:text-purple-400">{displayName}</span>
          </p>
        </div>
      )}

      {/* Show loading indicator when profile is loading */}
      {isAuthenticated && !displayName && isProfileLoading && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t('joinView.loadingProfile') || 'Loading your profile...'}
          </p>
        </div>
      )}

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
                "flex-1 h-10 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-600 transition-colors",
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

      {/* Authenticated: Avatar selector only */}
      {isAuthenticated && displayName && (
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
            {t('joinView.chooseAvatar') || 'Avatar'}
          </Label>
          <AvatarSelectorButton
            selectedAvatarId={selectedAvatarId}
            onAvatarSelect={handleAvatarSelect}
            t={t}
          />
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
              "h-10 pr-12 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-600 transition-colors",
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
                  <FaDice className="text-sm" />
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
