'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, LogOut, Pencil, Check, X } from 'lucide-react';
import RoomChat from '../RoomChat';
import { SPRING_PRESETS } from '@/lib/animation/presets';

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
import { IdleMascot } from '@/components/ui/IdleMascot';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';
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
}) => {
  const { isAuthenticated, updateProfile } = useAuth();

  // Display all players (including host) to everyone
  const displayPlayers = filteredPlayers ?? playersReady;

  // Copy feedback
  const [codeCopied, setCodeCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(gameCode);
    setCodeCopied(true);
    clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCodeCopied(false), 2000);
  }, [gameCode]);

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
    <header className="flex-shrink-0 px-4 py-3 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isHost && <DJMascotWithEntrance size="sm" delay={0.3} />}
          <div className="flex flex-col">
            {isHost && (
              <span className="text-xs uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">
                {t('roomCode.label')}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'font-neo-display font-bold text-neo-cyan uppercase leading-none',
                  isHost ? 'text-2xl' : 'text-lg tracking-wider',
                )}
                style={{ textShadow: `0 0 ${isHost ? 12 : 10}px rgba(0, 255, 255, ${isHost ? 0.6 : 0.5})` }}
              >
                {gameCode}
              </span>
              {isHost && (
                <button
                  onClick={handleCopyCode}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    codeCopied
                      ? 'text-neo-lime'
                      : 'text-slate-400 hover:text-neo-white',
                  )}
                  aria-label={codeCopied ? t('roomCode.copied') : t('roomCode.copy')}
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
            <Users className="w-4 h-4 text-neo-cyan" />
            <span className="text-xs font-black text-neo-cream">
              {displayPlayers.length}/{maxPlayers}
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
  );

  // ==================== Player Waiting Section ====================
  const renderPlayerWaitingSection = () => (
    <motion.div
      data-testid="waiting-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_PRESETS.balanced}
      className="space-y-3"
    >
      <div className="flex justify-center">
        <IdleMascot baseVariant="waving" size="md" />
      </div>
      <p className="text-sm text-center text-slate-400">
        {t('playerView.hostWillStart')}
      </p>

      {/* Bonus Gold Ad while waiting */}
      <div className="flex justify-center">
        <RewardedAdGoldButton goldAmount={20} />
      </div>

      {/* Edit avatar + name */}
      <div className="flex items-center justify-center gap-3">
        <button
          data-testid="edit-avatar-button"
          onClick={() => setIsAvatarBuilderOpen(true)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-neo-cyan transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>{t('playerView.editAvatar')}</span>
        </button>
        {!isAuthenticated && (
          <>
            <span className="text-slate-600">|</span>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  data-testid="name-edit-input"
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  maxLength={20}
                  className="bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-neo-cyan"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <button
                  data-testid="name-save-button"
                  onClick={handleSaveName}
                  className="w-8 h-8 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm"
                >
                  <Check className="w-4 h-4 text-neo-black" />
                </button>
                <button
                  onClick={() => { setIsEditingName(false); setEditNameValue(username); }}
                  className="w-8 h-8 flex items-center justify-center bg-white/10 border-2 border-neo-black rounded-neo"
                >
                  <X className="w-4 h-4 text-neo-cream" />
                </button>
              </div>
            ) : (
              <button
                data-testid="edit-name-button"
                onClick={() => { setEditNameValue(username); setIsEditingName(true); }}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-neo-cyan transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{t('playerView.editName')}</span>
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );

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
        {renderPlayerWaitingSection()}
        <PlayerRoster
          players={displayPlayers}
          username={username}
          gameCode={gameCode}
          maxPlayers={maxPlayers}
          t={t}
        />
      </>
    );
  };

  // ==================== Right Column Content ====================
  const renderRightContent = () => (
    <>
      <InviteCard gameCode={gameCode} t={t} desktop />
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
    </>
  );

  // ==================== Mobile Content ====================
  const renderMobileContent = () => {
    if (isHost && hostControls) {
      return (
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 min-h-0">
          <AnimatePresence>{hostControls.botCountdownSlot}</AnimatePresence>
          <motion.div variants={sectionVariants} initial="hidden" animate="visible" custom={0}>
            {/* Host controls rendered via slot — includes StartButton, PlayerRoster, BattleModeCard */}
            {hostControls.controlsSlot}
          </motion.div>
          <motion.div variants={sectionVariants} initial="hidden" animate="visible" custom={3}>
            <MobileShareSection gameCode={gameCode} t={t} />
          </motion.div>
          <motion.div className="pb-4" variants={sectionVariants} initial="hidden" animate="visible" custom={4}>
            <div className="bg-neo-navy-light/50 rounded-neo-lg border-2 border-neo-white/10 overflow-hidden h-48 sm:h-64 lg:h-80">
              <RoomChat username={t('multiplayerFlow.host')} isHost={true} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
            </div>
          </motion.div>
        </div>
      );
    }

    // Player mobile content
    return (
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 min-h-0">
        <section>{renderPlayerWaitingSection()}</section>
        <PlayerRoster
          players={displayPlayers}
          username={username}
          gameCode={gameCode}
          maxPlayers={maxPlayers}
          t={t}
        />
        <MobileShareSection gameCode={gameCode} t={t} />
        <section className="pb-4 flex-1 flex flex-col min-h-0">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
            {t('hostView.roomChat')}
          </h3>
          <div className="bg-neo-navy/30 rounded-neo-lg border-3 border-neo-cyan/20 shadow-hard overflow-hidden flex-1 min-h-[20rem] sm:min-h-[24rem]">
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
