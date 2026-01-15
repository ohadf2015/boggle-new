'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot, MessageCircle, Copy, Check, LogOut } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import { getJoinUrl } from '../../utils/share';
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

type MobileTab = 'players' | 'chat';

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('players');
  const [codeCopied, setCodeCopied] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  // Copy room code
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCodeCopied(true);
      toast.success(t('roomCode.copied') || 'Copied!', { duration: 1500, icon: '📋' });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error(t('common.error'));
    }
  }, [gameCode, t]);

  // Handle chat tab with unread reset
  const handleChatTab = useCallback(() => {
    setMobileTab('chat');
    setUnreadChat(0);
  }, []);

  return (
    <div className="h-full flex flex-col bg-neo-navy overflow-hidden lg:max-w-2xl lg:mx-auto">
      {/* Compact Header */}
      <header className="flex-shrink-0 px-3 py-2 bg-slate-800/95 border-b-3 border-neo-black">
        <div className="flex items-center justify-between gap-2">
          {/* Room Code - Clickable */}
          <motion.button
            onClick={handleCopyCode}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-neo-navy/60 hover:bg-neo-navy/80 rounded-neo border-2 border-neo-black shadow-hard-sm transition-all"
          >
            <span className="text-lg font-black tracking-wider text-neo-lime">{gameCode}</span>
            {codeCopied ? <Check className="w-4 h-4 text-neo-lime" /> : <Copy className="w-4 h-4 text-neo-cream/50" />}
          </motion.button>

          {/* Exit Button */}
          <Button
            onClick={onExitRoom}
            variant="ghost"
            size="sm"
            className="text-neo-red hover:bg-neo-red/20 border border-neo-red/30 p-2"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Waiting Status */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center mt-2"
        >
          <span className="text-neo-cream/70 text-sm font-bold uppercase">
            ⏳ {t('playerView.waitingForHostToStart') || 'Waiting for host...'}
          </span>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden bg-slate-800/95">
        <AnimatePresence mode="wait">
          {mobileTab === 'players' ? (
            <motion.div
              key="players"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col p-3"
            >
              {/* Players List */}
              <div className="flex-1 min-h-0 bg-slate-700/30 rounded-neo border border-slate-600 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-600/50 flex-shrink-0">
                  <Users className="w-4 h-4 text-neo-pink" />
                  <span className="text-xs font-bold uppercase text-neo-cream">
                    {t('hostView.playersJoined')} ({playersReady.length})
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                  <AnimatePresence>
                    {playersReady.map((player, index) => {
                      const name = typeof player === 'string' ? player : player.username;
                      const avatar = typeof player === 'object' ? player.avatar : null;
                      const isHostPlayer = typeof player === 'object' ? player.isHost : false;
                      const presence = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
                      const isBot = typeof player === 'object' ? player.isBot : false;
                      const isMe = name === username;

                      return (
                        <motion.div
                          key={name}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 10, opacity: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar
                              profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                              avatarImage={avatar?.avatarImage}
                              size="sm"
                            />
                            <span className="font-medium text-neo-cream text-sm truncate max-w-[140px]">
                              {name}
                            </span>
                            {isHostPlayer && <Crown className="w-3 h-3 text-neo-yellow" />}
                            {isBot && <Bot className="w-3 h-3 text-neo-cyan" />}
                            {isMe && <span className="text-[9px] text-neo-cream/50">({t('playerView.me')})</span>}
                          </div>
                          {!isMe && !isBot && <PresenceIndicator status={presence} size="sm" />}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {playersReady.length === 0 && (
                    <p className="text-xs text-center text-neo-cream/50 py-4">
                      {t('hostView.waitingForPlayers')}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full p-3"
            >
              <RoomChat
                username={username}
                isHost={false}
                gameCode={gameCode}
                className="h-full"
                onNewMessage={() => {
                  if (mobileTab !== 'chat') setUnreadChat(prev => prev + 1);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar - 2 Tabs */}
      <nav className="flex-shrink-0 bg-slate-900/98 border-t-3 border-neo-black pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center h-12">
          {/* Players Tab */}
          <button
            onClick={() => setMobileTab('players')}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'players' ? 'text-neo-yellow bg-slate-800/50' : 'text-neo-white/60'
            )}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {playersReady.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black">
                  {playersReady.length > 9 ? '9+' : playersReady.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase mt-0.5">{t('hostView.players')}</span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={handleChatTab}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'chat' ? 'text-neo-yellow bg-slate-800/50' : 'text-neo-white/60'
            )}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadChat > 0 && mobileTab !== 'chat' && (
                <span className="absolute -top-1 -right-2 bg-neo-red text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase mt-0.5">{t('common.chat')}</span>
          </button>
        </div>
      </nav>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent noDescription className="sm:max-w-md bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <DialogHeader>
            <DialogTitle className="text-center font-black">{t('joinView.qrCodeTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-neo shadow-hard border-3 border-neo-black">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={180} level="H" includeMargin />
            </div>
            <h4 className="text-2xl font-black">{gameCode}</h4>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowQR(false)} className="w-full bg-neo-cyan text-neo-black font-black border-3 border-neo-black shadow-hard-sm">
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
