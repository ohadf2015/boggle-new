'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Pencil, Check, X, Camera, Zap, Crosshair, Grid3X3, Lightbulb } from 'lucide-react';
import RoomChat from '../RoomChat';
import { SPRING_PRESETS } from '@/lib/animation/presets';

import Avatar from '../Avatar';
import AvatarBuilderModal from '../avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import RewardedAdGoldButton from '@/components/ads/RewardedAdGoldButton';
import { MobileShareSection } from '../../host/components/pre-game/MobileShareSection';
import { DesktopLobbyLayout, InviteCard } from '../../host/components/pre-game/desktop';
import { PlayerRoster } from '../../host/components/pre-game/PlayerRoster';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { DJMascotWithEntrance } from '@/components/ui/DJMascot';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

// ==================== Types ====================

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
}

// Host-specific controls slot
interface HostControls {
  /** Pre-game controls rendered in the left column (presets, start button, battle mode card) */
  controlsSlot: React.ReactNode;
  /** Bot countdown banner */
  botCountdownSlot?: React.ReactNode;
  /** Host label for roster */
  hostLabel?: string;
}

export interface MultiplayerLobbyViewProps {
  // Role
  isHost: boolean;

  // Core props
  gameCode: string;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;

  // Players
  playersReady: (string | PlayerData)[];
  /** Filtered players for display (host may exclude self in TV mode) */
  filteredPlayers?: (string | PlayerData)[];

  // Exit
  onExitRoom: () => void;
  showExitConfirm?: boolean;
  setShowExitConfirm?: (show: boolean) => void;
  onConfirmExit?: () => void;

  // Host-specific controls (rendered via slot pattern)
  hostControls?: HostControls;

  // Player-specific
  onNameChange?: (newName: string) => void;
  onAvatarChange?: (config: CustomAvatarConfig) => void;

  // Max players
  maxPlayers?: number;

  // Game mode for tips display
  gameMode?: 'classic' | 'blast' | 'word-hunt';
}

const MAX_PLAYERS_DEFAULT = 8;

// Staggered entrance animation
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  }),
};

// ==================== Component ====================

