import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaQrcode, FaWhatsapp, FaLink, FaCrown, FaDoorOpen, FaRobot } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import SlotMachineGrid from '../../components/SlotMachineGrid';
import ShareButton from '../../components/ShareButton';
import SlotMachineText from '../../components/SlotMachineText';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../../utils/share';
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
  shufflingGrid: LetterGrid | null;
  highlightedCells: GridPosition[];
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
  shufflingGrid,
  highlightedCells,
  showQR,
  setShowQR,
  showExitConfirm,
  setShowExitConfirm,
  onExitRoom,
  onConfirmExit,
}): React.ReactElement => {
  // Memoized handlers
  const handleCopyLink = useCallback(() => {
    copyJoinUrl(gameCode, t);
  }, [gameCode, t]);

  const handleShareWhatsApp = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

  const handleShowQR = useCallback(() => {
    setShowQR(true);
  }, [setShowQR]);

  const handleCloseQR = useCallback(() => {
    setShowQR(false);
  }, [setShowQR]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl">
      {/* Row 1: Room Code + Language + Share */}
      <Card className="bg-slate-800/95 text-neo-white p-3 sm:p-4 md:p-6 border-4 border-neo-black shadow-hard-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Room Code and Language in same row */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="text-center sm:text-left">
                <p className="text-sm text-neo-cyan font-bold uppercase">{t('hostView.roomCode')}:</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-wide text-neo-yellow">
                  {gameCode}
                </h2>
              </div>
              {gameLanguage && (
                <Badge className="text-base sm:text-lg px-3 py-1 bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
                  {gameLanguage === 'he' ? '🇮🇱 עברית' : gameLanguage === 'sv' ? '🇸🇪 Svenska' : gameLanguage === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
                </Badge>
              )}
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            <ShareButton
              variant="link"
              onClick={handleCopyLink}
              icon={<FaLink />}
            >
              {t('hostView.copyLink')}
            </ShareButton>
            <ShareButton
              variant="whatsapp"
              onClick={handleShareWhatsApp}
              icon={<FaWhatsapp />}
            >
              {t('hostView.shareWhatsapp')}
            </ShareButton>
            <ShareButton
              variant="qr"
              onClick={handleShowQR}
              icon={<FaQrcode />}
            >
              {t('hostView.qrCode')}
            </ShareButton>
          </div>
        </div>
      </Card>

      {/* Row 2: Waiting Message + Players List (side by side on desktop) */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4 md:gap-6">
        {/* Waiting Message Card - Neo-Brutalist (matches host settings card styling) */}
        <Card className="flex-1 p-3 sm:p-4 md:p-5 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg flex flex-col items-center justify-center min-h-[300px]">
          <motion.div
            initial={{ scale: 0.9, rotate: -3 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
          >
            {/* Decorative background shapes */}
            <div className="absolute -top-4 -right-6 w-20 h-20 bg-neo-pink border-4 border-neo-black rotate-12 -z-10" />
            <div className="absolute -bottom-4 -left-6 w-16 h-16 bg-neo-cyan border-4 border-neo-black -rotate-6 -z-10" />
            <div className="absolute top-1/2 -right-10 w-10 h-10 bg-neo-yellow border-3 border-neo-black rotate-45 -z-10" />

            {/* Neo-Brutalist Hourglass */}
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-neo-yellow border-4 border-neo-black shadow-hard p-4 rotate-[2deg]"
            >
              <div className="relative w-16 h-20 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[28px] border-r-[28px] border-t-[32px] border-l-transparent border-r-transparent border-t-neo-black" />
                <div className="w-2 h-1 bg-neo-black -my-[2px] z-10" />
                <div className="w-0 h-0 border-l-[28px] border-r-[28px] border-b-[32px] border-l-transparent border-r-transparent border-b-neo-black" />
                <motion.div
                  animate={{ y: [0, 24, 0], opacity: [1, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute top-[32px] w-1 h-3 bg-neo-pink"
                />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <div className="bg-neo-black text-neo-white px-6 py-3 font-black uppercase text-xl md:text-2xl tracking-wider rotate-[1deg] shadow-hard border-4 border-neo-black">
              {t('playerView.waitForGameStart')}
            </div>
            <motion.p
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-neo-cream/60 font-bold text-sm mt-4 uppercase tracking-wide"
            >
              {t('playerView.waitingForHostToStart') || 'Waiting for host to start the game...'}
            </motion.p>
          </motion.div>

          <div className="flex gap-3 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="w-4 h-4 bg-neo-pink border-2 border-neo-black"
              />
            ))}
          </div>
        </Card>

        {/* Players List - RIGHT */}
        <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
          <h3 className="text-base font-bold uppercase text-neo-cream/80 mb-3 flex items-center gap-2 flex-shrink-0">
            <FaUsers className="text-neo-pink/80" />
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
                          avatarEmoji={avatar?.emoji}
                          avatarColor={avatar?.color}
                          size="sm"
                        />
                        <span className="font-medium text-neo-cream/90">
                          <SlotMachineText text={playerUsername} />
                        </span>
                        {isHostPlayer && <FaCrown className="text-neo-yellow/80 text-sm" />}
                        {isBot && <FaRobot className="text-neo-cyan/70 text-sm" />}
                        {isMe && (
                          <span className="text-xs text-neo-cream/50 font-medium">
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
            <p className="text-sm text-center text-neo-cream/40 font-medium mt-2">
              {t('hostView.waitingForPlayers')}
            </p>
          )}
        </Card>
      </div>

      {/* Row 3: Letter Grid + Chat */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
        {/* Letter Grid - LEFT */}
        <Card className="flex-1 p-1 sm:p-3 flex flex-col items-center bg-slate-800/95 border-4 border-neo-black shadow-hard-lg">
          <div className="w-full flex justify-center items-center transition-all duration-500 aspect-square max-w-full">
            <div className="w-full h-full flex items-center justify-center">
              {shufflingGrid ? (
                <SlotMachineGrid
                  grid={shufflingGrid}
                  highlightedCells={highlightedCells}
                  language={gameLanguage || 'en'}
                  className="w-full h-full"
                  animationDuration={600}
                  staggerDelay={40}
                  animationPattern="cascade"
                />
              ) : (
                <div className="w-full aspect-square grid grid-cols-4 gap-2 p-4">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="aspect-square rounded-neo bg-neo-cream/20 border-2 border-neo-black/30"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Chat - RIGHT */}
        <div className="lg:w-[350px] xl:w-[400px]">
          <RoomChat
            username={username}
            isHost={false}
            gameCode={gameCode}
            className="h-full min-h-[400px]"
          />
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md bg-neo-cream border-4 border-neo-black shadow-hard">
          <DialogHeader>
            <DialogTitle className="text-center text-neo-black flex items-center justify-center gap-2 font-black">
              <FaQrcode />
              {t('joinView.qrCodeTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-neo shadow-hard border-3 border-neo-black">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-black text-neo-black">{gameCode}</h4>
            <p className="text-sm text-center text-neo-black/70 font-bold">
              {t('joinView.scanToJoin')} {gameCode}
            </p>
            <p className="text-xs text-center text-neo-black/50">
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
        <AlertDialogContent className="bg-neo-cream border-4 border-neo-black shadow-hard">
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
