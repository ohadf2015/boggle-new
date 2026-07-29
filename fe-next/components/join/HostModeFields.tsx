'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dices, Pencil, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { validateUsername, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import AvatarSelectorButton from './AvatarSelectorButton';
import dynamic from 'next/dynamic';
const AvatarBuilderModal = dynamic(() => import('@/components/avatar/AvatarBuilderModal'), { ssr: false });
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar, setStoredUsername } from '@/utils/profileStorage';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';

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
  const avatarPremium = useAvatarPremium();

  const [selectedAvatar, setSelectedAvatar] = useState<CustomAvatarConfig | null>(null);
  const [isAuthAvatarPickerOpen, setIsAuthAvatarPickerOpen] = useState(false);

  const hostUsernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isAuthenticated) {
        setSelectedAvatar((profile?.avatar_config as CustomAvatarConfig) ?? getRandomAvatarConfig());
      } else {
        setSelectedAvatar(getOrCreateStoredCustomAvatar());
      }
    }
  }, [isAuthenticated, profile?.avatar_config]);

  useEffect(() => {
    if (!isAuthenticated && !isProfileLoading && hostUsernameInputRef.current) {
      const timer = setTimeout(() => {
        hostUsernameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAuthenticated, isProfileLoading]);

  const handleAvatarSelect = async (config: CustomAvatarConfig) => {
    setSelectedAvatar(config);

    if (isAuthenticated && updateProfile) {
      await updateProfile({ avatar_config: config });
    } else {
      setStoredCustomAvatar(config);
    }
  };

  const handleAuthAvatarSave = (config: CustomAvatarConfig) => {
    handleAvatarSelect(config);
    setIsAuthAvatarPickerOpen(false);
  };

  const handleGuestAvatarSelect = (config: CustomAvatarConfig) => {
    setSelectedAvatar(config);
    setStoredCustomAvatar(config);
  };

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

  const showHostUsernameError = hostUsernameError || hostUsernameValidation.hasError;
  const showGameCodeError = gameCodeError || gameCodeValidation.hasError;
  const hostUsernameErrorMessage = hostUsernameErrorKey || hostUsernameValidation.errorKey;
  const gameCodeErrorMessage = gameCodeErrorKey || gameCodeValidation.errorKey;

  const currentConfig = selectedAvatar ?? getRandomAvatarConfig();

  return (
    <div className="space-y-3">
      {isAuthenticated && !displayName && isProfileLoading && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t('joinView.loadingProfile')}
          </p>
        </div>
      )}

      {isAuthenticated && displayName && (
        <div className="p-3 rounded-neo bg-neo-purple border-2 border-neo-magenta/50 shadow-hard-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAuthAvatarPickerOpen(true)}
              className="relative group shrink-0"
              aria-label={t('joinView.changeAvatar')}
            >
              {selectedAvatar ? (
                <Avatar
                  customAvatar={selectedAvatar}
                  size="lg"
                  className="border-3 border-neo-black shadow-hard-sm group-hover:border-neo-magenta transition-colors"
                />
              ) : (
                <Avatar
                  customAvatar={getRandomAvatarConfig()}
                  size="lg"
                  className="border-3 border-neo-black shadow-hard-sm group-hover:border-neo-magenta transition-colors"
                />
              )}
              <div className="absolute -bottom-0.5 -right-0.5 rtl:-right-auto rtl:-left-0.5 w-5 h-5 bg-neo-lime text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm group-hover:scale-110 transition-transform">
                <Pencil className="w-2 h-2" />
              </div>
            </button>
            <div className="flex-1">
              <p className="text-xs text-neo-white font-bold uppercase tracking-wide">
                {t('joinView.hostingAs')}
              </p>
              <p className="text-sm text-neo-magenta font-black">
                {displayName}
              </p>
              <p className="text-xs text-neo-white mt-0.5">
                {t('profile.connectedAccount')}
              </p>
            </div>
          </div>
        </div>
      )}

      <AvatarBuilderModal
        isOpen={isAuthAvatarPickerOpen}
        onClose={() => setIsAuthAvatarPickerOpen(false)}
        onSave={handleAuthAvatarSave}
        initialConfig={currentConfig}
        premium={avatarPremium}
      />

      {!isAuthenticated && !isProfileLoading && (
        <div className="space-y-1.5">
          <Label htmlFor="hostUsername" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
            {t('joinView.hostPlayerName')}
          </Label>
          <div className="flex gap-2">
            <AvatarSelectorButton
              selectedAvatar={selectedAvatar}
              onAvatarSelect={handleGuestAvatarSelect}
              t={t}
            />
            <div className="relative flex-1">
              <Input
                ref={hostUsernameInputRef}
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
                  "h-10 pe-10 bg-slate-100 dark:bg-neo-navy-elevated/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors",
                  getValidationClasses(
                    hostUsernameError ? 'invalid' : hostUsernameValidation.state,
                    showHostUsernameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
                  )
                )}
                placeholder={t('joinView.hostPlayerNamePlaceholder')}
                maxLength={20}
              />
              {hostUsername && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setHostUsername('');
                    if (hostUsernameError) setHostUsernameError(false);
                    hostUsernameInputRef.current?.focus();
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 min-w-[40px] min-h-[40px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={t('common.clear')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {showHostUsernameError && (
            <p id="hostUsername-error" className="text-xs text-red-400" role="alert">
              {t(hostUsernameErrorMessage || 'validation.hostUsernameRequired')}
            </p>
          )}
        </div>
      )}

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
              "h-10 pe-12 bg-slate-100 dark:bg-neo-navy-elevated/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors",
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
                  aria-label={t('joinView.generateNewCode')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 min-w-[40px] min-h-[40px] bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
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
