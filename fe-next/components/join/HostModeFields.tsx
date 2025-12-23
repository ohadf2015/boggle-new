'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaDice } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { validateRoomName, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';

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
  roomName,
  setRoomName,
  roomNameError,
  setRoomNameError,
  roomNameErrorKey,
  generateRoomCode,
  isAuthenticated,
  displayName,
  isProfileLoading,
  t,
}) => {
  // Real-time validation with debounce
  const roomNameValidation = useDebouncedValidation(roomName, {
    validate: validateRoomName,
    delay: 300,
    minLength: 1,
  });

  const gameCodeValidation = useDebouncedValidation(gameCode, {
    validate: validateGameCode,
    delay: 200,
    minLength: 1,
  });

  // Combine real-time and submit-time errors
  const showRoomNameError = roomNameError || roomNameValidation.hasError;
  const showGameCodeError = gameCodeError || gameCodeValidation.hasError;
  const roomNameErrorMessage = roomNameErrorKey || roomNameValidation.errorKey;
  const gameCodeErrorMessage = gameCodeErrorKey || gameCodeValidation.errorKey;

  return (
    <>
      {/* Host Player Name - show for guests OR authenticated users without displayName */}
      {(!isAuthenticated || !displayName) && !isProfileLoading && (
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <Label htmlFor="roomName" className="text-slate-700 dark:text-gray-300 flex items-center gap-2">
            {t('joinView.yourName')}
            {roomNameValidation.state === 'valid' && (
              <span className="text-neo-lime text-xs">&#10003;</span>
            )}
          </Label>
          <Input
            id="roomName"
            value={roomName}
            onChange={(e) => {
              setRoomName(sanitizeInput(e.target.value, 30));
              if (roomNameError) setRoomNameError(false);
            }}
            required
            aria-invalid={showRoomNameError ? 'true' : undefined}
            aria-describedby={showRoomNameError ? 'roomName-error' : 'roomName-hint'}
            className={cn(
              "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-600 transition-colors",
              getValidationClasses(
                roomNameError ? 'invalid' : roomNameValidation.state,
                showRoomNameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
              )
            )}
            placeholder={t('joinView.enterYourName')}
            maxLength={30}
          />
          {showRoomNameError && (
            <p id="roomName-error" className="text-sm text-red-400" role="alert">
              {t(roomNameErrorMessage || 'joinView.pleaseEnterYourName')}
            </p>
          )}
          {!showRoomNameError && (
            <p id="roomName-hint" className="text-sm text-slate-500 dark:text-gray-300">
              {t('joinView.playerAndRoomName')}
            </p>
          )}
        </motion.div>
      )}

      {/* Show loading indicator when profile is loading */}
      {isAuthenticated && !displayName && isProfileLoading && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('joinView.loadingProfile') || 'Loading your profile...'}
          </p>
        </div>
      )}

      {/* Show "Hosting as" for authenticated users in host mode */}
      {isAuthenticated && displayName && (
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-slate-600 dark:text-gray-300">
            {t('joinView.hostingAs') || 'Hosting as'}{' '}
            <span className="font-semibold text-purple-600 dark:text-purple-400">{displayName}</span>
          </p>
        </div>
      )}

      {/* Room Code */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
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
            aria-describedby={showGameCodeError ? 'host-gameCode-error' : 'host-gameCode-hint'}
            className={cn(
              "flex-1 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-600 transition-colors",
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
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                >
                  <FaDice />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('joinView.generateNewCode')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {showGameCodeError && (
          <p id="host-gameCode-error" className="text-sm text-red-400" role="alert">
            {t(gameCodeErrorMessage || 'validation.gameCodeInvalid')}
          </p>
        )}
        {!showGameCodeError && (
          <p id="host-gameCode-hint" className="text-sm text-slate-500 dark:text-gray-300">
            {t('validation.codeHelper')}
          </p>
        )}
      </motion.div>
    </>
  );
};

export default HostModeFields;