const MultiplayerLobbyView: React.FC<MultiplayerLobbyViewProps> = ({
  isHost,
  gameCode,
  username,
  t,
  playersReady,
  filteredPlayers,
  onExitRoom,
  showExitConfirm,
  setShowExitConfirm,
  onConfirmExit,
  hostControls,
  onNameChange,
  onAvatarChange,
  maxPlayers = MAX_PLAYERS_DEFAULT,
  gameMode,
}) => {
  const { isAuthenticated, updateProfile } = useAuth();
  const { isCrazyGames } = useCrazyGamesAuth();

  // Display all players (including host) to everyone
  const displayPlayers = filteredPlayers ?? playersReady;


  // Avatar builder (player-only)
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const currentAvatar = getOrCreateStoredCustomAvatar();

  const handleAvatarSave = useCallback(async (config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    onAvatarChange?.(config);
    setIsAvatarBuilderOpen(false);
    // Persist to DB for authenticated users so header/menu avatar updates
    await updateProfile({ avatar_config: config }).catch(() => {});
  }, [onAvatarChange, updateProfile]);

  // Guest name editing (player-only)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(username);

  const handleSaveName = useCallback(() => {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== username) {
      onNameChange?.(trimmed);
    }
    setIsEditingName(false);
  }, [editNameValue, username, onNameChange]);

  // ==================== Shared Header ====================
  const renderHeader = () => (
    <header className="flex-shrink-0 px-3 py-1.5 bg-neo-navy/95 border-b-2 border-neo-black sticky top-0 z-20" style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top, 0px))' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isHost && <DJMascotWithEntrance size="sm" delay={0.3} />}
          <span className="text-base font-neo-display font-bold text-neo-cream leading-none truncate"
            style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.15)' }}
          >
            {username}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <MobileShareSection gameCode={gameCode} t={t} compact />
          <button
            onClick={onExitRoom}
            className="w-8 h-8 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
            aria-label={t('common.exit')}
          >
            <LogOut className="w-3.5 h-3.5 text-neo-black rtl:scale-x-[-1]" />
          </button>
        </div>
      </div>
    </header>
  );

  // ==================== Player Hero Card ====================
  const renderPlayerHeroCard = () => (
    <motion.div
      data-testid="waiting-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_PRESETS.balanced}
      className="rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard-lg overflow-hidden"
    >
      {/* Accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-neo-cyan via-neo-pink to-neo-lime" />

      <div className="p-5 flex items-center gap-5">
        {/* Large clickable avatar */}
        <button
          data-testid="edit-avatar-button"
          onClick={() => setIsAvatarBuilderOpen(true)}
          className="relative flex-shrink-0 group"
        >
          <div className="w-20 h-20 rounded-full border-3 border-neo-black bg-neo-cyan/20 overflow-hidden shadow-hard ring-2 ring-neo-lime ring-offset-2 ring-offset-slate-800 transition-transform group-hover:scale-105 group-active:scale-95">
            <Avatar
              customAvatar={currentAvatar}
              size="xl"
              className="w-full h-full"
            />
          </div>
          {/* Camera overlay on hover */}
          <div className="absolute inset-0 rounded-full bg-neo-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-neo-cream" />
          </div>
          {/* Edit badge */}
          <div className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5 text-neo-black" />
          </div>
        </button>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          {/* Editable name */}
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                data-testid="name-edit-input"
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                maxLength={20}
                className="bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-3 py-1.5 text-lg font-black focus:outline-none focus:ring-2 focus:ring-neo-cyan w-full max-w-[200px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <button
                data-testid="name-save-button"
                onClick={handleSaveName}
                className="w-8 h-8 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm flex-shrink-0"
              >
                <Check className="w-4 h-4 text-neo-black" />
              </button>
              <button
                onClick={() => { setIsEditingName(false); setEditNameValue(username); }}
                className="w-8 h-8 flex items-center justify-center bg-white/10 border-2 border-neo-black rounded-neo flex-shrink-0"
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
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label={t('playerView.editName')}
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          )}

          {/* Waiting status */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-neo-lime animate-pulse" />
            <p className="text-sm text-slate-400">
              {t('playerView.hostWillStart')}
            </p>
          </div>

          {/* Bonus Gold Ad */}
          <div className="mt-3">
            <RewardedAdGoldButton goldAmount={20} />
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ==================== Game Mode Tips ====================
  const MODE_TIPS: Record<string, { icon: React.ReactNode; barClass: string; iconBgClass: string; dotClass: string; tips: string[] }> = {
    classic: {
      icon: <Grid3X3 className="w-5 h-5" />,
      barClass: 'bg-neo-cyan',
      iconBgClass: 'bg-neo-cyan',
      dotClass: 'bg-neo-cyan',
      tips: [
        t('game.swipeLetters'),
        t('game.diagonalWorks'),
        t('game.comboExplanation'),
      ],
    },
    blast: {
      icon: <Zap className="w-5 h-5" />,
      barClass: 'bg-neo-pink',
      iconBgClass: 'bg-neo-pink',
      dotClass: 'bg-neo-pink',
      tips: [
        t('blast.blastModeDesc'),
        t('game.swipeLetters'),
        t('game.comboExplanation'),
      ],
    },
    'word-hunt': {
      icon: <Crosshair className="w-5 h-5" />,
      barClass: 'bg-neo-lime',
      iconBgClass: 'bg-neo-lime',
      dotClass: 'bg-neo-lime',
      tips: [
        t('tutorial.wordHunt.welcome.description'),
        t('tutorial.wordHunt.lifeSystem.description'),
        t('game.swipeLetters'),
      ],
    },
  };

  const renderModeTips = () => {
    if (!gameMode || !MODE_TIPS[gameMode]) return null;
    const { icon, barClass, iconBgClass, dotClass, tips } = MODE_TIPS[gameMode];

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...SPRING_PRESETS.balanced }}
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
              {t('game.howToPlay')}
            </h3>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className={cn('mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0', dotClass)} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    );
  };

  // ==================== Left Column Content ====================
  const renderLeftContent = () => {
    if (isHost && hostControls) {
      return (
        <>
          <AnimatePresence>{hostControls.botCountdownSlot}</AnimatePresence>
          {hostControls.controlsSlot}
        </>
      );
    }
    // Player left content
    return (
      <>
        {renderPlayerHeroCard()}
        <PlayerRoster
          players={displayPlayers}
          username={username}
          gameCode={gameCode}
          maxPlayers={maxPlayers}
          t={t}
        />
        {renderModeTips()}
      </>
    );
  };

  // ==================== Right Column Content ====================
  const renderRightContent = () => (
    <>
      <InviteCard gameCode={gameCode} t={t} desktop />
      {!isCrazyGames && (
        <div
          data-testid="desktop-chat-area"
          className={cn(
            'flex-1 min-h-0 rounded-neo-lg overflow-hidden',
            isHost
              ? 'bg-neo-navy-light/50 border-3 border-neo-white/10'
              : 'bg-neo-navy/30 border-3 border-neo-cyan/20 shadow-hard',
          )}
        >
          <RoomChat
            username={isHost ? t('multiplayerFlow.host') : username}
            isHost={isHost}
            gameCode={gameCode}
            className="h-full"
            onNewMessage={() => {}}
            variant="embedded"
          />
        </div>
      )}
    </>
  );

  // ==================== Mobile Content ====================
  const renderMobileContent = () => {
    if (isHost && hostControls) {
      return (
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-3 min-h-0">
          <AnimatePresence>{hostControls.botCountdownSlot}</AnimatePresence>
          <motion.div variants={sectionVariants} initial="hidden" animate="visible" custom={0}>
            {hostControls.controlsSlot}
          </motion.div>
          {!isCrazyGames && (
            <motion.div className="pb-4" variants={sectionVariants} initial="hidden" animate="visible" custom={3}>
              <div className="bg-neo-navy-light/50 rounded-neo-lg border-2 border-neo-white/10 overflow-hidden h-64">
                <RoomChat username={t('multiplayerFlow.host')} isHost={true} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
              </div>
            </motion.div>
          )}
        </div>
      );
    }

    // Player mobile content
    return (
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-3 min-h-0">
        <section>{renderPlayerHeroCard()}</section>
        <PlayerRoster
          players={displayPlayers}
          username={username}
          gameCode={gameCode}
          maxPlayers={maxPlayers}
          t={t}
        />
        {renderModeTips()}
        {!isCrazyGames && (
          <section className="pb-4">
            <div className="bg-neo-navy/30 rounded-neo-lg border-3 border-neo-cyan/20 shadow-hard overflow-hidden h-64">
              <RoomChat
                username={username}
                isHost={false}
                gameCode={gameCode}
                className="h-full"
                onNewMessage={() => {}}
                variant="embedded"
              />
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto">
      {renderHeader()}

      <main className="flex-1 min-h-0 overflow-hidden bg-neo-navy/95 flex flex-col">
        {/* Desktop Layout */}
        <div className={cn('hidden lg:flex lg:flex-col flex-1 min-h-0', !isHost && 'lg:block h-full')}>
          <DesktopLobbyLayout
            leftContent={renderLeftContent()}
            rightContent={renderRightContent()}
          />
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          {renderMobileContent()}
        </div>
      </main>

      {/* Avatar Builder (player-only) */}
      {!isHost && (
        <AvatarBuilderModal
          isOpen={isAvatarBuilderOpen}
          onClose={() => setIsAvatarBuilderOpen(false)}
          onSave={handleAvatarSave}
          initialConfig={currentAvatar}
          premium={avatarPremium}
        />
      )}

      {/* Exit Confirmation Dialog */}
      {setShowExitConfirm && onConfirmExit && (
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent className="bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black">
                {t('playerView.exitConfirmation')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-neo-black/70 font-bold">
                {t('playerView.exitWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirmExit}
                className="bg-neo-red text-neo-white border-3 border-neo-black shadow-hard-sm font-bold"
              >
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default MultiplayerLobbyView;
