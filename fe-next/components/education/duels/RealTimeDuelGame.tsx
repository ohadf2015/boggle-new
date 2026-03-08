'use client';

/**
 * RealTimeDuelGame - Real-time duel gameplay screen
 *
 * Features:
 * - Waiting phase (before duel:started)
 * - Playing phase (live word finding with frozen board)
 * - Completed phase (results with win/loss/draw)
 * - Live progress bar showing relative scores
 * - Opponent disconnect overlay
 * - Forfeit confirmation dialog
 * - Server-timestamp countdown timer
 * - Real-time word submission with pending→accepted/rejected states
 * - Neo-brutalist styling
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import type {
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  OpponentDisconnectedData,
  DuelCompletedData,
} from '@/hooks/useDuelSocket.types';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import { OpponentProgressBar } from './OpponentProgressBar';
import { DuelDisconnectOverlay } from './DuelDisconnectOverlay';
import { ForfeitConfirmDialog } from './ForfeitConfirmDialog';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface RealTimeDuelGameProps {
  duelId: string;
  studentId: string;
  opponentName: string;
  onBackToLobby?: () => void;
}

type GamePhase = 'waiting' | 'playing' | 'completed';

interface WordStatus {
  word: string;
  status: 'pending' | 'accepted' | 'rejected';
  points?: number;
  reason?: string;
}

// ============================================
// COMPONENT
// ============================================

export function RealTimeDuelGame({
  duelId,
  studentId,
  opponentName,
  onBackToLobby,
}: RealTimeDuelGameProps) {
  const { t } = useLanguage();
  const {
    submitWord,
    forfeitDuel,
    onDuelStarted,
    onWordAccepted,
    onWordRejected,
    onOpponentProgress,
    onOpponentDisconnected,
    onOpponentReconnected,
    onDuelCompleted,
  } = useDuelSocket();

  // State
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [boardState, setBoardState] = useState<string[][]>([]);
  const [startTime, setStartTime] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<number>(180);
  const [timeRemaining, setTimeRemaining] = useState<number>(180);
  const [currentWord, setCurrentWord] = useState('');
  const [words, setWords] = useState<WordStatus[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [myWordCount, setMyWordCount] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentWordCount, setOpponentWordCount] = useState(0);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState(30);
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [result, setResult] = useState<DuelCompletedData | null>(null);

  // ============================================
  // TIMER EFFECT
  // ============================================

  useEffect(() => {
    if (phase !== 'playing' || !startTime) return;

    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, startTime, timeLimit]);

  // ============================================
  // SOCKET EVENT LISTENERS
  // ============================================

  useEffect(() => {
    const cleanupStarted = onDuelStarted((data: DuelStartedData) => {
      setBoardState(data.boardState);
      setStartTime(data.startTime);
      setTimeLimit(data.timeLimit);
      setPhase('playing');
    });

    const cleanupWordAccepted = onWordAccepted((data: WordAcceptedData) => {
      setWords((prev) =>
        prev.map((w) =>
          w.word === data.word && w.status === 'pending'
            ? { ...w, status: 'accepted', points: data.points }
            : w
        )
      );
      setMyScore(data.totalScore);
      setMyWordCount(data.wordCount);
    });

    const cleanupWordRejected = onWordRejected((data: WordRejectedData) => {
      setWords((prev) =>
        prev.map((w) =>
          w.word === data.word && w.status === 'pending'
            ? { ...w, status: 'rejected', reason: data.reason }
            : w
        )
      );
    });

    const cleanupOpponentProgress = onOpponentProgress((data: OpponentProgressData) => {
      setOpponentScore(data.totalScore);
      setOpponentWordCount(data.wordCount);
    });

    const cleanupDisconnected = onOpponentDisconnected((data: OpponentDisconnectedData) => {
      setIsDisconnected(true);
      setGracePeriodSeconds(data.gracePeriodSeconds);
    });

    const cleanupReconnected = onOpponentReconnected(() => {
      setIsDisconnected(false);
    });

    const cleanupCompleted = onDuelCompleted((data: DuelCompletedData) => {
      setResult(data);
      setPhase('completed');
    });

    return () => {
      cleanupStarted();
      cleanupWordAccepted();
      cleanupWordRejected();
      cleanupOpponentProgress();
      cleanupDisconnected();
      cleanupReconnected();
      cleanupCompleted();
    };
  }, [
    onDuelStarted,
    onWordAccepted,
    onWordRejected,
    onOpponentProgress,
    onOpponentDisconnected,
    onOpponentReconnected,
    onDuelCompleted,
  ]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmitWord = useCallback(() => {
    if (!currentWord.trim()) return;

    const word = currentWord.trim().toUpperCase();

    // Check if word already submitted
    if (words.find((w) => w.word === word)) {
      setCurrentWord('');
      return;
    }

    // Add word as pending
    setWords((prev) => [...prev, { word, status: 'pending' }]);
    submitWord(duelId, word);
    setCurrentWord('');
  }, [currentWord, duelId, submitWord, words]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmitWord();
      }
    },
    [handleSubmitWord]
  );

  const handleForfeit = useCallback(() => {
    forfeitDuel(duelId);
    setShowForfeitDialog(false);
  }, [duelId, forfeitDuel]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // WAITING PHASE
  // ============================================

  if (phase === 'waiting') {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        data-testid="realtime-duel-game"
      >
        <Loader size="lg" />
        <p className="ms-4 text-neo-white">{t('duels.waitingForOpponent')}</p>
      </div>
    );
  }

  // ============================================
  // COMPLETED PHASE
  // ============================================

  if (phase === 'completed' && result) {
    const isWinner = result.winnerId === studentId;
    const isDraw = result.winnerId === null;
    const xp = isWinner ? result.xpAwarded.winner : result.xpAwarded.loser;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[500px] text-center p-8"
        data-testid="realtime-duel-game"
      >
        {/* Result Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={cn(
            'mb-6 p-6 rounded-neo border-neo-thick shadow-hard',
            isDraw
              ? 'bg-yellow-500 border-neo-black'
              : isWinner
                ? 'bg-neo-yellow border-neo-black'
                : 'bg-red-500 border-neo-black'
          )}
        >
          {isWinner ? (
            <Trophy className="w-16 h-16 text-neo-black" />
          ) : (
            <Swords className="w-16 h-16 text-neo-white" />
          )}
        </motion.div>

        {/* Result Text */}
        <h2 className="text-4xl font-neo-display font-bold text-neo-white mb-4">
          {isDraw ? t('duels.draw') : isWinner ? t('duels.youWin') : t('duels.youLose')}
        </h2>

        {/* Scores */}
        <div className="flex gap-6 mb-6">
          <div className="text-neo-white">
            <p className="text-sm opacity-70">{t('duels.you')}</p>
            <p className="text-3xl font-bold">{myScore}</p>
          </div>
          <div className="text-neo-white text-3xl">vs</div>
          <div className="text-neo-white">
            <p className="text-sm opacity-70">{opponentName}</p>
            <p className="text-3xl font-bold">{opponentScore}</p>
          </div>
        </div>

        {/* XP Earned */}
        <div className="flex items-center gap-2 mb-8 p-4 bg-neo-navy border-neo rounded-neo shadow-hard">
          <Flame className="w-6 h-6 text-neo-orange" />
          <span className="text-neo-white font-neo-body">
            {t('duels.xpEarned')}: <span className="font-bold text-neo-yellow">{xp}</span>
          </span>
        </div>

        {/* Back Button */}
        <button
          onClick={onBackToLobby}
          className="px-6 py-3 bg-neo-cyan text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
        >
          {t('duels.backToLobby')}
        </button>
      </motion.div>
    );
  }

  // ============================================
  // PLAYING PHASE
  // ============================================

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="realtime-duel-game">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-neo-navy border-neo rounded-neo shadow-hard">
        {/* My Score */}
        <div className="flex items-center gap-2">
          <div className="text-neo-white">
            <p className="text-sm opacity-70">{t('duels.you')}</p>
            <p className="text-2xl font-bold" data-testid="my-score">
              {myScore}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div
          data-testid="duel-timer"
          className={cn(
            'text-3xl font-neo-display font-bold',
            timeRemaining <= 10 ? 'text-red-500' : 'text-neo-white'
          )}
        >
          {formatTime(timeRemaining)}
        </div>

        {/* Opponent Score */}
        <div className="flex items-center gap-2">
          <div className="text-neo-white">
            <p className="text-sm opacity-70">{opponentName}</p>
            <p className="text-2xl font-bold" data-testid="opponent-score">
              {opponentScore}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <OpponentProgressBar
          myScore={myScore}
          opponentScore={opponentScore}
          myName={t('duels.you')}
          opponentName={opponentName}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Board Grid */}
        <div>
          <h2 className="text-lg font-neo-display font-bold text-neo-white mb-4">
            {t('duels.findWords')}
          </h2>
          <div className="grid grid-cols-4 gap-2 p-4 bg-neo-navy border-neo-thick rounded-neo shadow-hard">
            {boardState.flat().map((letter, idx) => (
              <div
                key={idx}
                className="aspect-square flex items-center justify-center bg-neo-yellow text-neo-black font-neo-display font-bold text-2xl rounded-neo border-neo shadow-hard-sm"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Word Input & Found Words */}
        <div>
          <h2 className="text-lg font-neo-display font-bold text-neo-white mb-4">
            {t('duels.typeWord')}
          </h2>

          {/* Input Area */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={currentWord}
              onChange={(e) => setCurrentWord(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('duels.typeWord')}
              data-testid="word-input"
              className="flex-1 px-4 py-2 bg-neo-navy text-neo-white border-neo rounded-neo shadow-hard focus:outline-none focus:ring-2 focus:ring-neo-cyan"
            />
            <button
              onClick={handleSubmitWord}
              disabled={!currentWord.trim()}
              data-testid="submit-word-btn"
              className="px-4 py-2 bg-neo-yellow text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('duels.addWord')}
            </button>
          </div>

          {/* Found Words List */}
          <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-4 mb-4 min-h-[200px] max-h-[300px] overflow-y-auto">
            <AnimatePresence>
              {words.length === 0 ? (
                <p className="text-neo-white/50 text-sm text-center py-8">
                  {t('duels.typeWord')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {words.map((wordStatus, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        'px-3 py-1 font-neo-body font-bold rounded-neo border-neo shadow-hard-sm',
                        wordStatus.status === 'accepted' && 'bg-green-500 text-neo-white',
                        wordStatus.status === 'rejected' && 'bg-red-500 text-neo-white',
                        wordStatus.status === 'pending' && 'bg-neo-navy text-neo-white'
                      )}
                    >
                      {wordStatus.word}
                      {wordStatus.points && ` (+${wordStatus.points})`}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Forfeit Button */}
          <button
            onClick={() => setShowForfeitDialog(true)}
            data-testid="forfeit-btn"
            className="text-neo-white/50 hover:text-neo-white text-sm underline"
          >
            {t('duels.forfeitConfirm')}
          </button>
        </div>
      </div>

      {/* Disconnect Overlay */}
      {isDisconnected && (
        <DuelDisconnectOverlay
          opponentName={opponentName}
          gracePeriodSeconds={gracePeriodSeconds}
        />
      )}

      {/* Forfeit Dialog */}
      <ForfeitConfirmDialog
        open={showForfeitDialog}
        onConfirm={handleForfeit}
        onCancel={() => setShowForfeitDialog(false)}
      />
    </div>
  );
}
