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
import { useInterval } from '@/hooks/useSafeTimeout';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Swords, Trophy, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { useImeText } from '@/hooks/useImeText';
import type {
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  OpponentDisconnectedData,
  DuelCompletedData,
} from '@/hooks/useDuelSocket.types';
import { cn } from '@/lib/utils';
import { awardGameCoins } from '@/utils/coinManager';
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
  opponentId?: string;
  lessonId?: string;
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
  opponentId,
  lessonId,
  onBackToLobby,
}: RealTimeDuelGameProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, playCountdownBeep, setGameActive } = useSoundEffects();
  const {
    socket: duelSocket,
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
  const {
    value: currentWord,
    isEmpty: currentWordEmpty,
    getValue: getCurrentWord,
    reset: resetCurrentWord,
    inputProps: wordInputProps,
  } = useImeText<HTMLInputElement>();
  const [words, setWords] = useState<WordStatus[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [_myWordCount, setMyWordCount] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [_opponentWordCount, setOpponentWordCount] = useState(0);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState(30);
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [result, setResult] = useState<DuelCompletedData | null>(null);

  // ============================================
  // TIMER EFFECT
  // ============================================

  // Enable sound gate during gameplay
  useEffect(() => {
    const isPlaying = phase === 'playing';
    setGameActive(isPlaying);
    return () => setGameActive(false);
  }, [phase, setGameActive]);

  // Countdown beep in last 10 seconds
  useEffect(() => {
    if (phase === 'playing' && timeRemaining <= 10 && timeRemaining > 0) {
      playCountdownBeep(timeRemaining);
    }
  }, [timeRemaining, phase, playCountdownBeep]);

  useInterval(() => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - start) / 1000);
    const remaining = Math.max(0, timeLimit - elapsed);
    setTimeRemaining(remaining);
  }, phase === 'playing' && startTime ? 100 : null);

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
      playWordAcceptedSound();
    });

    const cleanupWordRejected = onWordRejected((data: WordRejectedData) => {
      setWords((prev) =>
        prev.map((w) =>
          w.word === data.word && w.status === 'pending'
            ? { ...w, status: 'rejected', reason: data.reason }
            : w
        )
      );
      playWordRejectedSound();
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
      const isWinner = data.winnerId === studentId;
      const finalScore = isWinner
        ? Math.max(data.challengerScore, data.opponentScore)
        : Math.min(data.challengerScore, data.opponentScore);
      awardGameCoins(duelId, 'multiplayer', finalScore, isWinner ? 1 : 2, 2);
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
    playWordAcceptedSound,
    playWordRejectedSound,
    duelId,
    studentId,
  ]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmitWord = useCallback(() => {
    const raw = getCurrentWord();
    if (!raw) return;

    const word = raw.toUpperCase();

    // Check if word already submitted
    if (words.find((w) => w.word === word)) {
      resetCurrentWord();
      return;
    }

    // Add word as pending
    setWords((prev) => [...prev, { word, status: 'pending' }]);
    submitWord(duelId, word);
    resetCurrentWord();
  }, [getCurrentWord, resetCurrentWord, duelId, submitWord, words]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
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

  const handleRematch = useCallback(() => {
    if (duelSocket && opponentId && lessonId) {
      duelSocket.emit('duel:rematch', { opponentId, lessonId });
    }
  }, [duelSocket, opponentId, lessonId]);

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
      <AdaptiveMotion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[500px] text-center p-8"
        data-testid="realtime-duel-game"
      >
        {/* Result Badge */}
        <AdaptiveMotion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={cn(
            'mb-6 p-6 rounded-neo border-neo-thick shadow-hard',
            isDraw
              ? 'bg-yellow-500 border-neo-black'
              : isWinner
                ? 'bg-neo-lime border-neo-black'
                : 'bg-red-500 border-neo-black'
          )}
        >
          {isWinner ? (
            <Trophy className="w-16 h-16 text-neo-black" />
          ) : (
            <Swords className="w-16 h-16 text-neo-white" />
          )}
        </AdaptiveMotion.div>

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
          <div className="text-neo-white text-3xl">{t('education.duels.vs')}</div>
          <div className="text-neo-white">
            <p className="text-sm opacity-70">{opponentName}</p>
            <p className="text-3xl font-bold">{opponentScore}</p>
          </div>
        </div>

        {/* XP Earned */}
        <div className="flex items-center gap-2 mb-8 p-4 bg-neo-navy border-neo rounded-neo shadow-hard">
          <Flame className="w-6 h-6 text-neo-pink" />
          <span className="text-neo-white font-neo-body">
            {t('duels.xpEarned')}: <span className="font-bold text-neo-lime">{xp}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {opponentId && lessonId && (
            <button
              type="button"
              onClick={handleRematch}
              className="px-6 py-3 bg-neo-pink text-white font-neo-body font-bold rounded-neo border-neo shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              {t('education.duels.rematch')}
            </button>
          )}
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-6 py-3 bg-neo-cyan text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            {t('duels.backToLobby')}
          </button>
        </div>
      </AdaptiveMotion.div>
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
                key={`cell-${idx}-${letter}`}
                className="aspect-square flex items-center justify-center bg-neo-lime text-neo-black font-neo-display font-bold text-2xl rounded-neo border-neo shadow-hard-sm"
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
              {...wordInputProps}
              onKeyDown={handleKeyPress}
              placeholder={t('duels.typeWord')}
              data-testid="word-input"
              className="flex-1 px-4 py-2 bg-neo-navy text-neo-white border-neo rounded-neo shadow-hard focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
            />
            <button
              type="button"
              onClick={handleSubmitWord}
              aria-disabled={currentWordEmpty}
              data-testid="submit-word-btn"
              className={cn(
                'px-4 py-2 bg-neo-lime text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all',
                currentWordEmpty && 'opacity-50 cursor-not-allowed'
              )}
            >
              {t('duels.addWord')}
            </button>
          </div>

          {/* Found Words List */}
          <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-4 mb-4 min-h-[200px] max-h-[300px] overflow-y-auto">
            <AdaptiveAnimatePresence>
              {words.length === 0 ? (
                <p className="text-neo-white text-sm text-center py-8">
                  {t('duels.typeWord')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {words.map((wordStatus, idx) => (
                    <AdaptiveMotion.div
                      key={`word-${idx}-${wordStatus.word}`}
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
                    </AdaptiveMotion.div>
                  ))}
                </div>
              )}
            </AdaptiveAnimatePresence>
          </div>

          {/* Forfeit Button */}
          <button
            type="button"
            onClick={() => setShowForfeitDialog(true)}
            data-testid="forfeit-btn"
            className="text-neo-white hover:text-neo-white text-sm underline"
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
