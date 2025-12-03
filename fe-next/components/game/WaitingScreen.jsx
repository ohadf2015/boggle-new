import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaCrown, FaLink, FaWhatsapp, FaQrcode } from 'react-icons/fa';
import { Button } from '../ui/button';
import ExitRoomButton from '../ExitRoomButton';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import Avatar from '../Avatar';
import SlotMachineGrid from '../SlotMachineGrid';
import SlotMachineText from '../SlotMachineText';
import RoomChat from '../RoomChat';
import ShareButton from '../ShareButton';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../../utils/share';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Shared waiting screen component for both Host and Player views
 * Shows pre-game state with room code, players list, grid preview, and chat
 */
const WaitingScreen = ({
  gameCode,
  gameLanguage,
  playersReady = [],
  username,
  isHost = false,
  shufflingGrid = null,
  highlightedCells = [],
  showQR = false,
  setShowQR,
  onExitRoom,
  // Host-only props
  gameSettings = null, // Component to render game settings (host only)
}) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 overflow-auto transition-colors duration-300">

      {/* Top Bar with Exit Button */}
      <div className="w-full max-w-6xl flex justify-end mb-4">
        <ExitRoomButton onClick={onExitRoom} label={t(isHost ? 'hostView.exitRoom' : 'playerView.exit')} />
      </div>

      {/* Main Layout */}
      <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl">

        {/* Row 1: Room Code + Language + Share Buttons */}
        <Card className="bg-slate-800/95 text-neo-white p-3 sm:p-4 md:p-6 border-4 border-neo-black shadow-hard-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Room Code and Language */}
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
                onClick={() => copyJoinUrl(gameCode, t)}
                icon={<FaLink />}
              >
                {t(isHost ? 'hostView.copyLink' : 'joinView.copyLink')}
              </ShareButton>
              <ShareButton
                variant="whatsapp"
                onClick={() => shareViaWhatsApp(gameCode, '', t)}
                icon={<FaWhatsapp />}
              >
                {t(isHost ? 'hostView.shareWhatsapp' : 'joinView.shareWhatsapp')}
              </ShareButton>
              <ShareButton
                variant="qr"
                onClick={() => setShowQR(true)}
                icon={<FaQrcode />}
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
            // Player: Waiting Message - NEO-BRUTALIST
            <div className="flex-1 p-4 sm:p-6 md:p-8 bg-slate-800/95 border-4 border-neo-black shadow-hard flex flex-col items-center justify-center rotate-[-0.5deg]">
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
          <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
            <h3 className="text-lg font-black uppercase text-neo-cream mb-4 flex items-center gap-2 flex-shrink-0">
              <FaUsers className="text-neo-pink" />
              {t(isHost ? 'hostView.playersJoined' : 'playerView.players')} ({playersReady.length})
            </h3>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              <AnimatePresence>
                {playersReady.map((player, index) => {
                  const playerUsername = typeof player === 'string' ? player : player.username;
                  const avatar = typeof player === 'object' ? player.avatar : null;
                  const playerIsHost = typeof player === 'object' ? player.isHost : false;
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
                        className={`font-black px-3 py-2 text-base w-full justify-between border-3 border-neo-black shadow-hard-sm ${
                          playerIsHost ? "bg-neo-yellow text-neo-black" : "bg-neo-cream text-neo-black"
                        }`}
                        style={avatar?.color && !playerIsHost ? { backgroundColor: avatar.color } : {}}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            profilePictureUrl={avatar?.profilePictureUrl}
                            avatarEmoji={avatar?.emoji}
                            avatarColor={avatar?.color}
                            size="sm"
                          />
                          {playerIsHost && <FaCrown className="text-neo-black" />}
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
              </AnimatePresence>
            </div>
            {playersReady.length === 0 && (
              <p className="text-sm text-center text-neo-cream/60 font-bold mt-2">
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
                  // Loading skeleton
                  <div className="w-full aspect-square grid grid-cols-4 gap-2 p-4">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="aspect-square rounded-lg bg-slate-700/50"
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
              username={isHost ? "Host" : username}
              isHost={isHost}
              gameCode={gameCode}
              className="h-full min-h-[400px]"
            />
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-2">
              <FaQrcode />
              {t(isHost ? 'hostView.qrCode' : 'joinView.qrCodeTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {gameCode}
            </h4>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400">
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
