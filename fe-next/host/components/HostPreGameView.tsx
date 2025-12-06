import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClock, FaUsers, FaQrcode, FaWhatsapp, FaLink, FaCog, FaPlus, FaMinus, FaCrown, FaChevronDown, FaChevronUp, FaTrophy, FaRobot } from 'react-icons/fa';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import SlotMachineGrid from '../../components/SlotMachineGrid';
import ShareButton from '../../components/ShareButton';
import SlotMachineText from '../../components/SlotMachineText';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import GameTypeSelector from '../../components/GameTypeSelector';
import PresenceIndicator from '../../components/PresenceIndicator';
import BotControls from '../../components/BotControls';
import { copyJoinUrl, shareViaWhatsApp } from '../../utils/share';
import { DIFFICULTIES, MIN_WORD_LENGTH_OPTIONS, getRecommendedTimer } from '../../utils/consts';
import { cn } from '../../lib/utils';
import { useSocket } from '../../utils/SocketContext';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus, DifficultyLevel } from '@/shared/types/game';

// ==================== Types ====================

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
}

interface GridPosition {
  row: number;
  col: number;
}

interface HostPreGameViewProps {
  // Core props
  gameCode: string;
  roomLanguage: Language;
  language: Language;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;

  // Game settings
  timerValue: number;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  timerDirection: number;
  setTimerDirection: React.Dispatch<React.SetStateAction<number>>;
  difficulty: DifficultyLevel;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;
  minWordLength: number;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  gameType: 'regular' | 'tournament';
  setGameType: React.Dispatch<React.SetStateAction<'regular' | 'tournament'>>;
  tournamentRounds: number;
  setTournamentRounds: React.Dispatch<React.SetStateAction<number>>;
  tournamentData: TournamentData | null;
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  // Players
  playersReady: (string | PlayerData)[];
  playerWordCounts: Record<string, number>;

  // Grid display
  shufflingGrid: LetterGrid | null;
  highlightedCells: GridPosition[];
  tableData: LetterGrid;

  // Actions
  onStartGame: () => void;
  onShowQR: () => void;
  onExitRoom: () => void;
  onCancelTournament: () => void;

  // Loading states
  tournamentCreating: boolean;
}

// ==================== Component ====================

