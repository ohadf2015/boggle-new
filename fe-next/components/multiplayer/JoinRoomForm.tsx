'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogIn, ClipboardPaste, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateGameCode } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import Avatar from '@/components/Avatar';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import { cn } from '@/lib/utils';
import type { ActiveRoom, Language } from '@/shared/types/game';
import type { ProfileData } from './ProfileSetup';

const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
};

interface JoinRoomFormProps {
  profile: ProfileData;
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  isSubmitting: boolean;
  prefilledCode?: string;
  onSubmit: (config: {
    gameCode: string;
    username: string;
    avatarId: string;
  }) => void;
  onBack: () => void;
  onRefreshRooms: () => void;
}

/**
 * JoinRoomForm - Simplified join room form (step 2 of join flow)
 * Room code input + active rooms list for quick join
 */
const JoinRoomForm: React.FC<JoinRoomFormProps> = ({
  profile,
  activeRooms,
  roomsLoading,
  isSubmitting,
  prefilledCode = '',
  onSubmit,
  onBack,
  onRefreshRooms,
}) => {
  const { t, dir } = useLanguage();

  // Room code input
  const [gameCode, setGameCode] = useState(prefilledCode);
  const [gameCodeError, setGameCodeError] = useState(false);

  // Real-time validation
  const gameCodeValidation = useDebouncedValidation(gameCode, {
    validate: validateGameCode,
    delay: 200,
    minLength: 1,
  });

  const showGameCodeError = gameCodeError || gameCodeValidation.hasError;
  const gameCodeErrorMessage = gameCodeValidation.errorKey;

  // Handle paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
      if (cleaned) {
        setGameCode(cleaned);
        if (gameCodeError) setGameCodeError(false);
      }
    } catch {
      // Clipboard API not available
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameCode.trim()) {
      setGameCodeError(true);
      return;
    }

    onSubmit({
      gameCode: gameCode.toUpperCase(),
      username: profile.username,
      avatarId: profile.avatarId,
    });
  };

  // Handle quick join from room list
  const handleQuickJoin = (roomCode: string) => {
    onSubmit({
      gameCode: roomCode,
      username: profile.username,
      avatarId: profile.avatarId,
    });
  };

  return (
    <>
      <LandscapeIndicator />

      <div dir={dir} className="min-h-full bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy flex flex-col page-content-safe">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center py-4 sm:py-6 flex-shrink-0 px-4"
        >
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="absolute start-4 flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] min-w-[44px] rounded-neo border-3 border-neo-black dark:border-neo-black/50 bg-neo-cream dark:bg-neo-navy shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-neo-black dark:text-neo-white">
              {t('multiplayerFlow.joinForm.title') || 'Join Room'}
            </h1>
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-neo-cyan border-2 border-neo-black dark:border-neo-white/30" />
              <div className="w-3 h-3 rounded-full bg-neo-cyan border-2 border-neo-black dark:border-neo-white/30" />
              <span className="text-xs text-neo-black/60 dark:text-slate-400 ms-2">
                {t('multiplayerFlow.joinForm.progress') || 'Step 2 of 2'}
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
            <Card className="border-3 border-neo-black dark:border-neo-black/50 shadow-hard">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Profile Badge */}
                  <div className="space-y-2">
                    <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.joinForm.profileLabel') || 'Your Profile'}
                    </Label>
                    <div className="flex items-center gap-3 p-3 rounded-neo bg-neo-cyan/10 dark:bg-neo-cyan/5 text-neo-black dark:text-white border-2 border-neo-cyan/30">
                      <Avatar
                        avatarImage={profile.avatarId}
                        size="lg"
                        className="border-2 border-neo-black"
                      />
                      <span className="font-bold text-lg text-neo-black dark:text-neo-white">
                        {profile.username}
                      </span>
                    </div>
                  </div>

                  {/* Room Code Input */}
                  <div className="space-y-2">
                    <Label htmlFor="join-game-code" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.joinForm.codeLabel') || 'Enter Room Code'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="join-game-code"
                        value={gameCode}
                        onChange={(e) => {
                          setGameCode(e.target.value.toUpperCase());
                          if (gameCodeError) setGameCodeError(false);
                        }}
                        required
                        placeholder={t('multiplayerFlow.joinForm.codePlaceholder') || 'ABC123'}
                        maxLength={10}
                        pattern="[A-Za-z0-9]*"
                        inputMode="text"
                        autoComplete="off"
                        aria-invalid={showGameCodeError ? 'true' : undefined}
                        aria-describedby={showGameCodeError ? 'game-code-error' : 'game-code-hint'}
                        className={cn(
                          "h-14 text-xl text-center font-mono font-bold tracking-widest uppercase pr-14 bg-neo-navy/30 dark:bg-neo-navy/50 border-neo-white/20 dark:border-neo-black/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500",
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
                              onClick={handlePaste}
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-neo-cream text-neo-black hover:bg-neo-lime"
                              aria-label={t('joinView.pasteCode') || 'Paste room code'}
                            >
                              <ClipboardPaste className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('joinView.pasteCode') || 'Paste code'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p id="game-code-hint" className="text-xs text-neo-black/60 dark:text-slate-400">
                      {t('multiplayerFlow.joinForm.codeHint') || 'Ask your friend for their room code'}
                    </p>
                    {showGameCodeError && (
                      <p id="game-code-error" className="text-xs text-red-400" role="alert">
                        {t(gameCodeErrorMessage || 'validation.gameCodeInvalid')}
                      </p>
                    )}
                  </div>

                  {/* Active Rooms List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                        {t('multiplayerFlow.joinForm.roomsLabel') || 'Or pick an active room'}
                      </Label>
                      <button
                        type="button"
                        onClick={onRefreshRooms}
                        disabled={roomsLoading}
                        className="p-1.5 rounded-full hover:bg-neo-cyan/20 transition-colors"
                        aria-label={t('multiplayerFlow.joinForm.refreshButton') || 'Refresh'}
                      >
                        {roomsLoading ? <NeoLoader variant="dots" size="sm" /> : <RefreshCw className="w-3 h-3 text-neo-cyan" />}
                      </button>
                    </div>

                    <div className="max-h-[180px] overflow-y-auto rounded-neo border-2 border-neo-cream/30 dark:border-neo-black/50 bg-neo-navy/20 dark:bg-neo-navy/50">
                      {roomsLoading ? (
                        <div className="p-4 text-center">
                          <NeoLoader variant="dots" size="sm" className="mx-auto" />
                        </div>
                      ) : activeRooms.length > 0 ? (
                        <div className="divide-y divide-neo-cream/20 dark:divide-slate-600">
                          {activeRooms.map((room) => (
                            <button
                              key={room.gameCode}
                              type="button"
                              onClick={() => handleQuickJoin(room.gameCode)}
                              disabled={isSubmitting}
                              className="w-full flex items-center gap-3 p-3 hover:bg-neo-cyan/10 transition-colors text-left group"
                            >
                              <span className="text-lg">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-neo-black dark:text-neo-white truncate">
                                  {room.roomName || room.gameCode}
                                </p>
                                <p className="text-xs text-neo-black/70 dark:text-slate-300">
                                  {room.playerCount || 0} {t('joinView.players') || 'players'}
                                </p>
                              </div>
                              <span className="px-3 py-1.5 rounded-neo text-xs font-bold bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm group-hover:shadow-hard group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-all">
                                {t('common.join') || 'Join'}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-neo-black/60 dark:text-slate-400">
                          {t('multiplayerFlow.joinForm.noRooms') || 'No active rooms. Ask a friend for their room code!'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Join Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !gameCode.trim()}
                    size="lg"
                    className="w-full h-14 text-lg font-black uppercase bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black"
                  >
                    <LogIn className="mr-2 w-5 h-5" />
                    {isSubmitting
                      ? (t('multiplayerFlow.joinForm.joining') || 'Joining...')
                      : (t('multiplayerFlow.joinForm.joinButton') || 'Join Room')
                    }
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default JoinRoomForm;
