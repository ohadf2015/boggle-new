import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaCrown } from 'react-icons/fa';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import GridComponent from '../../components/GridComponent';
import CircularTimer from '../../components/CircularTimer';
import RoomChat from '../../components/RoomChat';
import Avatar from '../../components/Avatar';
import PresenceIndicator from '../../components/PresenceIndicator';
import { wordErrorToast } from '../../components/NeoToast';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { validateWordLocally, couldBeOnBoard } from '../../utils/clientWordValidator';
import type { Socket } from 'socket.io-client';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

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

interface FoundWord {
  word: string;
  isValid: boolean;
}

interface HostInGameViewProps {
  // Core props
  gameCode: string;
  username: string;
  roomLanguage: Language;
  t: (path: string, params?: Record<string, string | number>) => string;

  // Game state
  tableData: LetterGrid;
  remainingTime: number | null;
  timerValue: number;
  minWordLength: number;
  comboLevel: number;
  comboLevelRef: React.MutableRefObject<number>;

  // Host playing state
  hostPlaying: boolean;
  showStartAnimation: boolean;
  hostFoundWords: string[];
  onWordSubmit: (word: string) => void;

  // Players
  playersReady: (string | PlayerData)[];
  playerScores: Record<string, number>;
  playerWordCounts: Record<string, number>;

  // Actions
  onStopGame: () => void;
  socket: Socket | null;
}

// ==================== Component ====================

