import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, QrCode, Link, Crown, DoorOpen, Bot } from 'lucide-react';

// WhatsApp SVG icon component (brand icon)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
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
                <Badge className="text-base sm:text-lg px-3 py-1 bg-neo-purple text-white border-3 border-neo-black shadow-hard-sm font-bold" dir="auto">
                  {gameLanguage === 'he' ? '🇮🇱 עברית' : gameLanguage === 'sv' ? '🇸🇪 Svenska' : gameLanguage === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
                </Badge>
              )}
            </div>
          </div>

          {/* Share Buttons + Exit */}
          <div className="flex flex-wrap gap-2 justify-center items-center">
            <ShareButton
              variant="secondary"
              onClick={handleCopyLink}
              icon={<Link />}
            >
              {t('hostView.copyLink')}
            </ShareButton>
            <ShareButton
              variant="whatsapp"
              onClick={handleShareWhatsApp}
              icon={<WhatsAppIcon />}
            >
              {t('hostView.shareWhatsapp')}
            </ShareButton>
            <ShareButton
              variant="secondary"
              onClick={handleShowQR}
              icon={<QrCode />}
            >
              {t('hostView.qrCode')}
            </ShareButton>
            <Button
              onClick={onExitRoom}
              className="bg-neo-red text-neo-white font-bold border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 flex items-center gap-2"
            >
              <DoorOpen />
              {t('playerView.exitRoom') || 'Exit Room'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Row 2: Waiting Message + Players List (side by side on desktop) */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4 md:gap-6">
        {/* Waiting Message Card - Neo-Brutalist (compact version) */}
        <Card className="flex-1 p-2 sm:p-3 md:p-4 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg flex flex-col items-center justify-center min-h-[180px]">
          <motion.div
            initial={{ scale: 0.9, rotate: -3 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
            aria-hidden="true"
          >
            {/* Neo-Brutalist Hourglass - Compact */}
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-neo-yellow border-3 border-neo-black shadow-hard p-3 rotate-[2deg]"
            >
              <div className="relative w-8 h-12 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[18px] border-l-transparent border-r-transparent border-t-neo-black" />
                <div className="w-1 h-0.5 bg-neo-black -my-[1px] z-10" />
                <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[18px] border-l-transparent border-r-transparent border-b-neo-black" />
                <motion.div
                  animate={{ y: [0, 18, 0], opacity: [1, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute top-[24px] w-0.5 h-2 bg-neo-pink"
                />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="bg-neo-black text-neo-white px-4 py-2 font-black uppercase text-base md:text-lg tracking-wider rotate-[1deg] shadow-hard border-3 border-neo-black">
              {t('playerView.waitForGameStart')}
            </div>
            <motion.p
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-neo-cream/80 font-bold text-xs mt-2 uppercase tracking-wide"
            >
              {t('playerView.waitingForHostToStart') || 'Waiting for host to start the game...'}
            </motion.p>
          </motion.div>

          <div className="flex gap-2 mt-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="w-3 h-3 bg-neo-pink border-2 border-neo-black"
              />
            ))}
          </div>
        </Card>

        {/* Players List - RIGHT */}
        <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
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
                          avatarEmoji={avatar?.emoji}
                          avatarImage={avatar?.avatarImage}
                          avatarColor={avatar?.color}
                          size="lg"
                        />
                        <span className="font-medium text-neo-cream/90">
                          <SlotMachineText text={playerUsername} />
                        </span>
                        {isHostPlayer && <Crown className="text-neo-yellow/80 text-sm" />}
                        {isBot && <Bot className="text-neo-cyan/70 text-sm" />}
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
      </div>

      {/* Row 3: Chat */}
      <div className="w-full max-w-2xl mx-auto">
        <RoomChat
          username={username}
          isHost={false}
          gameCode={gameCode}
          className="h-full min-h-[400px]"
        />
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md bg-neo-cream text-neo-black border-4 border-neo-black shadow-hard">
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
