'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot, Copy, LogOut, Plus } from 'lucide-react';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import { MobileShareSection } from '../../host/components/pre-game/MobileShareSection';
import { DesktopLobbyLayout, InviteCard } from '../../host/components/pre-game/desktop';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { cn } from '../../lib/utils';
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
}

// Avatar color palette (matches host view)
const AVATAR_COLORS = ['bg-neo-cyan', 'bg-neo-pink', 'bg-purple-400', 'bg-neo-lime', 'bg-neo-yellow', 'bg-orange-400', 'bg-teal-400', 'bg-rose-400'];
const MAX_PLAYERS = 8;

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
}): React.ReactElement => {
  const emptySlots = Math.max(0, Math.min(5, MAX_PLAYERS) - playersReady.length);

  // Player roster - horizontal scroll with circular avatars (matches host style)
  const renderPlayerRoster = (): React.ReactElement => (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {t('hostView.commandersJoined') || 'Commanders Joined'}
        </h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <AnimatePresence>
          {playersReady.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = name === username;

            return (
              <m.div
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
              </m.div>
            );
          })}
        </AnimatePresence>

        {/* Empty Slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="flex-shrink-0 flex flex-col items-center gap-2 pt-2">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neo-cyan/30 bg-white/5 flex items-center justify-center">
              <Plus className="w-5 h-5 text-neo-cyan/50" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase">
              {t('common.join') || 'Join'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  // Waiting status banner (player-specific, replaces StartButton)
  const renderWaitingStatus = (): React.ReactElement => (
    <m.div
      data-testid="waiting-status"
      className="bg-neo-cream text-neo-black p-6 rounded-xl border-3 border-neo-black shadow-hard text-center"
    >
      <m.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-4xl mb-3"
      >
        ⏳
      </m.div>
      <h2 className="font-neo-display font-bold text-xl uppercase leading-none mb-2">
        {t('playerView.waitingForHostToStart') || 'Waiting for host to start...'}
      </h2>
      <p className="text-sm text-gray-600">
        {t('playerView.hostWillStart') || 'The host will start the game when everyone is ready'}
      </p>
    </m.div>
  );

  // Mobile scrollable content (mirrors host's renderLobbyContent)
  const renderMobileContent = (): React.ReactElement => (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 min-h-0">
      {/* 1. Waiting Status - replaces StartButton */}
      <section>{renderWaitingStatus()}</section>

      {/* 2. Player Roster */}
      {renderPlayerRoster()}

      {/* 3. Share/Invite Strip */}
      <MobileShareSection gameCode={gameCode} t={t} />

      {/* 4. Chat */}
      <section className="pb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
          {t('hostView.roomChat') || 'Room Chat'}
        </h3>
        <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-48 sm:h-64">
          <RoomChat
            username={username}
            isHost={false}
            gameCode={gameCode}
            className="h-full"
            onNewMessage={() => {}}
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
          {/* Room Code Display */}
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">
              {t('roomCode.label') || 'Room Code'}
            </span>
            <div className="flex items-center gap-2">
              <span
                data-testid="room-code"
                className="text-2xl font-neo-display font-bold text-neo-cyan uppercase leading-none"
                style={{ textShadow: '0 0 12px rgba(0, 255, 255, 0.6)' }}
              >
                {gameCode}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(gameCode)}
                className="text-slate-400 hover:text-neo-white transition-colors p-1"
                aria-label={t('roomCode.copy') || 'Copy code'}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right side: Player count + Exit */}
          <div className="flex items-center gap-2">
            <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
              <Users className="w-4 h-4 text-neo-cyan" />
              <span className="text-xs font-black text-neo-cream">
                {playersReady.length}/{MAX_PLAYERS}
              </span>
            </div>
            <button
              onClick={onExitRoom}
              className="w-9 h-9 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
              aria-label={t('common.exit') || 'Exit'}
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
                {renderWaitingStatus()}
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