const HostInGameView: React.FC<HostInGameViewProps> = ({
  // Core props
  gameCode,
  username,
  roomLanguage,
  t,

  // Game state
  tableData,
  remainingTime,
  timerValue,
  minWordLength,
  comboLevel,
  comboLevelRef,

  // Host playing state
  hostPlaying,
  showStartAnimation,
  hostFoundWords,
  onWordSubmit,

  // Players
  playersReady,
  playerScores,
  playerWordCounts,

  // Actions
  onStopGame,
  socket,
}): React.ReactElement => {
  const { playWordAcceptedSound } = useSoundEffects();

  const handleWordSubmit = (formedWord: string): void => {
    if (!hostPlaying) return;

    // Convert hostFoundWords to the expected format for validation
    const foundWordsForValidation: FoundWord[] = hostFoundWords.map(w =>
      typeof w === 'string' ? { word: w, isValid: true } : w as FoundWord
    );

    // Client-side validation for immediate error feedback (saves server round-trip)
    const validation = validateWordLocally(formedWord, roomLanguage, minWordLength, foundWordsForValidation);

    if (!validation.isValid) {
      let msg: string;
      if (validation.errorKey === 'playerView.wordTooShortMin') {
        msg = t('playerView.wordTooShortMin')
          ? t('playerView.wordTooShortMin').replace('${min}', String(validation.errorParams?.min || minWordLength))
          : `Word too short! (min ${validation.errorParams?.min || minWordLength} letters)`;
      } else if (validation.errorKey === 'playerView.wordTooShort') {
        msg = t('playerView.wordTooShort') || 'Word too short';
      } else {
        const errorKey = validation.errorKey ?? 'Invalid word';
        msg = t(errorKey) || errorKey;
      }
      wordErrorToast(msg, { duration: 1000 });
      return;
    }

    // Additional check: can the word possibly be on the board?
    if (!couldBeOnBoard(formedWord, tableData, roomLanguage)) {
      wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 1500 });
      return;
    }

    // Play sound immediately (optimistic) - toasts/combo handled by server response
    playWordAcceptedSound();

    // Submit to server for actual validation
    if (!socket) return;
    socket.emit('submitWord', {
      word: formedWord.toLowerCase(),
      comboLevel: comboLevelRef.current,
    });

    // Add to local found words list
    onWordSubmit(formedWord);
  };

  // Get sorted players for leaderboard
  const sortedPlayers = [...playersReady].map(player => {
    const playerUsername = typeof player === 'string' ? player : player.username;
    const avatar = typeof player === 'object' ? player.avatar : null;
    const isHostPlayer = typeof player === 'object' ? player.isHost : false;
    const presenceStatus = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
    const isWindowFocused = typeof player === 'object' ? player.isWindowFocused : true;
    return {
      username: playerUsername,
      score: playerScores[playerUsername] || 0,
      wordCount: playerWordCounts[playerUsername] || 0,
      avatar,
      isHost: isHostPlayer,
      presenceStatus,
      isWindowFocused,
    };
  }).sort((a, b) => b.score - a.score);

  const getRankStyle = (index: number): string => {
    if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
    if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
    if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
    return 'bg-neo-cream text-neo-black border-neo-black';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-1 md:gap-2 flex-grow w-full overflow-hidden transition-all duration-500 ease-in-out">
      {/* Left Column: Found Words (only when host is playing) */}
      {hostPlaying && (
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2 min-h-0">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[60vh] overflow-hidden"
            style={{ transform: 'rotate(1deg)' }}
          >
            {/* Header */}
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan">
              <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
                {t('playerView.wordsFound')}
              </h3>
            </div>
            {/* Content with fixed height */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              <div className="space-y-2">
                <AnimatePresence>
                  {hostFoundWords.map((foundWord, index) => {
                    const isLatest = index === hostFoundWords.length - 1;
                    return (
                      <motion.div
                        key={`${foundWord}-${index}`}
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all
                          ${isLatest
                            ? 'bg-neo-yellow text-neo-black shadow-hard'
                            : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'}`}
                      >
                        {applyHebrewFinalLetters(foundWord).toUpperCase()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {hostFoundWords.length === 0 && (
                  <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                    {t('playerView.noWordsYet') || 'No words found yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Center Column: Letter Grid */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
        {/* Timer with Circular Progress */}
        {remainingTime !== null && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center mb-1 md:mb-2 relative z-10"
          >
            <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} />
          </motion.div>
        )}

        <Card className="bg-slate-900 dark:bg-slate-900 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
          <CardContent className="flex-grow flex flex-col items-center justify-center p-1 md:p-2 bg-slate-900">
            <GridComponent
              key={hostPlaying ? 'host-playing-grid' : 'host-spectating-grid'}
              grid={tableData}
              interactive={hostPlaying && !showStartAnimation}
              animateOnMount={true}
              onWordSubmit={handleWordSubmit}
              comboLevel={comboLevel}
            />
          </CardContent>
        </Card>

        {/* Mobile: Word count display (when host is playing) */}
        {hostPlaying && (
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-3">
                <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                  {hostFoundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('playerView.swipeToFormWords') || 'Swipe on the board to form words'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Right Column: Live Leaderboard */}
      <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
        <div
          className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow"
          style={{ transform: 'rotate(-1deg)' }}
        >
          {/* Header */}
          <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
            <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
              <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
              {t('playerView.leaderboard')}
            </h3>
          </div>
          {/* Content */}
          <div className="overflow-y-auto flex-1 p-3">
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <motion.div
                  key={player.username}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
                    hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                    ${getRankStyle(index)}`}
                >
                  <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <Avatar
                    profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
                    avatarEmoji={player.avatar?.emoji}
                    avatarColor={player.avatar?.color}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-black truncate text-sm flex items-center gap-1">
                      {player.isHost && <FaCrown className="text-neo-yellow" style={{ filter: 'drop-shadow(1px 1px 0px var(--neo-black))' }} />}
                      <span>{player.username}</span>
                    </div>
                    <div className="text-xs font-bold">{player.wordCount} {t('hostView.words') || 'words'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.username !== username && (
                      <PresenceIndicator
                        status={player.presenceStatus}
                        isWindowFocused={player.isWindowFocused}
                        size="lg"
                      />
                    )}
                    <div className="text-lg font-black">
                      {player.score} <span className="text-xs font-bold">pts</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {playersReady.length === 0 && (
                <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                  {t('hostView.waitingForPlayers')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chat Component - Desktop only */}
        <div className="hidden lg:block">
          <RoomChat
            username="Host"
            isHost={true}
            gameCode={gameCode}
            className="max-h-[200px]"
          />
        </div>
      </div>
    </div>
  );
};

export default HostInGameView;
