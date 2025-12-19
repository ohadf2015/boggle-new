import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaCrown, FaRobot } from 'react-icons/fa';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import RoomChat from '../../components/RoomChat';
import Avatar from '../../components/Avatar';
import SlotMachineText from '../../components/SlotMachineText';
import ExitRoomButton from '../../components/ExitRoomButton';
import type { Avatar as AvatarType } from '@/shared/types/game';

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
  isHost?: boolean;
  isBot?: boolean;
}

interface ValidationStage {
  key: string;
  icon: string;
}

interface PlayerWaitingResultsViewProps {
  username: string;
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';
  leaderboard: LeaderboardEntry[];
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  onExitRoom: () => void;
  onConfirmExit: () => void;
  foundWords?: FoundWord[] | string[]; // Words found by the player for validation display
  isHost?: boolean; // Whether this is being shown to the host
}

// ==================== Component ====================

const PlayerWaitingResultsView: React.FC<PlayerWaitingResultsViewProps> = ({
  username,
  gameCode,
  t,
  dir,
  leaderboard,
  showExitConfirm,
  setShowExitConfirm,
  onExitRoom,
  onConfirmExit,
  foundWords = [], // Words found by the player for validation display
  isHost = false, // Whether this is being shown to the host
}): React.ReactElement => {
  // Stage of the validation process - cycles through stages
  const [stage, setStage] = useState<number>(0);
  // Current word being "validated"
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  // Simulated progress percentage
  const [progress, setProgress] = useState<number>(0);
  // Track which players have already been animated to prevent re-animations
  const animatedPlayersRef = useRef<Set<string>>(new Set());

  // Validation stages with messages
  const validationStages = useMemo<ValidationStage[]>(() => [
    { key: 'scanning', icon: '🔍' },
    { key: 'checking', icon: '📚' },
    { key: 'verifying', icon: '🤖' },
    { key: 'scoring', icon: '⚡' },
    { key: 'finalizing', icon: '✨' },
  ], []);

  // Get safe words list (extract word string from object if needed)
  const words = useMemo<string[]>(() => {
    if (!foundWords || foundWords.length === 0) return [];
    return foundWords.slice(0, 15).map(w => typeof w === 'string' ? w : (w as FoundWord).word).filter(Boolean);
  }, [foundWords]);

  // Cycle through validation stages
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStage(prev => (prev + 1) % validationStages.length);
    }, 2000); // Faster cycling for snappier feel
    return () => clearInterval(stageInterval);
  }, [validationStages.length]);

  // Cycle through words being validated
  useEffect(() => {
    if (words.length === 0) return;
    const wordInterval = setInterval(() => {
      setCurrentWordIndex(prev => (prev + 1) % words.length);
    }, 800);
    return () => clearInterval(wordInterval);
  }, [words.length]);

  // Simulate progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 30 + Math.random() * 30;
        return Math.min(95, prev + Math.random() * 15);
      });
    }, 600);
    return () => clearInterval(progressInterval);
  }, []);

  const currentStage = validationStages[stage] ?? validationStages[0]!;
  const currentWord = words[currentWordIndex];

  return (
    <div className="min-h-screen bg-neo-cream dark:bg-slate-900 p-3 sm:p-4 md:p-8 flex flex-col transition-colors duration-300">

      {/* Exit Button */}
      <div className="w-full max-w-6xl mx-auto flex justify-end mb-4 relative z-50">
        <ExitRoomButton onClick={onExitRoom} label={isHost ? t('hostView.exitRoom') : t('playerView.exit')} />
      </div>

      {/* Centered Content - responsive grid on large screens */}
      <div className="flex-1 flex items-start lg:items-center justify-center py-4">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 xl:gap-8">
          {/* Left column: Validation status + Leaderboard */}
          <div className="space-y-4 sm:space-y-6">
            {/* Waiting for Results Message - Fixed height container to prevent CLS */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="bg-neo-yellow border-4 border-neo-black shadow-hard-lg p-4 sm:p-6 lg:p-8">
                {/* Brain/Processing Animation - Static container, opacity-only animation to prevent CLS */}
                <div className="mb-4 lg:mb-6 h-[60px] lg:h-[80px] flex items-center justify-center">
                  <div className="inline-block bg-neo-pink border-4 border-neo-black shadow-hard p-3 lg:p-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={stage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-3xl lg:text-4xl"
                      >
                        {currentStage.icon}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Main status message - Fixed height to prevent CLS, opacity-only animation */}
                <div className="bg-neo-black text-neo-white px-4 lg:px-6 py-3 lg:py-4 font-black uppercase text-lg lg:text-xl xl:text-2xl tracking-wider shadow-hard border-4 border-neo-black mb-3 lg:mb-4 min-h-[50px] lg:min-h-[70px] flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center gap-3"
                    >
                      <span>{t(`playerView.validation.${currentStage.key}`) || currentStage.key}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Progress bar - Visual feedback */}
                <div className="relative h-3 lg:h-4 bg-neo-cream border-3 border-neo-black overflow-hidden mb-3 lg:mb-4">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-neo-cyan"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                  {/* Animated stripes */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
                      animation: 'stripe-move 1s linear infinite',
                    }}
                  />
                </div>

                {/* Current word being validated - Fixed height container, opacity-only animation */}
                {words.length > 0 && (
                  <div className="flex items-center justify-center gap-2 h-[36px] lg:h-[40px]">
                    <span className="text-neo-black font-bold text-xs lg:text-sm uppercase tracking-wide">
                      {t('playerView.validatingWord') || 'Checking:'}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentWord}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-neo-purple text-neo-white px-2 lg:px-3 py-1 font-black text-base lg:text-lg uppercase border-3 border-neo-black shadow-hard-sm"
                      >
                        {currentWord}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}

                {/* Processing indicators - Opacity-only animation to prevent layout shift */}
                <div className="flex gap-2 lg:gap-3 mt-3 lg:mt-4 justify-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: 'easeInOut',
                      }}
                      className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-neo-black rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="bg-neo-cream border-4 border-neo-black shadow-hard-lg overflow-hidden">
                  <div className="py-2 lg:py-3 px-3 lg:px-4 border-b-4 border-neo-black bg-neo-purple">
                    <h3 className="flex items-center gap-2 text-neo-white text-lg lg:text-xl uppercase tracking-wider font-black">
                      <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
                      {t('playerView.leaderboard')}
                    </h3>
                  </div>
                  <div className="p-2 lg:p-3 space-y-2 max-h-[200px] sm:max-h-[250px] lg:max-h-[350px] xl:max-h-[400px] overflow-y-auto">
                    {leaderboard.map((player, index) => {
                      const isMe = player.username === username;
                      // Track if this player has already been animated
                      const isNewPlayer = !animatedPlayersRef.current.has(player.username);
                      if (isNewPlayer) {
                        animatedPlayersRef.current.add(player.username);
                      }
                      const getRankStyle = (): string => {
                        if (index === 0) return 'bg-neo-yellow text-neo-black';
                        if (index === 1) return 'bg-slate-300 text-neo-black';
                        if (index === 2) return 'bg-neo-orange text-neo-black';
                        return 'bg-neo-cream text-neo-black border-neo-black border-3';
                      };
                      return (
                        <motion.div
                          key={player.username}
                          initial={isNewPlayer ? { opacity: 0 } : false}
                          animate={{ opacity: 1 }}
                          transition={{
                            opacity: isNewPlayer ? { duration: 0.3, delay: index * 0.05 } : { duration: 0 }
                          }}
                          className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-neo border-3 border-neo-black shadow-hard-sm transition-colors
                            hover:brightness-110
                            ${getRankStyle()} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                        >
                          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-neo flex items-center justify-center font-black text-sm lg:text-lg bg-neo-black text-neo-white border-2 border-neo-black">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <Avatar
                            profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
                            avatarEmoji={player.avatar?.emoji}
                            avatarColor={player.avatar?.color}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`font-black flex items-center gap-1 lg:gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <span className="truncate"><SlotMachineText text={player.username} /></span>
                              {player.isHost && <FaCrown className="text-neo-yellow text-xs lg:text-sm flex-shrink-0" style={{ filter: 'drop-shadow(1px 1px 0px var(--neo-black))' }} />}
                              {player.isBot && <FaRobot className="text-neo-cyan text-xs lg:text-sm flex-shrink-0" />}
                              {isMe && (
                                <span className="text-[10px] lg:text-xs bg-neo-black text-neo-white px-1.5 lg:px-2 py-0.5 rounded-neo font-bold border-2 border-neo-black flex-shrink-0">
                                  ({t('playerView.me')})
                                </span>
                              )}
                            </div>
                            <div className="text-xs lg:text-sm font-bold opacity-75">{player.wordCount} {t('playerView.wordCount')}</div>
                          </div>
                          <div className="text-xl lg:text-2xl font-black flex-shrink-0">
                            {player.score}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right column: Chat Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="lg:h-full"
          >
            <RoomChat
              username={username}
              isHost={isHost}
              gameCode={gameCode}
              className="min-h-[250px] lg:min-h-[400px] xl:min-h-[500px] lg:h-full"
            />
          </motion.div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('playerView.exitConfirmation') || 'Exit Room?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {isHost
                ? (t('hostView.exitWarning') || 'Are you sure you want to exit? This will close the room for all players.')
                : t('playerView.exitWarning')}
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

      {/* CSS for stripe animation */}
      <style jsx>{`
        @keyframes stripe-move {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
      `}</style>
    </div>
  );
};

export default PlayerWaitingResultsView;
