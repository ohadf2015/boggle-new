'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot, MessageCircle, Share2, LogOut } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import { getJoinUrl } from '../../utils/share';
import { useNativeShare } from '../../hooks/useNativeShare';
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
  const [unreadChat, setUnreadChat] = useState(0);
  const { nativeShare } = useNativeShare();

  // Share room using native share API
  const handleShare = useCallback(async () => {
    const joinUrl = getJoinUrl(gameCode, 'native-share');
    await nativeShare({
      title: t('share.inviteTitle'),
      text: t('share.inviteMessage'),
      url: joinUrl,
    });
  }, [gameCode, t, nativeShare]);

  // Handle chat tab with unread reset
  const handleChatTab = useCallback(() => {
    setMobileTab('chat');
    setUnreadChat(0);
  }, []);

  // Render players list content
  const renderPlayersContent = () => (
    <div className="flex-1 min-h-0 bg-neo-navy/30 rounded-neo border border-neo-black/50 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-neo-black/30 flex-shrink-0">
        <Users className="w-4 h-4 text-neo-pink" />
        <span className="text-xs font-bold uppercase text-neo-cream">
          {t('hostView.playersJoined')} ({playersReady.length})
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area p-2 space-y-1">
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
  );

  return (
    <div className="h-dvh flex flex-col bg-neo-navy lg:max-w-5xl lg:mx-auto">
      {/* Compact Header */}
      <header className="flex-shrink-0 px-3 py-2 bg-neo-navy/95 border-b-3 border-neo-black">
        <div className="flex items-center justify-between gap-2">
          {/* Room Code with Share Button */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-wider text-neo-lime">{gameCode}</span>
            <motion.button
              onClick={handleShare}
              whileTap={{ scale: 0.95 }}
              aria-label={t('share.buttonLabel') || 'Share'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-yellow text-neo-black font-bold text-sm rounded-neo border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:shadow-none active:translate-y-0 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('share.buttonLabel')}</span>
            </motion.button>
          </div>

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

      {/* Main Content - Desktop: Side-by-side, Mobile: Tabs */}
      <main className="flex-1 min-h-0 overflow-hidden bg-neo-navy/95">
        {/* Desktop Layout: Side-by-side players and chat */}
        <div className="hidden lg:flex h-full gap-4 p-4">
          {/* Left: Players List */}
          <div data-testid="desktop-players-section" className="flex-1 min-w-0 flex flex-col p-3">
            {renderPlayersContent()}
          </div>
          {/* Right: Chat Content */}
          <div data-testid="desktop-chat-area" className="w-80 flex-shrink-0 bg-neo-navy/30 rounded-neo border border-neo-black/50 overflow-hidden">
            <RoomChat
              username={username}
              isHost={false}
              gameCode={gameCode}
              className="h-full"
              onNewMessage={() => {}}
            />
          </div>
        </div>

        {/* Mobile Layout: Tab-based navigation */}
        <div className="lg:hidden h-full">
          <AnimatePresence mode="wait">
            {mobileTab === 'players' ? (
              <motion.div
                key="players"
                id="players-panel"
                role="tabpanel"
                aria-labelledby="players-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col p-3"
              >
                {renderPlayersContent()}
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                id="chat-panel"
                role="tabpanel"
                aria-labelledby="chat-tab"
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
        </div>
      </main>

      {/* Bottom Tab Bar - 2 Tabs, mobile only */}
      <nav
        className="flex-shrink-0 bg-neo-navy/98 border-t border-neo-black/50 pb-[env(safe-area-inset-bottom)] lg:hidden relative z-50"
        role="tablist"
        aria-label={t('playerView.mobileNavigation') || 'Mobile navigation'}
      >
        <div className="flex items-center h-12">
          {/* Players Tab */}
          <button
            onClick={() => setMobileTab('players')}
            role="tab"
            aria-selected={mobileTab === 'players'}
            aria-controls="players-panel"
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'players' ? 'text-neo-yellow bg-neo-navy-light/50' : 'text-neo-white/60'
            )}
          >
            <div className="relative">
              <Users className="w-5 h-5" aria-hidden="true" />
              {playersReady.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black" aria-label={`${playersReady.length} players`}>
                  {playersReady.length > 9 ? '9+' : playersReady.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase mt-0.5">{t('hostView.players')}</span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={handleChatTab}
            role="tab"
            aria-selected={mobileTab === 'chat'}
            aria-controls="chat-panel"
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'chat' ? 'text-neo-yellow bg-neo-navy-light/50' : 'text-neo-white/60'
            )}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" aria-hidden="true" />
              {unreadChat > 0 && mobileTab !== 'chat' && (
                <span className="absolute -top-1 -right-2 bg-neo-red text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black" aria-label={`${unreadChat} unread messages`}>
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
