import React, { useRef, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaRandom } from 'react-icons/fa';
import type { Socket } from 'socket.io-client';
import { Button } from '../../components/ui/button';
import ExitRoomButton from '../../components/ExitRoomButton';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import GridComponent from '../../components/GridComponent';
import CircularTimer from '../../components/CircularTimer';
import RoomChat from '../../components/RoomChat';
import TournamentStandings from '../../components/TournamentStandings';
import Avatar from '../../components/Avatar';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { wordErrorToast } from '../../components/NeoToast';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { validateWordLocally, couldBeOnBoard } from '../../utils/clientWordValidator';
import type { LetterGrid, Language, Avatar as AvatarType, TournamentStanding } from '@/shared/types/game';

// ==================== Type Definitions ====================

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: AvatarType;
}

interface TournamentData {
  name?: string;
  currentRound?: number;
  totalRounds?: number;
  status?: 'created' | 'in-progress' | 'completed' | 'cancelled';
}

interface PlayerInGameViewProps {
  // Core props
  username: string;
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';
  socket: Socket | null;

  // Game state
  letterGrid: LetterGrid | null;
  shufflingGrid: LetterGrid | null;
  gameActive: boolean;
  showStartAnimation: boolean;
  remainingTime: number | null;
  gameLanguage: Language | null;
  minWordLength: number;
  comboLevel: number;
  comboLevelRef: React.MutableRefObject<number>;

  // Player data
  foundWords: FoundWord[];
  leaderboard: LeaderboardEntry[];

  // Tournament
  tournamentData: TournamentData | null;
  tournamentStandings: TournamentStanding[];
  showTournamentStandings: boolean;
  setShowTournamentStandings: (show: boolean) => void;

  // UI state
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;

  // Callbacks
  onExitRoom: () => void;
  onConfirmExit: () => void;
  onWordSubmit: (word: string) => void;
  setWord: (word: string) => void;
}

// ==================== Component ====================

/**
 * PlayerInGameView - Main game view for players during active gameplay
 * Memoized to prevent unnecessary re-renders when parent state changes
 */
