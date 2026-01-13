import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, QrCode, Crown, Bot, Info, MessageCircle, Copy, Check } from 'lucide-react';
import { NewPlayerBadge } from '@/components/game/NewPlayerBadge';
import { isNewPlayer } from '@/utils/multiplayerProgressStorage';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import SlotMachineText from '../../components/SlotMachineText';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import GameRoomHeader from '../../components/game/GameRoomHeader';
import WaitingProgressBar from '../../components/game/WaitingProgressBar';
import WaitingTips from '../../components/game/WaitingTips';
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

// ==================== Component ====================

const PlayerWaitingView: React.FC<PlayerWaitingViewProps> = ({
  gameCode,
  gameLanguage,
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
  // Mobile tab state: 'info' | 'players' | 'chat'
  const [mobileTab, setMobileTab] = useState<'info' | 'players' | 'chat'>('info');
  const [codeCopied, setCodeCopied] = useState(false);
  const [isCurrentUserNew, setIsCurrentUserNew] = useState(false);

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

  // Waiting Info Card Content - render function to avoid static component warning
  const renderWaitingInfoCard = () => (
    <Card className="flex-1 p-4 sm:p-5 md:p-6 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg flex flex-col gap-5">
      {/* Prominent Room Code - Easy to share */}
      <div className="flex flex-col items-center gap-2 pb-4 border-b-2 border-neo-cream/10">
        <span className="text-xs font-bold uppercase tracking-wider text-neo-cream/60">
          {t('roomCode.inviteFriends') || 'Invite friends with code:'}
        </span>
        <motion.button
          onClick={handleCopyCode}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex items-center gap-3 px-5 py-3",
            "bg-neo-navy/60 hover:bg-neo-navy/80",
            "rounded-neo border-3 border-neo-black shadow-hard",
            "transition-all cursor-pointer"
          )}
          title={t('roomCode.tapToCopy') || 'Tap to copy'}
        >
          <span className="text-3xl font-black tracking-[0.25em] text-neo-lime">
            {gameCode}
          </span>
          <motion.span
            initial={false}
            animate={codeCopied ? { scale: [1, 1.3, 1] } : {}}
            className="inline-flex"
          >
            {codeCopied ? (
              <Check className="w-5 h-5 text-neo-lime" />
            ) : (
              <Copy className="w-5 h-5 text-neo-cream/50" />
            )}
          </motion.span>
        </motion.button>
        <span className="text-[10px] text-neo-cream/40">
          {t('roomCode.tapToCopy') || 'Tap to copy'}
        </span>
      </div>

      {/* Status message with "Get Ready" prompt */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="bg-neo-yellow border-2 border-neo-black shadow-hard-sm p-1.5 rotate-[2deg]"
            aria-hidden="true"
          >
            <div className="relative w-4 h-7 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[10px] border-l-transparent border-r-transparent border-t-neo-black" />
              <div className="w-0.5 h-0.5 bg-neo-black -my-[1px] z-10" />
              <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[10px] border-l-transparent border-r-transparent border-b-neo-black" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            role="status"
            aria-live="polite"
            className="text-center"
          >
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-neo-cream/90 font-bold text-sm uppercase tracking-wide"
            >
              {t('playerView.waitingForHostToStart') || 'Waiting for host to start...'}
            </motion.p>
          </motion.div>
        </div>

        {/* Get Ready hint for new players */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 px-4 py-2 bg-neo-cyan/20 rounded-neo border border-neo-cyan/30"
        >
          <span className="text-neo-cyan text-lg">💡</span>
          <span className="text-xs text-neo-cyan/90 font-medium">
            {t('playerView.getReadyHint') || 'Read the tips below to learn how to play!'}
          </span>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <WaitingProgressBar
        currentPlayers={playersReady.length}
        t={t}
        className="mt-2"
      />

      {/* Tips Section */}
      <WaitingTips
        t={t}
        className="mt-2"
      />
    </Card>
  );

  // Players List Card Content - render function to avoid static component warning
  const renderPlayersListCard = (className = '') => (
    <Card className={cn("h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg", className)}>
      <h3 className="text-base font-bold uppercase text-neo-cream/80 mb-3 flex items-center gap-2 flex-shrink-0">
        <Users className="text-neo-pink/80" />
        {t('hostView.playersJoined')} ({playersReady.length})
      </h3>
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
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
              >
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                    "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                      avatarImage={avatar?.avatarImage}
                      size="lg"
                    />
                    <span className="font-medium text-neo-cream/90">
                      <SlotMachineText text={playerUsername} />
                    </span>
                    {isHostPlayer && <Crown className="text-neo-yellow/80 text-sm" />}
                    {isBot && <Bot className="text-neo-cyan/70 text-sm" />}
                    {isMe && isCurrentUserNew && <NewPlayerBadge t={t} size="xs" />}
                    {isMe && (
                      <span className="text-xs text-neo-cream/70 font-medium">
                        ({t('playerView.me')})
                      </span>
                    )}
                  </div>
                  {!isMe && !isBot && (
                    <PresenceIndicator
                      status={presenceStatus}
                      isWindowFocused={isWindowFocused}
                      size="lg"
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {playersReady.length === 0 && (
        <p className="text-sm text-center text-neo-cream/75 font-medium mt-2">
          {t('hostView.waitingForPlayers')}
        </p>
      )}
    </Card>
  );

  // Chat Card Content - render function to avoid static component warning
  const renderChatCard = () => (
    <div className="w-full">
      <RoomChat
        username={username}
        isHost={false}
        gameCode={gameCode}
        className="h-full min-h-[350px]"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl pb-20 lg:pb-0">
      {/* Row 1: Room Code + Language + Share + Exit - Always visible */}
      {gameLanguage && (
        <GameRoomHeader
          gameCode={gameCode}
          roomLanguage={gameLanguage}
          username={username}
          t={t}
          onExitRoom={onExitRoom}
          isHost={false}
          showRoomName={false}
        />
      )}

      {/* Desktop Layout: Side by side + chat below */}
      <div className="hidden lg:flex flex-col gap-6">
        <div className="flex lg:items-stretch gap-6">
          {renderWaitingInfoCard()}
          {renderPlayersListCard("lg:w-[350px]")}
        </div>
        <div className="max-w-2xl mx-auto w-full">
          {renderChatCard()}
        </div>
      </div>

      {/* Mobile Layout: Tab-based */}
      <div className="lg:hidden">
        {/* Sticky Room Code Banner - Always visible on mobile when not on info tab */}
        {mobileTab !== 'info' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-2 bg-slate-800/95 rounded-neo border-2 border-neo-black shadow-hard-sm flex items-center justify-center gap-2"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-neo-cream/60">
              {t('roomCode.code') || 'Code:'}
            </span>
            <motion.button
              onClick={handleCopyCode}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1 bg-neo-navy/60 hover:bg-neo-navy/80 rounded-neo border-2 border-neo-black transition-all"
            >
              <span className="text-xl font-black tracking-[0.2em] text-neo-lime">
                {gameCode}
              </span>
              {codeCopied ? (
                <Check className="w-4 h-4 text-neo-lime" />
              ) : (
                <Copy className="w-4 h-4 text-neo-cream/50" />
              )}
            </motion.button>
          </motion.div>
        )}

        {mobileTab === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderWaitingInfoCard()}
          </motion.div>
        )}
        {mobileTab === 'players' && (
          <motion.div
            key="players"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderPlayersListCard()}
          </motion.div>
        )}
        {mobileTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderChatCard()}
          </motion.div>
        )}
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className={cn(
        'fixed bottom-0 inset-x-0 z-50 lg:hidden',
        'bg-neo-navy/95 backdrop-blur-sm',
        'border-t-4 border-neo-black',
        'pb-[env(safe-area-inset-bottom)]'
      )}>
        <div className="flex items-center justify-around h-16">
          {/* Info Tab */}
          <motion.button
            onClick={() => setMobileTab('info')}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-col items-center justify-center flex-1',
              'py-2 transition-all duration-150',
              mobileTab === 'info'
                ? 'text-neo-yellow'
                : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <motion.div
              className="relative"
              animate={mobileTab === 'info' ? { scale: 1.1 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Info className="w-6 h-6" />
              {mobileTab === 'info' && (
                <motion.div
                  layoutId="waiting-nav-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-neo-yellow rounded-full"
                  initial={false}
                />
              )}
            </motion.div>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
              {t('common.info') || 'Info'}
            </span>
          </motion.button>

          {/* Players Tab */}
          <motion.button
            onClick={() => setMobileTab('players')}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-col items-center justify-center flex-1',
              'py-2 transition-all duration-150',
              mobileTab === 'players'
                ? 'text-neo-yellow'
                : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <motion.div
              className="relative"
              animate={mobileTab === 'players' ? { scale: 1.1 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Users className="w-6 h-6" />
              {playersReady.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center border-2 border-neo-black">
                  {playersReady.length > 9 ? '9+' : playersReady.length}
                </span>
              )}
              {mobileTab === 'players' && (
                <motion.div
                  layoutId="waiting-nav-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-neo-yellow rounded-full"
                  initial={false}
                />
              )}
            </motion.div>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
              {t('hostView.players') || 'Players'}
            </span>
          </motion.button>

          {/* Chat Tab */}
          <motion.button
            onClick={() => setMobileTab('chat')}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-col items-center justify-center flex-1',
              'py-2 transition-all duration-150',
              mobileTab === 'chat'
                ? 'text-neo-yellow'
                : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <motion.div
              className="relative"
              animate={mobileTab === 'chat' ? { scale: 1.1 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <MessageCircle className="w-6 h-6" />
              {mobileTab === 'chat' && (
                <motion.div
                  layoutId="waiting-nav-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-neo-yellow rounded-full"
                  initial={false}
                />
              )}
            </motion.div>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
              {t('common.chat') || 'Chat'}
            </span>
          </motion.button>
        </div>
      </nav>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent noDescription className="sm:max-w-md bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <DialogHeader>
            <DialogTitle className="text-center text-neo-black flex items-center justify-center gap-2 font-black">
              <QrCode />
              {t('joinView.qrCodeTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white text-neo-black rounded-neo shadow-hard border-3 border-neo-black">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-black text-neo-black">{gameCode}</h4>
            <p className="text-sm text-center text-neo-black/70 font-bold">
              {t('joinView.scanToJoin')} {gameCode}
            </p>
            <p className="text-xs text-center text-neo-black/70">
              {getJoinUrl(gameCode)}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseQR}
              className="w-full bg-neo-cyan text-neo-black font-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neo-black font-black">
              {t('playerView.exitConfirmation')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neo-black/70 font-bold">
              {t('playerView.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard font-bold">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmExit}
              className="bg-neo-red text-neo-white border-3 border-neo-black shadow-hard-sm hover:shadow-hard font-bold"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlayerWaitingView;
