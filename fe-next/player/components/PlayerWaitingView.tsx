'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot, MessageCircle, Copy, Check, Zap, Star, Target, LogOut } from 'lucide-react';
import { NewPlayerBadge } from '@/components/game/NewPlayerBadge';
import { isNewPlayer } from '@/utils/multiplayerProgressStorage';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import SlotMachineText from '../../components/SlotMachineText';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import { getJoinUrl } from '../../utils/share';
import { cn } from '../../lib/utils';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus, GridPosition } from '@/shared/types/game';

// ==================== Type Definitions ====================

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
  shufflingGrid?: LetterGrid | null;
  highlightedCells?: GridPosition[];
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  onExitRoom: () => void;
  onConfirmExit: () => void;
}

// Simple tips - shown inline
const QUICK_TIPS = [
  { icon: Zap, text: 'Build combos for bonus points!' },
  { icon: Star, text: 'Longer words = more points' },
  { icon: Target, text: 'Unique words score best!' },
];

// ==================== Component ====================

const PlayerWaitingView: React.FC<PlayerWaitingViewProps> = ({
  gameCode,
  username,
  t,
  playersReady,
  showQR,
  setShowQR,
  showExitConfirm,
  setShowExitConfirm,
  onExitRoom,
  onConfirmExit,
}): React.ReactElement => {
  // Mobile tab state - simplified to just players and chat
  const [mobileTab, setMobileTab] = useState<'players' | 'chat'>('players');
  const [codeCopied, setCodeCopied] = useState(false);
  const [isCurrentUserNew, setIsCurrentUserNew] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  // Check if current user is a new player (client-side only)
  useEffect(() => {
    setIsCurrentUserNew(isNewPlayer());
  }, []);

  // Memoized handlers
  const handleCloseQR = useCallback(() => {
    setShowQR(false);
  }, [setShowQR]);

  // Copy room code handler
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCodeCopied(true);
      toast.success(t('roomCode.copied') || 'Code copied!', {
        duration: 1500,
        icon: '📋',
      });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error(t('common.error') || 'Failed to copy');
    }
  }, [gameCode, t]);

  // Handle chat tab with unread reset
  const handleChatTab = useCallback(() => {
    setMobileTab('chat');
    setUnreadChat(0);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-neo-navy overflow-hidden">
      {/* Header - Room Code + Exit */}
      <header className="flex-shrink-0 px-3 py-2 bg-slate-800/95 border-b-4 border-neo-black">
        <div className="flex items-center justify-between gap-2">
          {/* Room Code - Clickable to copy */}
          <motion.button
            onClick={handleCopyCode}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              "bg-neo-navy/60 hover:bg-neo-navy/80",
              "rounded-neo border-2 border-neo-black shadow-hard-sm",
              "transition-all cursor-pointer"
            )}
            title={t('roomCode.tapToCopy') || 'Tap to copy'}
          >
            <span className="text-xl font-black tracking-[0.15em] text-neo-lime">
              {gameCode}
            </span>
            <motion.span
              initial={false}
              animate={codeCopied ? { scale: [1, 1.3, 1] } : {}}
              className="inline-flex"
            >
              {codeCopied ? (
                <Check className="w-4 h-4 text-neo-lime" />
              ) : (
                <Copy className="w-4 h-4 text-neo-cream/50" />
              )}
            </motion.span>
          </motion.button>

          {/* Exit Button */}
          <Button
            onClick={onExitRoom}
            variant="ghost"
            size="sm"
            className="text-neo-red hover:bg-neo-red/20 border-2 border-neo-red/30 hover:border-neo-red"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">{t('common.exit') || 'Exit'}</span>
          </Button>
        </div>

        {/* Waiting Status */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center mt-2"
        >
          <span className="text-neo-cream/80 text-sm font-bold uppercase tracking-wide">
            ⏳ {t('playerView.waitingForHostToStart') || 'Waiting for host to start...'}
          </span>
        </motion.div>
      </header>

      {/* Main Content - Players List or Chat */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {mobileTab === 'players' ? (
            <motion.div
              key="players"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col p-3 gap-3"
            >
              {/* Players List */}
              <div className="flex-1 min-h-0 bg-slate-800/95 rounded-neo border-3 border-neo-black shadow-hard overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-neo-black/30 flex-shrink-0">
                  <Users className="w-5 h-5 text-neo-pink" />
                  <span className="font-bold uppercase text-neo-cream text-sm">
                    {t('hostView.playersJoined') || 'Players'} ({playersReady.length})
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-2">
                  <AnimatePresence>
                    {playersReady.map((player, index) => {
                      const playerUsername = typeof player === 'string' ? player : player.username;
                      const avatar = typeof player === 'object' ? player.avatar : null;
                      const isHostPlayer = typeof player === 'object' ? player.isHost : false;
                      const presenceStatus = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
                      const isWindowFocused = typeof player === 'object' ? player.isWindowFocused : true;
                      const isBot = typeof player === 'object' ? player.isBot : false;
                      const isMe = playerUsername === username;

                      return (
                        <motion.div
                          key={playerUsername}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 10, opacity: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.2 }}
                          className={cn(
                            "flex items-center justify-between px-2 py-1.5 rounded-lg mb-1",
                            "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar
                              profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                              avatarImage={avatar?.avatarImage}
                              size="md"
                            />
                            <span className="font-medium text-neo-cream/90 text-sm">
                              <SlotMachineText text={playerUsername} />
                            </span>
                            {isHostPlayer && <Crown className="w-4 h-4 text-neo-yellow" />}
                            {isBot && <Bot className="w-4 h-4 text-neo-cyan" />}
                            {isMe && isCurrentUserNew && <NewPlayerBadge t={t} size="xs" />}
                            {isMe && (
                              <span className="text-[10px] text-neo-cream/60 font-medium">
                                ({t('playerView.me')})
                              </span>
                            )}
                          </div>
                          {!isMe && !isBot && (
                            <PresenceIndicator
                              status={presenceStatus}
                              isWindowFocused={isWindowFocused}
                              size="md"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {playersReady.length === 0 && (
                    <p className="text-sm text-center text-neo-cream/60 font-medium py-4">
                      {t('hostView.waitingForPlayers') || 'Waiting for players...'}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Tips - Minimal inline */}
              <div className="flex-shrink-0 flex gap-2 overflow-x-auto pb-1">
                {QUICK_TIPS.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/80 rounded-neo border border-neo-black/30 flex-shrink-0"
                  >
                    <tip.icon className="w-3.5 h-3.5 text-neo-cyan" />
                    <span className="text-[11px] text-neo-cream/80 font-medium whitespace-nowrap">
                      {tip.text}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full p-3"
            >
              <RoomChat
                username={username}
                isHost={false}
                gameCode={gameCode}
                className="h-full"
                onNewMessage={() => {
                  if (mobileTab !== 'chat') {
                    setUnreadChat(prev => prev + 1);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar */}
      <nav className={cn(
        'flex-shrink-0',
        'bg-slate-900/98 backdrop-blur-sm',
        'border-t-4 border-neo-black',
        'pb-[env(safe-area-inset-bottom)]'
      )}>
        <div className="flex items-center h-14">
          {/* Players Tab */}
          <button
            onClick={() => setMobileTab('players')}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full',
              'transition-all duration-150',
              mobileTab === 'players'
                ? 'text-neo-yellow bg-slate-800/50'
                : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {playersReady.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-neo-black">
                  {playersReady.length > 9 ? '9+' : playersReady.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase mt-0.5">
              {t('hostView.players') || 'Players'}
            </span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={handleChatTab}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full',
              'transition-all duration-150',
              mobileTab === 'chat'
                ? 'text-neo-yellow bg-slate-800/50'
                : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadChat > 0 && mobileTab !== 'chat' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-2 bg-neo-red text-neo-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-neo-black"
                >
                  {unreadChat > 9 ? '9+' : unreadChat}
                </motion.span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase mt-0.5">
              {t('common.chat') || 'Chat'}
            </span>
          </button>
        </div>
      </nav>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent noDescription className="sm:max-w-md bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <DialogHeader>
            <DialogTitle className="text-center text-neo-black font-black">
              {t('joinView.qrCodeTitle') || 'Join Game'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-neo shadow-hard border-3 border-neo-black">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={200} level="H" includeMargin />
            </div>
            <h4 className="text-2xl font-black text-neo-black">{gameCode}</h4>
            <p className="text-xs text-center text-neo-black/60">
              {getJoinUrl(gameCode)}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseQR}
              className="w-full bg-neo-cyan text-neo-black font-black border-3 border-neo-black shadow-hard-sm"
            >
              {t('common.close') || 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neo-black font-black">
              {t('playerView.exitConfirmation') || 'Leave Room?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neo-black/70 font-bold">
              {t('playerView.exitWarning') || 'Are you sure you want to leave?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmExit}
              className="bg-neo-red text-neo-white border-3 border-neo-black shadow-hard-sm font-bold"
            >
              {t('common.confirm') || 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlayerWaitingView;
