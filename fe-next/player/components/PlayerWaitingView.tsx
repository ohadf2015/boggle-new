'use client';

import React, { memo, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { m, AnimatePresence } from 'framer-motion';
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import { Users, Crown, Bot, LogOut, Plus, Check, Pencil, X, Camera, Zap, Crosshair, Grid3X3, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import Avatar from '../../components/Avatar';
import AvatarBuilderModal from '../../components/avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import RewardedAdGoldButton from '@/components/ads/RewardedAdGoldButton';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';
import RoomChat from '../../components/RoomChat';
import { LobbyTutorialPanel } from '../../components/lobby/LobbyTutorialPanel';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { MobileShareSection } from '../../host/components/pre-game/MobileShareSection';
import { DesktopLobbyLayout, InviteCard } from '../../host/components/pre-game/desktop';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useGameMode } from '@/hooks/gameState';
import { LANGUAGE_FLAGS, getLanguageName } from '@/lib/languageConfig';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import type { Language, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

// ==================== Types ====================

interface PlayerReadyInfo {
  username: string;
  avatar?: AvatarType;
  isHost?: boolean;
  isBot?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
}

interface PlayerWaitingViewProps {
  gameCode: string;
  gameLanguage: Language | null;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  playersReady: (string | PlayerReadyInfo)[];
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  onExitRoom: () => void;
  onConfirmExit: () => void;
  onNameChange?: (newName: string) => void;
  onAvatarChange?: (config: CustomAvatarConfig) => void;
}

const MAX_PLAYERS = 8;

// ==================== Component ====================

const PlayerWaitingView: React.FC<PlayerWaitingViewProps> = ({
  gameCode,
  gameLanguage,
  username,
  t,
  playersReady,
  showExitConfirm,
  setShowExitConfirm,
  onExitRoom,
  onConfirmExit,
  onNameChange,
  onAvatarChange,
}): React.ReactElement => {
  const { isAuthenticated, updateProfile } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const gameMode = useGameMode();

  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const [currentAvatar, setCurrentAvatar] = useState<CustomAvatarConfig>(() => getOrCreateStoredCustomAvatar());

  const handleAvatarSave = useCallback(async (config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    setCurrentAvatar(config);
    onAvatarChange?.(config);
    setIsAvatarBuilderOpen(false);
    await updateProfile({ avatar_config: config }).catch(() => {});
  }, [onAvatarChange, updateProfile]);

  const nonHostPlayers = playersReady;
  const emptySlots = Math.max(0, Math.min(5, MAX_PLAYERS) - nonHostPlayers.length);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(username);

  const handleSaveName = useCallback(() => {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== username) {
      onNameChange?.(trimmed);
    }
    setIsEditingName(false);
  }, [editNameValue, username, onNameChange]);

  // ==================== Hero Card ====================
  const renderHeroCard = (): React.ReactElement => (
    <m.div
      data-testid="waiting-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_PRESETS.balanced}
      className="rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard-lg overflow-hidden"
    >
      <div className="h-1.5 bg-linear-to-r from-neo-cyan via-neo-pink to-neo-lime" />

      <div className="p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
        {/* Large clickable avatar */}
        <button
          data-testid="edit-avatar-button"
          onClick={() => setIsAvatarBuilderOpen(true)}
          className="relative shrink-0 group"
        >
          <div className="w-20 h-20 rounded-full border-3 border-neo-black overflow-hidden shadow-hard ring-2 ring-neo-lime ring-offset-2 ring-offset-slate-800 transition-transform group-hover:scale-105 group-active:scale-95">
            <Avatar
              customAvatar={currentAvatar}
              size="2xl"
              className="w-full h-full"
            />
          </div>
          <div className="absolute inset-0 rounded-full bg-neo-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-neo-cream" />
          </div>
          <div className="absolute -bottom-1 -inset-e-1 w-7 h-7 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5 text-neo-black" />
          </div>
        </button>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                data-testid="name-edit-input"
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                maxLength={20}
                className="bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-3 py-1.5 text-lg font-black focus:outline-hidden focus:ring-2 focus:ring-neo-cyan w-full max-w-[200px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <button
                data-testid="name-save-button"
                onClick={handleSaveName}
                className="w-8 h-8 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm shrink-0"
              >
                <Check className="w-4 h-4 text-neo-black" />
              </button>
              <button
                onClick={() => { setIsEditingName(false); setEditNameValue(username); }}
                className="w-8 h-8 flex items-center justify-center bg-white/10 border-2 border-neo-black rounded-neo shrink-0"
              >
                <X className="w-4 h-4 text-neo-cream" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-neo-cream truncate">
                {username}
              </h2>
              {!isAuthenticated && (
                <button
                  data-testid="edit-name-button"
                  onClick={() => { setEditNameValue(username); setIsEditingName(true); }}
                  className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label={t('playerView.editName')}
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-neo-lime animate-pulse" />
            <p className="text-sm text-slate-400">
              {t('playerView.hostWillStart')}
            </p>
          </div>

          <div className="mt-3">
            <RewardedAdGoldButton goldAmount={20} surface="player_waiting" />
          </div>
        </div>
      </div>
    </m.div>
  );

  // ==================== Player Roster ====================
  const renderPlayerRoster = (): React.ReactElement => (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t('hostView.playersInRoom')}
        </h3>
        <span className="text-xs font-bold text-slate-500">
          {nonHostPlayers.length}/{MAX_PLAYERS}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <AnimatePresence>
          {nonHostPlayers.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = name === username;

            return (
              <m.div
                key={name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  type: 'spring', stiffness: 400, damping: 22, delay: index * 0.06,
                }}
                className="shrink-0 flex flex-col items-center gap-1.5"
              >
                <div
                  className="relative animate-avatar-float"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {isHostPlayer && (
                    <m.div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                    >
                      <Crown className="w-4 h-4 text-neo-yellow" />
                    </m.div>
                  )}
                  <div className={cn(
                    'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden shadow-hard aspect-square',
                    isMe ? 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy' : '',
                  )}>
                    {/* Avatar handles full fallback chain (customAvatar → seeded face from userId).
                        Don't gate on hasAvatar: backend may emit legacy `{emoji,color}` shape
                        (userManager.ts) which has no customAvatar — Avatar still renders a
                        deterministic seeded face from userId={name}. Stacking a colored bg
                        disc + initial-letter span behind it caused a visible "two avatars" bug. */}
                    <Avatar
                      customAvatar={avatar?.customAvatar ?? undefined}
                      userId={name}
                      pixelSize={64}
                      mode="multiplayer"
                      className="w-full h-full"
                    />
                  </div>
                  {isBot && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neo-cyan border-2 border-neo-black rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-neo-black" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold truncate w-16 text-center text-neo-cream">
                  {name}
                </span>
              </m.div>
            );
          })}
        </AnimatePresence>

        {/* Empty Slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neo-cyan/30 bg-white/5 flex items-center justify-center">
              <Plus className="w-5 h-5 text-neo-cyan/50" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase">
              {t('common.join')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  // ==================== Interactive Game Instructions ====================
  const [instructionStep, setInstructionStep] = useState(0);

  const GAME_INSTRUCTIONS: Record<string, { icon: React.ReactNode; barClass: string; iconBgClass: string; dotClass: string; steps: { titleKey: string; descKey: string }[] }> = {
    classic: {
      icon: <Grid3X3 className="w-5 h-5" />,
      barClass: 'bg-neo-cyan',
      iconBgClass: 'bg-neo-cyan',
      dotClass: 'bg-neo-cyan',
      steps: [
        { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
        { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
        { titleKey: 'howToPlay.comboBonus', descKey: 'help.comboExplanation' },
      ],
    },
    blast: {
      icon: <Zap className="w-5 h-5" />,
      barClass: 'bg-neo-pink',
      iconBgClass: 'bg-neo-pink',
      dotClass: 'bg-neo-pink',
      steps: [
        { titleKey: 'gameModes.blast.name', descKey: 'gameModes.blast.description' },
        { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
        { titleKey: 'howToPlay.comboBonus', descKey: 'help.comboExplanation' },
      ],
    },
    'word-hunt': {
      icon: <Crosshair className="w-5 h-5" />,
      barClass: 'bg-neo-lime',
      iconBgClass: 'bg-neo-lime',
      dotClass: 'bg-neo-lime',
      steps: [
        { titleKey: 'gameModes.wordHunt.name', descKey: 'gameModes.wordHunt.description' },
        { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
        { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
      ],
    },
  };

  // Reset step when mode changes
  useEffect(() => {
    setInstructionStep(0);
  }, [gameMode]);

  const renderModeTips = (): React.ReactElement | null => {
    // Always show How-to-Play tips to non-host players in the lobby. The host
    // may not have locked in a mode yet (gameMode null/'random'), so fall back
    // to the classic instructions rather than hiding the panel entirely.
    const tips = (gameMode && GAME_INSTRUCTIONS[gameMode]) || GAME_INSTRUCTIONS.classic;
    const { icon, barClass, iconBgClass, dotClass, steps } = tips;
    const step = steps[instructionStep] ?? steps[0];

    return (
      <m.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ...SPRING_PRESETS.balanced }}
        className="rounded-neo-lg border-3 border-neo-black bg-slate-800/60 shadow-hard overflow-hidden"
      >
        <div className={cn('h-1', barClass)} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('w-8 h-8 rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm text-neo-black', iconBgClass)}>
              {icon}
            </div>
            <h3 className="text-sm font-black uppercase text-neo-cream flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-neo-yellow" />
              {t('help.howToPlay')}
            </h3>
          </div>

          {/* Interactive step content */}
          <AnimatePresence mode="wait">
            <m.div
              key={instructionStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="min-h-[48px] flex items-start gap-2 text-sm text-slate-300"
            >
              <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
              <div>
                <p className="font-bold text-neo-cream text-xs uppercase mb-0.5">{t(step.titleKey)}</p>
                <p>{t(step.descKey)}</p>
              </div>
            </m.div>
          </AnimatePresence>

          {/* Step navigation */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              onClick={() => setInstructionStep(s => Math.max(0, s - 1))}
              disabled={instructionStep === 0}
              className="w-7 h-7 flex items-center justify-center rounded bg-neo-white/10 disabled:opacity-30 transition-opacity"
              aria-label={t('common.previous')}
            >
              <ChevronLeft className="w-4 h-4 text-neo-cream" />
            </button>
            <div className="flex gap-1.5">
              {steps.map((step, i) => (
                <button
                  key={step.titleKey}
                  onClick={() => setInstructionStep(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === instructionStep ? dotClass : 'bg-neo-white/20'
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => setInstructionStep(s => Math.min(steps.length - 1, s + 1))}
              disabled={instructionStep === steps.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded bg-neo-white/10 disabled:opacity-30 transition-opacity"
              aria-label={t('common.next')}
            >
              <ChevronRight className="w-4 h-4 text-neo-cream" />
            </button>
          </div>
        </div>
      </m.div>
    );
  };

  // ==================== Mobile Content ====================
  const renderMobileContent = (): React.ReactElement => (
    <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-4 min-h-0">
      <section>{renderHeroCard()}</section>
      {renderPlayerRoster()}
      {renderModeTips()}
      <MobileShareSection gameCode={gameCode} t={t} />
      <section className="pb-4">
        <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-64 sm:h-80">
          {isOnCrazyGamesPlatform ? (
            <LobbyTutorialPanel t={t} />
          ) : (
            <RoomChat
              username={username}
              isHost={false}
              gameCode={gameCode}
              className="h-full"
              onNewMessage={() => {}}
              variant="embedded"
            />
          )}
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto">
      {/* Header */}
      <header className="shrink-0 px-3 py-2 bg-neo-navy/95 border-b-3 border-neo-black sticky z-20" style={{ top: 'var(--combined-safe-area-top, env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MobileShareSection gameCode={gameCode} t={t} compact />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {gameLanguage && (
              <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
                <span className="text-sm">{LANGUAGE_FLAGS[gameLanguage] || '🌐'}</span>
                <span className="text-xs font-black text-neo-cream uppercase">
                  {getLanguageName(gameLanguage, true)}
                </span>
              </div>
            )}
            {/* UI-language pill — distinct from the board-language chip above; one tap. */}
            <QuickLanguageSwitcher compact />
            <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
              <Users className="w-4 h-4 text-neo-cyan" />
              <span className="text-xs font-black text-neo-cream">
                {nonHostPlayers.length}/{MAX_PLAYERS}
              </span>
            </div>
            <button
              onClick={onExitRoom}
              className="w-9 h-9 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
              aria-label={t('common.exit')}
            >
              <LogOut className="w-4 h-4 text-neo-black rtl:scale-x-[-1]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neo-navy/95">
        {/* Desktop Layout — triggers at 720px (tablet portrait+) for parity with HostPreGameView */}
        <div className="hidden min-[720px]:block h-full">
          <DesktopLobbyLayout
            leftContent={
              <>
                {renderHeroCard()}
                {renderPlayerRoster()}
                {renderModeTips()}
              </>
            }
            rightContent={
              <>
                <InviteCard gameCode={gameCode} t={t} desktop />
                <div
                  data-testid="desktop-chat-area"
                  className="flex-1 min-h-0 bg-neo-navy/30 rounded-neo-lg border-3 border-neo-cyan/20 shadow-hard overflow-hidden"
                >
                  {isOnCrazyGamesPlatform ? (
                    <LobbyTutorialPanel t={t} />
                  ) : (
                    <RoomChat
                      username={username}
                      isHost={false}
                      gameCode={gameCode}
                      className="h-full"
                      onNewMessage={() => {}}
                      variant="embedded"
                    />
                  )}
                </div>
              </>
            }
          />
        </div>

        {/* Mobile Layout — below 720px (phones) */}
        <div className="min-[720px]:hidden flex flex-col flex-1 min-h-0">
          {renderMobileContent()}
        </div>
      </main>

      {/* B4 — CrazyGames waiting-room banner */}
      <div className="w-full flex justify-center py-2">
        <CrazyGamesBanner size="320x50" />
      </div>

      {/* Avatar Builder Modal */}
      <AvatarBuilderModal
        isOpen={isAvatarBuilderOpen}
        onClose={() => setIsAvatarBuilderOpen(false)}
        onSave={handleAvatarSave}
        initialConfig={currentAvatar}
        premium={avatarPremium}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">{t('playerView.exitConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neo-black/70 font-bold">
              {t('playerView.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmExit} className="bg-neo-red text-neo-white border-3 border-neo-black shadow-hard-sm font-bold">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default memo(PlayerWaitingView);
