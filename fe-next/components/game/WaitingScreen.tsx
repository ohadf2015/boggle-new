import React from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Link, MessageCircle, QrCode, X } from 'lucide-react';
import { Button } from '../ui/button';
import ExitRoomButton from '../ExitRoomButton';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import Avatar from '../Avatar';
import SlotMachineText from '../SlotMachineText';
import RoomChat from '../RoomChat';
import ShareButton from '../ShareButton';
import { InteractiveMascot } from '../ui/InteractiveMascot';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../../utils/share';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import type { Language, LetterGrid, GameUser, GridPosition } from '@/shared/types';

interface WaitingScreenProps {
  gameCode: string;
  roomName?: string;
  gameLanguage: Language;
  playersReady?: GameUser[];
  username: string;
  isHost?: boolean;
  shufflingGrid?: LetterGrid | null;
  highlightedCells?: GridPosition[];
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  onExitRoom: () => void;
  // Host-only props
  gameSettings?: React.ReactElement | null; // Component to render game settings (host only)
}

/**
 * Shared waiting screen component for both Host and Player views
 * Shows pre-game state with room code, players list, grid preview, and chat
 */
const WaitingScreen: React.FC<WaitingScreenProps> = ({
  gameCode,
  roomName,
  gameLanguage,
  playersReady = [] as GameUser[],
  username,
  isHost = false,
  shufflingGrid = null,
  highlightedCells = [] as GridPosition[],
  showQR = false,
  setShowQR,
  onExitRoom,
  // Host-only props
  gameSettings = null, // Component to render game settings (host only)
}) => {
  const { t } = useLanguage();
  const isLandscape = useMobileLandscape();

  // Landscape mode layout - optimized 3-column: room info | grid | players
  if (isLandscape) {
    return (
      <div className="relative flex h-screen w-full overflow-hidden bg-slate-900 text-white p-3 gap-3 landscape-full-height">
        {/* Left column: Room info + Exit */}
        <div className="flex flex-col items-center gap-3 w-28 flex-shrink-0">
          {/* Room Code & Name */}
          <div className="bg-neo-cyan border-3 border-neo-black rounded-neo p-3 text-center shadow-hard w-full">
            {roomName && (
              <div className="text-xs font-bold text-neo-black/90 mb-1 truncate" title={roomName}>{roomName}</div>
            )}
            <div className="text-xs font-bold uppercase text-neo-black/70 mb-1">Room</div>
            <div className="text-2xl font-black text-neo-black">{gameCode}</div>
          </div>

          {/* Language Badge */}
          {gameLanguage && (
            <Badge className="text-sm px-3 py-1.5 bg-neo-pink text-white border-3 border-neo-black w-full text-center" dir="auto">
              {gameLanguage === 'he' ? '🇮🇱' : gameLanguage === 'sv' ? '🇸🇪' : gameLanguage === 'ja' ? '🇯🇵' : '🇺🇸'}
            </Badge>
          )}

          {/* Share Buttons - compact column */}
          <div className="flex flex-col gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyJoinUrl(gameCode, t)}
              className="w-full h-12 min-h-[48px] p-0 bg-neo-lime/90 hover:bg-neo-lime border-3 border-neo-black rounded-neo flex items-center justify-center shadow-hard"
              title={t('hostView.copyLink')}
            >
              <Link className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareViaWhatsApp(gameCode, '', t)}
              className="w-full h-12 min-h-[48px] p-0 bg-neo-green/90 hover:bg-neo-green border-3 border-neo-black rounded-neo flex items-center justify-center shadow-hard"
              title={t('hostView.shareWhatsapp')}
            >
              <MessageCircle className="w-4 h-4 text-neo-black" />
            </Button>
          </div>

          {/* QR Code Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQR(true)}
            className="w-full h-12 min-h-[48px] p-0 bg-neo-pink/90 hover:bg-neo-pink border-3 border-neo-black rounded-neo flex items-center justify-center shadow-hard"
            title={t('hostView.qrCode')}
          >
            <QrCode className="w-4 h-4 text-neo-cream" />
          </Button>

          {/* Exit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitRoom}
            className="w-full h-12 min-h-[48px] p-0 bg-neo-red/90 hover:bg-neo-red border-3 border-neo-black rounded-neo mt-auto flex items-center justify-center shadow-hard"
          >
            <X className="w-4 h-4 text-neo-black" />
          </Button>
        </div>

        {/* Center: Chat - maximized for full viewport */}
        <div className="flex-1 flex items-center justify-center max-w-2xl mx-auto">
          <RoomChat
            username={isHost ? "Host" : username}
            isHost={isHost}
            gameCode={gameCode}
            className="h-full w-full min-h-[400px]"
          />
        </div>

        {/* Right column: Players list + Game Settings (Host) */}
        <div className="w-52 flex flex-col gap-3 overflow-hidden flex-shrink-0">
          {/* Game Settings for Host - includes Start Game button */}
          {isHost && gameSettings && (
            <div className="flex-shrink-0 [&_button]:h-11 [&_button]:text-sm [&_button]:px-3 [&_>*]:p-3 [&_>*]:gap-2 [&_h3]:hidden [&_p]:hidden [&_.space-y-4]:space-y-2 [&_.space-y-6]:space-y-2">
              {gameSettings}
            </div>
          )}

          {/* Waiting indicator for non-host players with mascot */}
          {!isHost && (
            <div className="flex flex-col items-center gap-2">
              <InteractiveMascot
                variant="sleepy"
                size="sm"
                enableHover
                enableClick
                clickAnimation="bounce"
                tooltip={t('playerView.waitForGameStart')}
              />
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-neo-cyan/20 border-3 border-neo-cyan/50 rounded-neo px-3 py-2 text-center"
              >
                <span className="text-xs font-bold text-neo-cyan uppercase">
                  {t('playerView.waitForGameStart')}
                </span>
              </motion.div>
            </div>
          )}

          {/* Players Header */}
          <div className="text-sm font-black uppercase text-neo-cream text-center flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-neo-pink" />
            <span>{playersReady.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {playersReady.map((player) => {
              const playerUsername = player.username;
              const avatar = player.avatar;
              const playerIsHost = player.isHost;
              const isMe = playerUsername === username;

              return (
                <Badge
                  key={playerUsername}
                  className={`text-xs font-bold px-2 py-2 w-full truncate border-3 border-neo-black shadow-hard-sm ${
                    playerIsHost ? "bg-neo-lime text-neo-black" : "bg-neo-cream text-neo-black"
                  }`}
                  style={avatar?.color && !playerIsHost ? { backgroundColor: avatar.color } : {}}
                >
                  <div className="flex items-center gap-2 w-full truncate">
                    <Avatar
                      profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                      avatarImage={avatar?.avatarImage}
                      size="xl"
                      className="flex-shrink-0"
                    />
                    {playerIsHost && <Crown className="w-4 h-4 flex-shrink-0" />}
                    <span className="truncate text-sm font-bold">{playerUsername}</span>
                    {isMe && <span className="text-xs opacity-70">({t('playerView.me')})</span>}
                  </div>
                </Badge>
              );
            })}
          </div>
          {playersReady.length === 0 && (
            <p className="text-xs text-center text-neo-cream/75 font-bold">
              {t('hostView.waitingForPlayers')}
            </p>
          )}
        </div>

        {/* QR Code Dialog - same as portrait */}
        <Dialog open={showQR} onOpenChange={setShowQR}>
          <DialogContent noDescription className="sm:max-w-md bg-white text-neo-black dark:bg-slate-800 dark:text-white border-cyan-500/30">
            <DialogHeader>
              <DialogTitle className="text-center text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-2">
                <QrCode className="w-4 h-4" />
                {t(isHost ? 'hostView.qrCode' : 'joinView.qrCodeTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-6 bg-white text-neo-black rounded-lg shadow-md">
                <QRCodeSVG value={getJoinUrl(gameCode)} size={200} level="H" includeMargin />
              </div>
              <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {gameCode}
              </h4>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setShowQR(false)} className="w-full">
                {t('common.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-neo-navy flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 pb-[--mobile-bottom-safe] overflow-y-auto overscroll-contain scrollable-area transition-colors duration-300">

      {/* Top Bar with Exit Button */}
      <div className="w-full max-w-6xl flex justify-end mb-4">
        <ExitRoomButton onClick={onExitRoom} label={t(isHost ? 'hostView.exitRoom' : 'playerView.exit')} />
      </div>

      {/* Main Layout */}
      <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl">

        {/* Row 1: Room Code + Language + Share Buttons */}
        <Card className="bg-slate-800/95 text-neo-white p-3 sm:p-4 md:p-6 border-4 border-neo-black shadow-hard-lg relative overflow-hidden">
          {/* Comic-style halftone dots */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
              backgroundSize: '12px 12px',
            }}
          />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            {/* Room Name, Code and Language */}
            <div className="flex flex-col items-center sm:items-start gap-2">
              {roomName && (
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-black text-neo-white mb-1">
                    {roomName}
                  </h2>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="text-center sm:text-left">
                  <p className="text-sm text-neo-cyan font-bold uppercase">{t('hostView.roomCode')}:</p>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-wide text-neo-lime">
                    {gameCode}
                  </h2>
                </div>
                {gameLanguage && (
                  <Badge className="text-base sm:text-lg px-3 py-1 bg-neo-pink text-white border-3 border-neo-black shadow-hard-sm font-bold" dir="auto">
                    {gameLanguage === 'he' ? '🇮🇱 עברית' : gameLanguage === 'sv' ? '🇸🇪 Svenska' : gameLanguage === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <ShareButton
                variant="secondary"
                onClick={() => copyJoinUrl(gameCode, t)}
                icon={<Link className="w-4 h-4" />}
              >
                {t(isHost ? 'hostView.copyLink' : 'joinView.copyLink')}
              </ShareButton>
              <ShareButton
                variant="whatsapp"
                onClick={() => shareViaWhatsApp(gameCode, '', t)}
                icon={<MessageCircle className="w-4 h-4" />}
              >
                {t(isHost ? 'hostView.shareWhatsapp' : 'joinView.shareWhatsapp')}
              </ShareButton>
              <ShareButton
                variant="secondary"
                onClick={() => setShowQR(true)}
                icon={<QrCode className="w-4 h-4" />}
              >
                {t('hostView.qrCode')}
              </ShareButton>
            </div>
          </div>
        </Card>

        {/* Row 2: Game Settings (Host) OR Waiting Message (Player) + Players List */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4 md:gap-6">

          {/* LEFT SIDE: Game Settings (Host) OR Waiting Message (Player) */}
          {isHost && gameSettings ? (
            // Host: Game Settings Component
            gameSettings
          ) : (
            // Player: Waiting Message - NEO-BRUTALIST with Interactive Mascot
            <div className="flex-1 p-4 sm:p-6 md:p-8 bg-slate-800/95 text-white border-4 border-neo-black shadow-hard flex flex-col items-center justify-center rotate-[-0.5deg]">
              <motion.div
                initial={{ scale: 0.9, rotate: -3 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                {/* Decorative background shapes */}
                <div className="absolute -top-4 -right-6 w-20 h-20 bg-neo-pink text-white border-4 border-neo-black rotate-12 -z-10" />
                <div className="absolute -bottom-4 -left-6 w-16 h-16 bg-neo-cyan text-neo-black border-4 border-neo-black -rotate-6 -z-10" />
                <div className="absolute top-1/2 -right-10 w-10 h-10 bg-neo-lime text-neo-black border-3 border-neo-black rotate-45 -z-10" />

                {/* Interactive Mascot - Sleepy while waiting, excited on hover/click */}
                <InteractiveMascot
                  variant="sleepy"
                  size="xl"
                  enableHover
                  enableClick
                  hoverVariant="happy"
                  clickVariant="excited"
                  clickAnimation="bounce"
                  tooltip={t('playerView.clickToWakeUp')}
                />
              </motion.div>

              {/* Text */}
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
                  className="text-slate-400 font-bold text-sm mt-4 uppercase tracking-wide"
                >
                  {t('playerView.waitingForHostToStart') || 'Waiting for host to start the game...'}
                </motion.p>
              </motion.div>

              {/* Decorative dots */}
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
            </div>
          )}

          {/* RIGHT SIDE: Players List - Neo-Brutalist Dark */}
          <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg relative overflow-hidden">
            {/* Comic-style halftone dots */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.025]"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
                backgroundSize: '12px 12px',
              }}
            />
            <h3 className="text-lg font-black uppercase text-neo-cream mb-4 flex items-center gap-2 flex-shrink-0 relative z-10">
              <Users className="w-4 h-4 text-neo-pink" />
              {t(isHost ? 'hostView.playersJoined' : 'playerView.players')} ({playersReady.length})
            </h3>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto relative z-10">
              {playersReady.map((player, index) => {
                const playerUsername = player.username;
                const avatar = player.avatar;
                const playerIsHost = player.isHost;
                const isMe = playerUsername === username;

                return (
                  <motion.div
                    key={playerUsername}
                    initial={{ scale: 0, opacity: 0, rotate: -5 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Badge
                      className={`font-black px-3 py-3 text-base w-full justify-between border-3 border-neo-black shadow-hard-sm ${
                        playerIsHost ? "bg-neo-lime text-neo-black" : "bg-neo-cream text-neo-black"
                      }`}
                      style={avatar?.color && !playerIsHost ? { backgroundColor: avatar.color } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                          avatarImage={avatar?.avatarImage}
                          size="2xl"
                          className="flex-shrink-0"
                        />
                        {playerIsHost && <Crown className="w-4 h-4 text-neo-lime" />}
                        <SlotMachineText text={playerUsername} />
                        {isMe && (
                          <span className="text-xs bg-neo-black/20 px-2 py-0.5 rounded-neo font-bold">
                            ({t('playerView.me')})
                          </span>
                        )}
                      </div>
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
            {playersReady.length === 0 && (
              <p className="text-sm text-center text-neo-cream/75 font-bold mt-2 relative z-10">
                {t('hostView.waitingForPlayers')}
              </p>
            )}
          </Card>
        </div>

        {/* Row 3: Chat */}
        <div className="w-full max-w-2xl mx-auto">
          <RoomChat
            username={isHost ? "Host" : username}
            isHost={isHost}
            gameCode={gameCode}
            className="h-full min-h-[400px]"
          />
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent noDescription className="sm:max-w-md bg-white text-neo-black dark:bg-slate-800 dark:text-white border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4" />
              {t(isHost ? 'hostView.qrCode' : 'joinView.qrCodeTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white text-neo-black rounded-lg shadow-md">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {gameCode}
            </h4>
            <p className="text-sm text-center text-slate-500 dark:text-slate-300">
              {t(isHost ? 'hostView.scanQr' : 'joinView.scanToJoin')} {gameCode}
            </p>
            <p className="text-xs text-center text-slate-500">
              {getJoinUrl(gameCode)}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowQR(false)}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitingScreen;
