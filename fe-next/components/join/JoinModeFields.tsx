'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaPaste } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { validateUsername, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';

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
  // Real-time validation with debounce
  const gameCodeValidation = useDebouncedValidation(gameCode, {
    validate: validateGameCode,
    delay: 200,
    minLength: 1,
  });

  const usernameValidation = useDebouncedValidation(username, {
    validate: validateUsername,
    delay: 300,
    minLength: 1,
  });

  // Combine real-time and submit-time errors
  const showGameCodeError = gameCodeError || gameCodeValidation.hasError;
  const showUsernameError = usernameError || usernameValidation.hasError;
  const gameCodeErrorMessage = gameCodeErrorKey || gameCodeValidation.errorKey;
  const usernameErrorMessage = usernameErrorKey || usernameValidation.errorKey;

  return (
    <>
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <Label htmlFor="gameCode" className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
          {t('hostView.roomCode')}
          {gameCodeValidation.state === 'valid' && (
            <span className="text-neo-lime text-xs">&#10003;</span>
          )}
        </Label>
        <div className="flex gap-2">
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
            aria-describedby={showGameCodeError ? 'gameCode-error' : 'gameCode-hint'}
            className={cn(
              "flex-1 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400 transition-colors",
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
                  className="bg-neo-cream text-neo-black shrink-0"
                  aria-label={t('joinView.pasteCode') || 'Paste room code'}
                >
                  <FaPaste />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('joinView.pasteCode') || 'Paste code'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {showGameCodeError && (
          <p id="gameCode-error" className="text-sm text-red-400" role="alert">
            {t(gameCodeErrorMessage || 'validation.gameCodeInvalid')}
          </p>
        )}
        {!showGameCodeError && (
          <p id="gameCode-hint" className="text-xs text-slate-500 dark:text-gray-400">
            {t('validation.gameCodeHint') || '6-10 alphanumeric characters'}
          </p>
        )}
      </motion.div>

      {/* Username field for guest users */}
      {!isAuthenticated && (
        <motion.div
          animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="space-y-2"
        >
          <Label htmlFor="username-main" className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
            {t('joinView.playerNamePlaceholder')}
            {usernameValidation.state === 'valid' && (
              <span className="text-neo-lime text-xs">&#10003;</span>
            )}
          </Label>
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
              "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400 transition-colors",
              getValidationClasses(
                usernameError ? 'invalid' : usernameValidation.state,
                showUsernameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
              )
            )}
            placeholder={t('joinView.playerNamePlaceholder')}
            maxLength={20}
          />
          {showUsernameError && (
            <p id="username-error" className="text-sm text-red-400" role="alert">
              {t(usernameErrorMessage || 'validation.usernameRequired')}
            </p>
          )}
        </motion.div>
      )}

      {/* Show "Joining as" for authenticated users */}
      {isAuthenticated && displayName && (
        <div className="p-3 rounded-neo bg-neo-navy border-3 border-neo-cyan/50 shadow-hard-sm">
          <p className="text-sm text-neo-cream font-bold">
            {t('joinView.joiningAs') || 'Joining as'}{' '}
            <span className="text-neo-cyan">{displayName}</span>
          </p>
        </div>
      )}
    </>
  );
};

export default JoinModeFields;