const PlayerInGameView = memo<PlayerInGameViewProps>(({
  // Core props
  username,
  gameCode,
  t,
  dir,
  socket,

  // Game state
  letterGrid,
  shufflingGrid,
  gameActive,
  showStartAnimation,
  remainingTime,
  gameLanguage,
  minWordLength,
  comboLevel,
  comboLevelRef,

  // Player data
  foundWords,
  leaderboard,

  // Tournament
  tournamentData,
  tournamentStandings,
  showTournamentStandings,
  setShowTournamentStandings,

  // UI state
  showExitConfirm,
  setShowExitConfirm,

  // Callbacks
  onExitRoom,
  onConfirmExit,
  onWordSubmit,
  setWord,
}): React.ReactElement => {
  const wordListRef = useRef<HTMLDivElement | null>(null);
  const { playWordAcceptedSound } = useSoundEffects();

  // Memoized handler for closing tournament standings
  const handleCloseTournamentStandings = useCallback(() => {
    setShowTournamentStandings(false);
  }, [setShowTournamentStandings]);

  const handleGridWordSubmit = (formedWord: string): void => {
    const currentLang = gameLanguage;
    if (!currentLang) return;

    // Client-side validation for immediate error feedback (saves server round-trip)
    const validation = validateWordLocally(formedWord, currentLang, minWordLength, foundWords);

    if (!validation.isValid) {
      // Show error toast immediately - don't submit to server
      let msg: string;
      if (validation.errorKey === 'playerView.wordTooShortMin') {
        msg = t('playerView.wordTooShortMin')
          ? t('playerView.wordTooShortMin').replace('${min}', String(validation.errorParams?.min || minWordLength))
          : `Word too short! (min ${validation.errorParams?.min || minWordLength} letters)`;
      } else {
        const errorKey = validation.errorKey ?? 'Invalid word';
        msg = t(errorKey) || errorKey;
      }
      wordErrorToast(msg, { duration: 1000 });
      setWord('');
      return;
    }

    // Additional check: can the word possibly be on the board?
    if (!couldBeOnBoard(formedWord, letterGrid, currentLang)) {
      wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 1500 });
      setWord('');
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

    // Add to local found words list (will be updated by server response)
    onWordSubmit(formedWord);
    setWord('');
  };

  // Memoize rank style function - prevents recreation on each render
  const getRankStyle = useCallback((index: number): string => {
    if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
    if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
    if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
    return 'bg-neo-cream text-neo-black border-neo-black';
  }, []);

  // Memoize leaderboard items to prevent re-rendering when other props change
  const memoizedLeaderboard = useMemo(() => leaderboard.map((player, index) => ({
    ...player,
    rankStyle: getRankStyle(index),
    isMe: player.username === username,
    rankDisplay: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
  })), [leaderboard, username, getRankStyle]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-0 md:p-4 flex flex-col transition-colors duration-300">

      {/* Top Bar */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-1">
        <ExitRoomButton onClick={onExitRoom} label={t('playerView.exit')} className="relative z-50" />
      </div>

      {/* Timer */}
      {remainingTime !== null && gameActive && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center mb-1 md:mb-2 relative z-10"
        >
          <CircularTimer remainingTime={remainingTime} totalTime={180} />
        </motion.div>
      )}

      {/* Tournament Progress Banner */}
      {tournamentData && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto mb-2"
        >
          <Card className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 dark:from-purple-700/90 dark:to-pink-700/90 backdrop-blur-md border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <CardContent className="py-2 px-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FaTrophy className="text-yellow-300 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <div>
                    <div className="text-white font-bold text-sm md:text-base">
                      {tournamentData.name || t('hostView.tournament')}
                    </div>
                    <div className="text-purple-100 text-xs md:text-sm">
                      {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} / {tournamentData.totalRounds || 3}
                    </div>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
                  {t('hostView.tournamentProgress')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 3 Column Layout */}
      <div className="flex flex-col lg:flex-row gap-0 md:gap-2 max-w-7xl mx-auto flex-grow w-full overflow-hidden">
        {/* Left Column: Found Words */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2 min-h-0">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[60vh] overflow-hidden"
            style={{ transform: 'rotate(1deg)' }}
          >
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan">
              <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
                {t('playerView.wordsFound')}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              <div className="space-y-2" ref={wordListRef}>
                <AnimatePresence>
                  {foundWords.map((foundWordObj, index) => {
                    const wordText = foundWordObj.word;
                    const isInvalid = foundWordObj.isValid === false;
                    const isLatest = index === foundWords.length - 1;
                    return (
                      <motion.div
                        key={`${wordText}-${foundWordObj.timestamp || index}`}
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all
                          ${isInvalid
                            ? 'bg-neo-red text-neo-cream shadow-hard-sm line-through opacity-70'
                            : isLatest
                              ? 'bg-neo-yellow text-neo-black shadow-hard'
                              : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'}`}
                      >
                        {applyHebrewFinalLetters(wordText).toUpperCase()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {foundWords.length === 0 && gameActive && (
                  <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                    {t('playerView.noWordsYet') || 'No words found yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Letter Grid */}
        <div className="flex-1 flex flex-col gap-0 md:gap-2 min-w-0 min-h-0">
          <Card className="bg-slate-900 dark:bg-slate-900 backdrop-blur-md border-0 md:border border-cyan-500/40 shadow-none md:shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
            <CardContent className="flex-grow flex flex-col items-center justify-center p-1 md:p-2 bg-slate-900">
              {(letterGrid || shufflingGrid) ? (
                <>
                  <GridComponent
                    key={letterGrid ? 'game-grid' : 'waiting-grid'}
                    grid={(letterGrid || shufflingGrid)!}
                    interactive={gameActive && !showStartAnimation}
                    animateOnMount={!!letterGrid}
                    onWordSubmit={handleGridWordSubmit}
                    comboLevel={comboLevel}
                  />

                  {!gameActive && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600"
                        disabled
                      >
                        <FaRandom className="mr-2" />
                        {t('playerView.shuffle') || 'SHUFFLE'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full max-w-full md:max-w-2xl aspect-square grid grid-cols-4 gap-1 sm:gap-3 p-0 sm:p-4">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="aspect-square rounded-xl bg-slate-700/50"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile: Word count display */}
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-3">
                <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                  {foundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('playerView.swipeToFormWords') || 'Swipe on the board to form words'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Live Ranking */}
        <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow"
            style={{ transform: 'rotate(-1deg)' }}
          >
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
              <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
                <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
                {t('playerView.leaderboard')}
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              <div className="space-y-2">
                {memoizedLeaderboard.map((player, index) => (
                    <motion.div
                      key={player.username}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
                        hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                        ${player.rankStyle} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
                        {player.rankDisplay}
                      </div>
                      <Avatar
                        profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
                        avatarEmoji={player.avatar?.emoji}
                        avatarColor={player.avatar?.color}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-black truncate text-base flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <span>{player.username}</span>
                          {player.isMe && (
                            <span className="text-xs bg-neo-black text-neo-cream px-2 py-0.5 rounded-neo font-bold">
                              ({t('playerView.me')})
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold">{player.score} pts</div>
                      </div>
                    </motion.div>
                  ))}
                {leaderboard.length === 0 && (
                  <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                    {t('playerView.noPlayersYet') || 'No players yet'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat - Desktop only */}
          <div className="hidden lg:block">
            <RoomChat
              username={username}
              isHost={false}
              gameCode={gameCode}
              className="max-h-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Tournament Standings Modal */}
      <Dialog open={showTournamentStandings} onOpenChange={setShowTournamentStandings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
              {tournamentData?.status === 'completed' ? t('hostView.tournamentComplete') : t('hostView.tournamentStandings')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TournamentStandings
              standings={tournamentStandings}
              currentRound={tournamentData?.currentRound ?? 0}
              totalRounds={tournamentData?.totalRounds ?? 0}
              isComplete={tournamentData?.status === 'completed'}
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseTournamentStandings}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('playerView.exitConfirmation')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {t('playerView.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmExit}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

// Display name for debugging
PlayerInGameView.displayName = 'PlayerInGameView';

export default PlayerInGameView;
