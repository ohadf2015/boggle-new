'use client';

import React, { useState, useEffect } from 'react';
import { FaPaste } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { validateUsername, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import AvatarSelectorButton from './AvatarSelectorButton';
import type { AvatarConfig } from '@/utils/avatarConfig';

export interface JoinModeFieldsProps {
  gameCode: string;
  setGameCode: (code: string) => void;
  gameCodeError: boolean;
  setGameCodeError: (error: boolean) => void;
  gameCodeErrorKey: string | undefined;
  username: string;
  setUsername: (name: string) => void;
  usernameError: boolean;
  setUsernameError: (error: boolean) => void;
  usernameErrorKey: string | undefined;
  isAuthenticated: boolean;
  displayName: string;
  t: (key: string) => string;
}

const JoinModeFields: React.FC<JoinModeFieldsProps> = ({
  gameCode,
  setGameCode,
  gameCodeError,
  setGameCodeError,
  gameCodeErrorKey,
  username,
  setUsername,
  usernameError,
  setUsernameError,
  usernameErrorKey,
  isAuthenticated,
  displayName,
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
    // Pre-fill username with avatar name if username is empty
    if (!username || username.trim() === '') {
      setUsername(avatar.name);
    }
  };

  // Real-time validation with debounce
  const gameCodeValidation = useDebouncedValidation(gameCode, {
    validate: validateGameCode,
    delay: 200,
    minLength: 1,
  });

  const usernameValidation = useDebouncedValidation(username, {
    validate: validateUsername,
    delay: 300,
    minLength: 2,
  });

  // Combine real-time and submit-time errors
  const showGameCodeError = gameCodeError || gameCodeValidation.hasError;
  const showUsernameError = usernameError || usernameValidation.hasError;
  const gameCodeErrorMessage = gameCodeErrorKey || gameCodeValidation.errorKey;
  const usernameErrorMessage = usernameErrorKey || usernameValidation.errorKey;

  return (
    <div className="space-y-3">
      {/* Room Code - inline with paste button */}
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
            aria-describedby={showGameCodeError ? 'gameCode-error' : undefined}
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
                  size="icon"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const cleaned = text.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
                      if (cleaned) {
                        setGameCode(cleaned);
                        if (gameCodeError) setGameCodeError(false);
                      }
                    } catch {
                      // Clipboard API not available or permission denied
                    }
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-neo-cream text-neo-black"
                  aria-label={t('joinView.pasteCode') || 'Paste room code'}
                >
                  <FaPaste className="text-sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('joinView.pasteCode') || 'Paste code'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {showGameCodeError && (
          <p id="gameCode-error" className="text-xs text-red-400" role="alert">
            {t(gameCodeErrorMessage || 'validation.gameCodeInvalid')}
          </p>
        )}
      </div>

      {/* Show "Joining as" for authenticated users */}
      {isAuthenticated && displayName && (
        <div className="p-2 rounded-neo bg-neo-navy border-2 border-neo-cyan/50 shadow-hard-sm">
          <div className="flex items-center gap-2">
            <AvatarSelectorButton
              selectedAvatarId={selectedAvatarId}
              onAvatarSelect={handleAvatarSelect}
              t={t}
            />
            <p className="text-xs text-neo-cream font-bold">
              {t('joinView.joiningAs') || 'Joining as'}{' '}
              <span className="text-neo-cyan">{displayName}</span>
            </p>
          </div>
        </div>
      )}

      {/* Guest: Avatar + Username inline */}
      {!isAuthenticated && (
        <div className="space-y-1.5">
          <Label htmlFor="username-main" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
            {t('joinView.playerNamePlaceholder')}
          </Label>
          <div className="flex gap-2">
            <AvatarSelectorButton
              selectedAvatarId={selectedAvatarId}
              onAvatarSelect={handleAvatarSelect}
              t={t}
            />
            <Input
              id="username-main"
              value={username}
              onChange={(e) => {
                setUsername(sanitizeInput(e.target.value, 20));
                if (usernameError) setUsernameError(false);
              }}
              required
              aria-invalid={showUsernameError ? 'true' : undefined}
              aria-describedby={showUsernameError ? 'username-error' : undefined}
              className={cn(
                "flex-1 h-10 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-600 transition-colors",
                getValidationClasses(
                  usernameError ? 'invalid' : usernameValidation.state,
                  showUsernameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
                )
              )}
              placeholder={t('joinView.playerNamePlaceholder')}
              maxLength={20}
            />
          </div>
          {showUsernameError && (
            <p id="username-error" className="text-xs text-red-400" role="alert">
              {t(usernameErrorMessage || 'validation.usernameRequired')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default JoinModeFields;