const HostPreGameView: React.FC<HostPreGameViewProps> = ({
  // Core props
  gameCode,
  roomLanguage,
  language,
  username,
  t,

  // Game settings
  timerValue,
  setTimerValue,
  timerDirection,
  setTimerDirection,
  difficulty,
  setDifficulty,
  minWordLength,
  setMinWordLength,
  gameType,
  setGameType,
  tournamentRounds,
  setTournamentRounds,
  tournamentData,
  hostPlaying,
  setHostPlaying,

  // Players
  playersReady,
  playerWordCounts,

  // Grid display
  shufflingGrid,
  highlightedCells,
  tableData,

  // Actions
  onStartGame,
  onShowQR,
  onExitRoom,
  onCancelTournament,

  // Loading states
  tournamentCreating,
}): React.ReactElement => {
  const { socket } = useSocket();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Memoized handlers
  const handleCopyLink = useCallback(() => {
    copyJoinUrl(gameCode, t);
  }, [gameCode, t]);

  const handleShareWhatsApp = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

  const handleDecreaseTimer = useCallback(() => {
    setTimerDirection(-1);
    setTimerValue(prev => Math.max(1, prev - 1));
  }, [setTimerDirection, setTimerValue]);

  const handleIncreaseTimer = useCallback(() => {
    setTimerDirection(1);
    setTimerValue(prev => Math.min(10, prev + 1));
  }, [setTimerDirection, setTimerValue]);

  const handleToggleAdvancedSettings = useCallback(() => {
    setShowAdvancedSettings(prev => !prev);
  }, []);

  const handleSetDifficulty = useCallback((key: DifficultyLevel) => {
    setDifficulty(key);
    // Auto-adjust timer to recommended value for this difficulty
    const recommendedSeconds = getRecommendedTimer(key);
    const recommendedMinutes = Math.round(recommendedSeconds / 60);
    setTimerValue(recommendedMinutes);
    setTimerDirection(0); // Reset animation direction
  }, [setDifficulty, setTimerValue, setTimerDirection]);

  const handleSetMinWordLength = useCallback((value: number) => {
    setMinWordLength(value);
  }, [setMinWordLength]);

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
              <Badge className="text-base sm:text-lg px-3 py-1 bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
                {roomLanguage === 'he' ? '🇮🇱 עברית' : roomLanguage === 'sv' ? '🇸🇪 Svenska' : roomLanguage === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
              </Badge>
              {tournamentData && (
                <Badge className="text-sm px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0">
                  <FaTrophy className="mr-1" />
                  {t('hostView.tournamentMode')} - {t('hostView.tournamentRound')} {tournamentData.currentRound}/{tournamentData.totalRounds}
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
              onClick={onShowQR}
              icon={<FaQrcode />}
            >
              {t('hostView.qrCode')}
            </ShareButton>
          </div>
        </div>
      </Card>

      {/* Row 2: Game Settings + Players List (side by side on desktop) */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4 md:gap-6">
        {/* Game Settings - LEFT - Neo-Brutalist Dark */}
        <Card className="flex-1 p-3 sm:p-4 md:p-5 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
          <h3 className="text-base font-black uppercase text-neo-cream mb-4 flex items-center gap-2">
            <FaCog className="text-neo-cyan text-sm" />
            {t('hostView.gameSettings')}
          </h3>
          <div className="w-full space-y-3 sm:space-y-4">
            {/* Timer Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase text-neo-cream flex items-center gap-2">
                <FaClock className="text-neo-cyan text-sm" />
                {t('hostView.roundDuration')}
              </label>
              <div className="flex items-center gap-3">
                {/* Minus Button */}
                <button
                  type="button"
                  onClick={handleDecreaseTimer}
                  disabled={timerValue <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                >
                  <FaMinus size={14} />
                </button>

                <div className="flex items-center gap-2">
                  <div className="text-3xl font-black text-neo-yellow w-12 text-center overflow-hidden h-10 flex items-center justify-center">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={timerValue}
                        initial={{ y: timerDirection > 0 ? 20 : -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: timerDirection > 0 ? -20 : 20, opacity: 0 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                      >
                        {timerValue}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <span className="text-base text-neo-cream font-bold">{t('hostView.minutes')}</span>
                </div>

                {/* Plus Button */}
                <button
                  type="button"
                  onClick={handleIncreaseTimer}
                  disabled={timerValue >= 10}
                  className="w-10 h-10 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                >
                  <FaPlus size={14} />
                </button>
              </div>
            </div>

            {/* Game Type Selector */}
            <GameTypeSelector
              gameType={gameType}
              setGameType={setGameType}
              tournamentRounds={tournamentRounds}
              setTournamentRounds={setTournamentRounds}
            />

            {/* Bot Controls - Always visible */}
            <div className="pt-2 border-t border-neo-cream/20">
              <BotControls
                socket={socket}
                gameCode={gameCode}
                players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
                disabled={false}
              />
            </div>

            {/* Advanced Settings Toggle */}
            <button
              type="button"
              onClick={handleToggleAdvancedSettings}
              className="w-full flex items-center justify-between py-2 text-neo-cream/70 hover:text-neo-cream transition-colors duration-100"
            >
              <span className="text-sm font-bold uppercase">
                {t('hostView.advancedSettings')}
              </span>
              {showAdvancedSettings ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {/* Collapsible Advanced Settings */}
            <AnimatePresence>
              {showAdvancedSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden space-y-4"
                >
                  {/* Host Play Option */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hostPlays"
                      checked={hostPlaying}
                      onCheckedChange={(checked) => setHostPlaying(checked === true)}
                    />
                    <label htmlFor="hostPlays" className="text-sm font-bold text-neo-cream cursor-pointer">
                      {t('hostView.hostPlays')}
                    </label>
                  </div>

                  {/* Cancel Tournament Button - Only show if tournament has started */}
                  {tournamentData && (
                    <Button
                      onClick={onCancelTournament}
                      className="w-full bg-neo-red text-neo-white text-xs py-2"
                    >
                      {t('hostView.cancelTournament') || 'Cancel Tournament'}
                    </Button>
                  )}

                  {/* Difficulty Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-neo-cream">
                      {t('hostView.difficulty')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map((key) => {
                        const isSelected = difficulty === key;
                        const difficultyColors: Record<string, string> = {
                          easy: 'bg-neo-lime',
                          normal: 'bg-neo-yellow',
                          medium: 'bg-neo-orange',
                          hard: 'bg-neo-red text-neo-white',
                          extreme: 'bg-neo-purple text-neo-white'
                        };
                        return (
                          <motion.button
                            key={key}
                            onClick={() => handleSetDifficulty(key)}
                            whileHover={{ x: -1, y: -1 }}
                            whileTap={{ x: 2, y: 2 }}
                            className={cn(
                              "px-3 py-2 rounded-neo font-bold transition-all duration-100 border-3 border-neo-black",
                              isSelected
                                ? `${difficultyColors[key] || 'bg-neo-cyan'} shadow-none translate-x-[2px] translate-y-[2px]`
                                : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                            )}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-black text-sm">{t(DIFFICULTIES[key].nameKey)}</span>
                              <span className="text-xs font-bold opacity-80">
                                ({DIFFICULTIES[key].rows}x{DIFFICULTIES[key].cols})
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minimum Word Length Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-neo-cream">
                      {t('hostView.minWordLength') || 'Minimum Word Length'}
                    </label>
                    <div className="flex gap-2">
                      {MIN_WORD_LENGTH_OPTIONS.map((option) => {
                        const isSelected = minWordLength === option.value;
                        return (
                          <motion.button
                            key={option.value}
                            onClick={() => handleSetMinWordLength(option.value)}
                            whileHover={{ x: -1, y: -1 }}
                            whileTap={{ x: 2, y: 2 }}
                            className={cn(
                              "px-4 py-2 rounded-neo font-bold transition-all duration-100 border-3 border-neo-black",
                              isSelected
                                ? "bg-neo-cyan text-neo-black shadow-none translate-x-[2px] translate-y-[2px]"
                                : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                            )}
                          >
                            {t(option.labelKey) || `${option.value} letters`}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Start Button */}
            <div className="pt-2 flex justify-center">
              <Button
                onClick={onStartGame}
                disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
                className="w-full max-w-xs h-11 text-base bg-neo-lime text-neo-black"
              >
                {tournamentCreating ? t('hostView.creatingTournament') || 'Creating...' : t('hostView.startGame')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Players List - RIGHT */}
        <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
          <h3 className="text-lg font-black uppercase text-neo-cream mb-4 flex items-center gap-2 flex-shrink-0">
            <FaUsers className="text-neo-pink" />
            {t('hostView.playersJoined')} ({playersReady.length})
          </h3>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
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
                    initial={{ scale: 0, opacity: 0, rotate: -5 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Badge
                      className={cn(
                        "font-black px-3 py-2 text-base w-full justify-between border-3 border-neo-black shadow-hard-sm",
                        isHostPlayer ? "bg-neo-yellow text-neo-black" :
                        isBot ? "bg-neo-cyan/80 text-neo-black" :
                        "bg-neo-cream text-neo-black"
                      )}
                      style={avatar?.color && !isHostPlayer && !isBot ? { backgroundColor: avatar.color } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar
                          profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                          avatarEmoji={avatar?.emoji}
                          avatarColor={avatar?.color}
                          size="sm"
                        />
                        {isHostPlayer && <FaCrown className="text-neo-black" />}
                        {isBot && <FaRobot className="text-neo-black" />}
                        <SlotMachineText text={playerUsername} />
                      </div>
                      <div className="flex items-center gap-2">
                        {playerWordCounts && playerWordCounts[playerUsername] !== undefined && (
                          <span className="bg-neo-black/20 px-2 py-0.5 rounded-neo text-sm font-black">
                            {playerWordCounts[playerUsername] || 0}
                          </span>
                        )}
                        {!isMe && !isBot && (
                          <PresenceIndicator
                            status={presenceStatus}
                            isWindowFocused={isWindowFocused}
                            size="lg"
                          />
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
              <SlotMachineGrid
                grid={shufflingGrid || tableData}
                highlightedCells={highlightedCells}
                language={roomLanguage || language}
                className="w-full h-full"
                animationDuration={600}
                staggerDelay={40}
                animationPattern="cascade"
              />
            </div>
          </div>
        </Card>

        {/* Chat - RIGHT */}
        <div className="lg:w-[350px] xl:w-[400px]">
          <RoomChat
            username="Host"
            isHost={true}
            gameCode={gameCode}
            className="h-full min-h-[400px]"
          />
        </div>
      </div>
    </div>
  );
};

export default HostPreGameView;
