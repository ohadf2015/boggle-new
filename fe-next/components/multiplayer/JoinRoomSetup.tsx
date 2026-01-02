'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogIn, ClipboardPaste, RefreshCw, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername, validateGameCode } from '@/utils/validation';
import { sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import EmojiAvatarPicker, { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { AVATARS, getAvatarById, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import { cn } from '@/lib/utils';
import type { ActiveRoom, Language } from '@/shared/types/game';

const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
};

interface JoinRoomSetupProps {
  // Auth state
  isAuthenticated: boolean;
  displayName: string | null;
  profilePictureUrl?: string | null;
  initialAvatarId?: string;

  // Room data
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  isSubmitting: boolean;
  prefilledCode?: string;

  // Callbacks
  onSubmit: (config: {
    gameCode: string;
    username: string;
    avatarId: string;
  }) => void;
  onBack: () => void;
  onRefreshRooms: () => void;
}

/**
 * JoinRoomSetup - Single-step room joining with profile setup
 * Combines avatar/name selection with room code input
 */
const JoinRoomSetup: React.FC<JoinRoomSetupProps> = ({
  isAuthenticated,
  displayName,
  profilePictureUrl,
  initialAvatarId,
  activeRooms,
  roomsLoading,
  isSubmitting,
  prefilledCode = '',
  onSubmit,
  onBack,
  onRefreshRooms,
}) => {
  const { t, dir } = useLanguage();

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

  // Room code input
  const [gameCode, setGameCode] = useState(prefilledCode);
  const [gameCodeError, setGameCodeError] = useState(false);

  // Load from localStorage on mount (only for guests)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated) {
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

  const gameCodeValidation = useDebouncedValidation(gameCode, {
    validate: validateGameCode,
    delay: 200,
    minLength: 1,
  });

  const showUsernameError = usernameError || usernameValidation.hasError;
  const usernameErrorMessage = usernameValidation.errorKey;
  const showGameCodeError = gameCodeError || gameCodeValidation.hasError;
  const gameCodeErrorMessage = gameCodeValidation.errorKey;

  // Authenticated users with a profile picture or avatar don't need to select one
  const hasAuthenticatedAvatar = isAuthenticated && (profilePictureUrl || initialAvatarId);

  // Check if form is valid
  const isProfileValid = username.trim().length >= 2 && (selectedAvatarId || hasAuthenticatedAvatar);

  // Handle avatar selection
  const handleAvatarSelect = (avatar: AvatarConfig) => {
    setSelectedAvatarId(avatar.id);
    setAvatarError(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('boggle_avatar_id', avatar.id);
    }
    // Pre-fill username with avatar name if empty
    if (!username.trim()) {
      setUsername(avatar.name);
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

    if (!isProfileValid) {
      if (username.trim().length < 2) {
        setUsernameError(true);
      }
      if (!selectedAvatarId && !hasAuthenticatedAvatar) {
        setAvatarError(true);
      }
      return;
    }

    if (!gameCode.trim()) {
      setGameCodeError(true);
      return;
    }

    const effectiveAvatarId = selectedAvatarId || initialAvatarId || PROFILE_AVATAR_ID;

    // Save to localStorage (only for guests)
    if (typeof window !== 'undefined' && !isAuthenticated) {
      localStorage.setItem('boggle_username', username);
      if (selectedAvatarId) {
        localStorage.setItem('boggle_avatar_id', selectedAvatarId);
      }
    }

    onSubmit({
      gameCode: gameCode.toUpperCase(),
      username: isAuthenticated && displayName ? displayName : username,
      avatarId: effectiveAvatarId,
    });
  };

  // Handle quick join from room list
  const handleQuickJoin = (roomCode: string) => {
    if (!isProfileValid) {
      if (username.trim().length < 2) {
        setUsernameError(true);
      }
      if (!selectedAvatarId && !hasAuthenticatedAvatar) {
        setAvatarError(true);
      }
      return;
    }

    const effectiveAvatarId = selectedAvatarId || initialAvatarId || PROFILE_AVATAR_ID;

    // Save to localStorage (only for guests)
    if (typeof window !== 'undefined' && !isAuthenticated) {
      localStorage.setItem('boggle_username', username);
      if (selectedAvatarId) {
        localStorage.setItem('boggle_avatar_id', selectedAvatarId);
      }
    }

    onSubmit({
      gameCode: roomCode,
      username: isAuthenticated && displayName ? displayName : username,
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
              {t('multiplayerFlow.joinSetup.title') || 'Join Room'}
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
                            <img
                              src={getAvatarPath(getAvatarById(selectedAvatarId) || AVATARS[0])}
                              alt={displayName || 'Avatar'}
                              className="w-full h-full object-cover"
                            />
                          ) : profilePictureUrl ? (
                            <img
                              src={profilePictureUrl}
                              alt={displayName || 'Profile'}
                              className="w-full h-full object-cover"
                            />
                          ) : initialAvatarId ? (
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
                      <Label htmlFor="join-username" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                        {t('multiplayerFlow.joinSetup.nameLabel') || 'Your name'}
                      </Label>

                      {isAuthenticated && displayName ? (
                        <div className="p-2.5 rounded-neo bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700">
                          <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{displayName}</p>
                        </div>
                      ) : (
                        <>
                          <Input
                            id="join-username"
                            value={username}
                            onChange={(e) => {
                              setUsername(sanitizeInput(e.target.value, 20));
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
                            placeholder={t('multiplayerFlow.joinSetup.namePlaceholder') || 'Enter your name'}
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
                        {t('multiplayerFlow.joinSetup.avatarLabel') || 'Pick an avatar'}
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
                          {t('multiplayerFlow.joinSetup.avatarRequired') || 'Please select an avatar'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Room Code Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="join-game-code" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.joinSetup.codeLabel') || 'Room code'}
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
                        placeholder={t('multiplayerFlow.joinSetup.codePlaceholder') || 'ABC123'}
                        maxLength={10}
                        pattern="[A-Za-z0-9]*"
                        inputMode="text"
                        autoComplete="off"
                        aria-invalid={showGameCodeError ? 'true' : undefined}
                        className={cn(
                          "h-12 text-lg text-center font-mono font-bold tracking-widest uppercase pr-14 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400",
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
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 bg-neo-cream text-neo-black hover:bg-neo-yellow"
                              aria-label={t('joinView.pasteCode') || 'Paste room code'}
                            >
                              <ClipboardPaste className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('joinView.pasteCode') || 'Paste code'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-neo-black/60 dark:text-slate-400">
                      {t('multiplayerFlow.joinSetup.codeHint') || 'Ask your friend for their room code'}
                    </p>
                    {showGameCodeError && (
                      <p className="text-xs text-red-400" role="alert">
                        {t(gameCodeErrorMessage || 'validation.gameCodeInvalid')}
                      </p>
                    )}
                  </div>

                  {/* Active Rooms List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                        {t('multiplayerFlow.joinSetup.roomsLabel') || 'Or pick a room'}
                      </Label>
                      <button
                        type="button"
                        onClick={onRefreshRooms}
                        disabled={roomsLoading}
                        className="p-1.5 rounded-full hover:bg-neo-cyan/20 transition-colors"
                        aria-label={t('multiplayerFlow.joinSetup.refreshButton') || 'Refresh'}
                      >
                        <RefreshCw className={cn("w-3 h-3 text-neo-cyan", roomsLoading && "animate-spin")} />
                      </button>
                    </div>

                    <div className="max-h-[140px] overflow-y-auto rounded-neo border-2 border-neo-cream/30 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                      {roomsLoading ? (
                        <div className="p-3 text-center">
                          <div className="animate-spin w-4 h-4 border-2 border-neo-cyan border-t-transparent rounded-full mx-auto" />
                        </div>
                      ) : activeRooms.length > 0 ? (
                        <div className="divide-y divide-neo-cream/20 dark:divide-slate-600">
                          {activeRooms.map((room) => (
                            <button
                              key={room.gameCode}
                              type="button"
                              onClick={() => handleQuickJoin(room.gameCode)}
                              disabled={isSubmitting}
                              className="w-full flex items-center gap-3 p-2.5 hover:bg-neo-cyan/10 transition-colors text-left group"
                            >
                              <span className="text-base">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-neo-black dark:text-neo-white truncate">
                                  {room.roomName || room.gameCode}
                                </p>
                                <p className="text-xs text-neo-black/70 dark:text-slate-300">
                                  {room.playerCount || 0} {t('joinView.players') || 'players'}
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-neo text-xs font-bold bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm group-hover:shadow-hard group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-all">
                                {t('common.join') || 'Join'}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-sm text-neo-black/60 dark:text-slate-400">
                          {t('multiplayerFlow.joinSetup.noRooms') || 'No active rooms'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Join Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isProfileValid || !gameCode.trim()}
                    size="lg"
                    className="w-full h-14 text-lg font-black uppercase bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black mt-2"
                  >
                    <LogIn className="mr-2 w-5 h-5" />
                    {isSubmitting
                      ? (t('multiplayerFlow.joinSetup.joining') || 'Joining...')
                      : (t('multiplayerFlow.joinSetup.joinButton') || 'Join Room')
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

export default JoinRoomSetup;
