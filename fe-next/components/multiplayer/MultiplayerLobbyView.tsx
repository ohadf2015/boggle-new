'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, LogOut, Pencil, Check, X } from 'lucide-react';
import RoomChat from '../RoomChat';

import AvatarBuilderModal from '../avatar/AvatarBuilderModal';
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
import { getStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
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

// Rotating word facts shown while waiting
const WORD_FACTS = [
  { key: 'qi', fact: '"QI" is a valid 2-letter word worth 11 points in Scrabble' },
  { key: 'oxyphenbutazone', fact: '"OXYPHENBUTAZONE" is the highest-scoring word in Scrabble history' },
  { key: 'set', fact: '"SET" has the most definitions of any English word \u2014 over 430' },
  { key: 'rhythm', fact: '"RHYTHM" is the longest common English word without a vowel' },
  { key: 'dreamt', fact: '"DREAMT" is the only English word ending in "MT"' },
  { key: 'strengths', fact: '"STRENGTHS" has only one vowel in 9 letters' },
  { key: 'typewriter', fact: '"TYPEWRITER" can be typed using only the top row of a keyboard' },
  { key: 'uncopyrightable', fact: '"UNCOPYRIGHTABLE" is the longest word with no repeating letters' },
  { key: 'aa', fact: '"AA" is a valid word \u2014 it\'s a type of volcanic lava' },
  { key: 'za', fact: '"ZA" is slang for pizza and a valid Scrabble word' },
];

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
  const { isAuthenticated } = useAuth();

  // Display players: use filteredPlayers if provided, otherwise filter out host for players
  const displayPlayers = filteredPlayers ?? (
    isHost
      ? playersReady
      : playersReady.filter(p => {
          const isHostPlayer = typeof p === 'object' ? p.isHost : false;
          return !isHostPlayer;
        })
  );

  // Avatar builder (player-only)
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const currentAvatar = getStoredCustomAvatar() ?? getRandomAvatarConfig();

  const handleAvatarSave = useCallback((config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    onAvatarChange?.(config);
    setIsAvatarBuilderOpen(false);
  }, [onAvatarChange]);

  // Word fact rotation (player-only)
  const [factIndex, setFactIndex] = useState(0);
  useEffect(() => {
    if (isHost) return;
    const interval = setInterval(() => {
      setFactIndex(i => (i + 1) % WORD_FACTS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHost]);

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
    <header className="flex-shrink-0 px-4 py-3 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20">
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
                  onClick={() => navigator.clipboard.writeText(gameCode)}
                  className="text-slate-400 hover:text-neo-white transition-colors p-1"
                  aria-label={t('roomCode.copy')}
                >
                  <Copy className="w-4 h-4" />
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
            <LogOut className="w-4 h-4 text-neo-black" />
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
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="space-y-3"
    >
      <div className="flex justify-center">
        <IdleMascot baseVariant="waving" size="sm" />
      </div>
      <p className="text-sm text-center text-slate-400">
        {t('playerView.hostWillStart')}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={factIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-xs text-center text-neo-cyan/70 bg-neo-cyan/5 rounded-xl px-4 py-3 border border-neo-cyan/20"
        >
          {WORD_FACTS[factIndex].fact}
        </motion.div>
      </AnimatePresence>

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
            : 'bg-neo-navy/30 border-4 border-neo-black shadow-hard',
        )}
      >
        <RoomChat
          username={isHost ? 'Host' : username}
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
            <div className="bg-neo-navy-light/50 rounded-neo-lg border-2 border-neo-white/10 overflow-hidden h-64 sm:h-80">
              <RoomChat username="Host" isHost={true} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
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
        <section className="pb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
            {t('hostView.roomChat')}
          </h3>
          <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-64 sm:h-80">
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
