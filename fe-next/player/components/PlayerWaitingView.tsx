'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot, LogOut, Plus, Check, Pencil, X } from 'lucide-react';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import { MobileShareSection } from '../../host/components/pre-game/MobileShareSection';
import { DesktopLobbyLayout, InviteCard } from '../../host/components/pre-game/desktop';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { IdleMascot } from '@/components/ui/IdleMascot';
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
  /** Called when guest changes their display name */
  onNameChange?: (newName: string) => void;
}

// Avatar color palette (matches host view)
const AVATAR_COLORS = ['bg-neo-cyan', 'bg-neo-pink', 'bg-purple-400', 'bg-neo-lime', 'bg-neo-yellow', 'bg-orange-400', 'bg-teal-400', 'bg-rose-400'];
const MAX_PLAYERS = 8;

// Rotating word facts shown while waiting
const WORD_FACTS = [
  { key: 'qi', fact: '"QI" is a valid 2-letter word worth 11 points in Scrabble' },
  { key: 'oxyphenbutazone', fact: '"OXYPHENBUTAZONE" is the highest-scoring word in Scrabble history' },
  { key: 'set', fact: '"SET" has the most definitions of any English word — over 430' },
  { key: 'rhythm', fact: '"RHYTHM" is the longest common English word without a vowel' },
  { key: 'dreamt', fact: '"DREAMT" is the only English word ending in "MT"' },
  { key: 'strengths', fact: '"STRENGTHS" has only one vowel in 9 letters' },
  { key: 'typewriter', fact: '"TYPEWRITER" can be typed using only the top row of a keyboard' },
  { key: 'uncopyrightable', fact: '"UNCOPYRIGHTABLE" is the longest word with no repeating letters' },
  { key: 'aa', fact: '"AA" is a valid word — it\'s a type of volcanic lava' },
  { key: 'za', fact: '"ZA" is slang for pizza and a valid Scrabble word' },
];

// ==================== Component ====================

const PlayerWaitingView: React.FC<PlayerWaitingViewProps> = ({
  gameCode,
  username,
  t,
  playersReady,
  showExitConfirm,
  setShowExitConfirm,
  onExitRoom,
  onConfirmExit,
  onNameChange,
}): React.ReactElement => {
  const { isAuthenticated } = useAuth();

  // Rotating word facts
  const [factIndex, setFactIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex(i => (i + 1) % WORD_FACTS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Filter out host from player roster - players shouldn't see the host as a fellow player
  const nonHostPlayers = playersReady.filter(player => {
    const isHostPlayer = typeof player === 'object' ? player.isHost : false;
    return !isHostPlayer;
  });
  const emptySlots = Math.max(0, Math.min(5, MAX_PLAYERS) - nonHostPlayers.length);

  // Guest name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(username);

  const handleSaveName = () => {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== username) {
      onNameChange?.(trimmed);
    }
    setIsEditingName(false);
  };

  // Player roster - horizontal scroll with circular avatars (matches host style)
  const renderPlayerRoster = (): React.ReactElement => (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t('hostView.playersInRoom')}
        </h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <AnimatePresence>
          {nonHostPlayers.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = name === username;

            return (
              <motion.div
                key={name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  scale: { type: 'spring', stiffness: 400, damping: 22, delay: index * 0.06 },
                  opacity: { type: 'spring', stiffness: 400, damping: 22, delay: index * 0.06 },
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 },
                }}
                className="flex-shrink-0 flex flex-col items-center gap-2"
              >
                <div className="relative">
                  {isHostPlayer && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Crown className="w-4 h-4 text-neo-yellow" />
                    </div>
                  )}
                  <div className={cn(
                    'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden',
                    isMe ? 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy' : '',
                    AVATAR_COLORS[index % AVATAR_COLORS.length]
                  )}>
                    {avatar?.profilePictureUrl || avatar?.avatarImage ? (
                      <Avatar
                        profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                        avatarImage={avatar?.avatarImage}
                        size="md"
                      />
                    ) : (
                      <span className="text-2xl font-black text-neo-black">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
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
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty Slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="flex-shrink-0 flex flex-col items-center gap-2 pt-2">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neo-cyan/30 bg-white/5 flex items-center justify-center">
              <Plus className="w-5 h-5 text-neo-cyan/50" />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase">
              {t('common.join')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  // Ready button + waiting status
  const renderReadySection = (): React.ReactElement => (
    <motion.div
      data-testid="waiting-status"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="space-y-3"
    >
      {/* Welcoming mascot */}
      <div className="flex justify-center">
        <IdleMascot baseVariant="waving" size="sm" />
      </div>

      {/* Ready button removed from lobby - players only mark ready on the results page */}

      {/* Waiting hint */}
      <p className="text-sm text-center text-slate-400">
        {t('playerView.hostWillStart')}
      </p>

      {/* Word fact rotation - fills dead time */}
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

      {/* Guest name editing */}
      {!isAuthenticated && (
        <div className="flex items-center justify-center gap-2">
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
        </div>
      )}
    </motion.div>
  );

  // Mobile scrollable content (mirrors host's renderLobbyContent)
  const renderMobileContent = (): React.ReactElement => (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 min-h-0">
      {/* 1. Ready Section - replaces old waiting status */}
      <section>{renderReadySection()}</section>

      {/* 2. Player Roster */}
      {renderPlayerRoster()}

      {/* 3. Share/Invite Strip */}
      <MobileShareSection gameCode={gameCode} t={t} />

      {/* 4. Chat */}
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto">
      {/* Header - Command Center style (matches host) */}
      <header className="flex-shrink-0 px-4 py-3 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          {/* Left side: Room code display */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-neo-display font-bold text-neo-cyan uppercase leading-none tracking-wider"
              style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}
            >
              {gameCode}
            </span>
          </div>

          {/* Right side: Player count + Exit */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
              <LogOut className="w-4 h-4 text-neo-black" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neo-navy/95">
        {/* Desktop Layout: Two-column via DesktopLobbyLayout */}
        <div className="hidden lg:block h-full">
          <DesktopLobbyLayout
            leftContent={
              <>
                {renderReadySection()}
                {renderPlayerRoster()}
              </>
            }
            rightContent={
              <>
                <InviteCard gameCode={gameCode} t={t} desktop />
                <div
                  data-testid="desktop-chat-area"
                  className="flex-1 min-h-0 bg-neo-navy/30 rounded-neo-lg border-4 border-neo-black shadow-hard overflow-hidden"
                >
                  <RoomChat
                    username={username}
                    isHost={false}
                    gameCode={gameCode}
                    className="h-full"
                    onNewMessage={() => {}}
                    variant="embedded"
                  />
                </div>
              </>
            }
          />
        </div>

        {/* Mobile Layout: Single-scroll Command Center */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          {renderMobileContent()}
        </div>
      </main>

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

export default PlayerWaitingView;
