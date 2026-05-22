'use client';

/**
 * DuelGameView - Async Duel Gameplay Screen
 *
 * Student plays a frozen board and submits their score
 * Flow: Load frozen board → Find words → Submit score → Show results
 *
 * Features:
 * - Frozen board rendering (4x4 grid)
 * - Word finding interface (text input + submit)
 * - Score submission via Socket.IO
 * - Results screen (win/loss/draw with XP)
 * - Neo-brutalist styling
 * - RTL support
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Swords, Check, X, Trophy, Flame, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDuelById } from '@/lib/supabase/education/duels';
import { useDuelSocket, type DuelCompletedData, type ScoreSubmittedData } from '@/hooks/useDuelSocket';
import { useImeText } from '@/hooks/useImeText';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import { PageLoader } from '@/components/ui/PageLoader';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DuelGameViewProps {
  /** Duel ID to play */
  duelId: string;
  /** Current student ID */
  studentId: string;
  /** Callback when user wants to return to lobby */
  onBackToLobby?: () => void;
}

type GamePhase = 'loading' | 'playing' | 'submitting' | 'waiting' | 'completed';

interface DuelData {
  id: string;
  boardState: string[][];
  opponentName: string;
  opponentAvatar: Record<string, unknown> | null;
  opponentId: string;
  isChallenger: boolean;
  lessonId: string;
  classroomId: string;
}

// ============================================
// COMPONENT
// ============================================

export function DuelGameView({ duelId, studentId, onBackToLobby }: DuelGameViewProps) {
  const { t } = useLanguage();
  const { submitScore, createChallenge, onDuelCompleted, onScoreSubmitted, onError } = useDuelSocket();

  // G4 fix: Async duel timer (3 minutes default)
  const DUEL_TIME_LIMIT_SECONDS = 180;

  // State
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [duelData, setDuelData] = useState<DuelData | null>(null);
  const {
    value: currentWord,
    isEmpty: currentWordEmpty,
    getValue: getCurrentWord,
    reset: resetCurrentWord,
    inputProps: wordInputProps,
  } = useImeText<HTMLInputElement>();
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [validatedScore, setValidatedScore] = useState<ScoreSubmittedData | null>(null);
  const [result, setResult] = useState<DuelCompletedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(DUEL_TIME_LIMIT_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitTriggered = useRef(false);
  const wordsFoundRef = useRef<string[]>([]);
  useEffect(() => {
    wordsFoundRef.current = wordsFound;
  }, [wordsFound]);

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch duel data on mount
  useEffect(() => {
    async function loadDuel() {
      setPhase('loading');
      const { data, error } = await getDuelById(duelId);

      if (error || !data) {
        setError(error?.message || t('errors.loadFailed', 'Failed to load duel'));
        setPhase('playing'); // Set to non-loading phase so error renders
        return;
      }

      // Determine opponent based on studentId
      const isChallenger = data.challenger_id === studentId;
      const opponent = isChallenger ? data.opponent : data.challenger;

      setDuelData({
        id: data.id,
        boardState: data.board_state || [],
        opponentName: opponent.display_name,
        opponentAvatar: opponent.avatar_config,
        opponentId: isChallenger ? data.opponent_id : data.challenger_id,
        isChallenger,
        lessonId: data.lesson_id,
        classroomId: data.classroom_id,
      });

      setPhase('playing');
    }

    loadDuel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId, studentId]);

  // G4 fix: Countdown timer — auto-submits when time expires
  useEffect(() => {
    if (phase !== 'playing') {
      // Clear timer when not in playing phase
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up — auto-submit
          if (!autoSubmitTriggered.current) {
            autoSubmitTriggered.current = true;
            // Use setTimeout to avoid state update during render
            setTimeout(() => {
              const words = wordsFoundRef.current;
              submitScore(duelId, words);
              setPhase('submitting');
            }, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, duelId, submitScore]);

  // Socket event listeners
  useEffect(() => {
    const cleanupCompleted = onDuelCompleted((data) => {
      setResult(data);
      setPhase('completed');
    });

    const cleanupScoreSubmitted = onScoreSubmitted((data) => {
      setValidatedScore(data);
      setPhase('waiting');
    });

    const cleanupError = onError((data) => {
      setError(data.message);
      setPhase('playing');
    });

    return () => {
      cleanupCompleted();
      cleanupScoreSubmitted();
      cleanupError();
    };
  }, [onDuelCompleted, onScoreSubmitted, onError]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAddWord = useCallback(() => {
    const raw = getCurrentWord();
    if (!raw) return;

    const word = raw.toUpperCase();
    if (!wordsFound.includes(word)) {
      setWordsFound((prev) => [...prev, word]);
    }
    resetCurrentWord();
  }, [getCurrentWord, resetCurrentWord, wordsFound]);

  const handleSubmitScore = useCallback(() => {
    if (wordsFound.length === 0) return;

    setPhase('submitting');
    submitScore(duelId, wordsFound);
  }, [duelId, wordsFound, submitScore]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') {
        handleAddWord();
      }
    },
    [handleAddWord]
  );

  // ============================================
  // RENDER HELPERS
  // ============================================

  if (phase === 'loading') {
    return <PageLoader text={t('education.duels.loading')} size="lg" nested />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <X className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-neo-white text-lg mb-6" data-testid="duel-error">
          {error}
        </p>
        <button
          onClick={onBackToLobby}
          className="px-6 py-3 bg-neo-cyan text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
        >
          {t('duels.backToLobby')}
        </button>
      </div>
    );
  }

  if (!duelData) {
    return null;
  }

  // ============================================
  // RESULTS SCREEN
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
      >
        {/* Result Badge */}
        <AdaptiveMotion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={cn(
            'mb-6 p-6 rounded-neo border-neo-thick shadow-hard',
            isDraw ? 'bg-yellow-500 border-neo-black' : isWinner ? 'bg-neo-lime border-neo-black' : 'bg-red-500 border-neo-black'
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
            <p className="text-3xl font-bold">
              {duelData.isChallenger ? result.challengerScore : result.opponentScore}
            </p>
          </div>
          <div className="text-neo-white text-3xl">{t('duels.vs')}</div>
          <div className="text-neo-white">
            <p className="text-sm opacity-70">{duelData.opponentName}</p>
            <p className="text-3xl font-bold">
              {duelData.isChallenger ? result.opponentScore : result.challengerScore}
            </p>
          </div>
        </div>

        {/* XP Earned */}
        <div className="flex items-center gap-2 mb-8 p-4 bg-neo-navy border-neo rounded-neo shadow-hard">
          <Flame className="w-6 h-6 text-neo-pink" />
          <span className="text-neo-white font-neo-body">
            {t('duels.xpEarned')}: <span className="font-bold text-neo-lime">{xp}</span>
          </span>
        </div>

        {/* G5 fix: Rematch + Back Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (duelData) {
                createChallenge(duelData.opponentId, duelData.lessonId, duelData.classroomId);
                onBackToLobby?.();
              }
            }}
            className="px-6 py-3 bg-neo-pink text-neo-white font-neo-display font-bold rounded-neo border-neo-thick shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            {t('duels.rematch')}
          </button>
          <button
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
  // WAITING SCREEN (Score submitted, waiting for opponent)
  // ============================================

  if (phase === 'waiting' && validatedScore) {
    return (
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[500px] text-center p-8"
      >
        <Loader size="lg" className="mb-6" />
        <h2 className="text-2xl font-neo-display font-bold text-neo-white mb-4">
          {t('duels.waitingForOpponent')}
        </h2>

        {/* Score Feedback */}
        <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-6 mb-6 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-neo-white">{t('duels.wordsAccepted')}</span>
            </div>
            <span className="text-neo-lime font-bold">{validatedScore.wordsValidated}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              <span className="text-neo-white">{t('duels.wordsRejected')}</span>
            </div>
            <span className="text-red-400 font-bold">{validatedScore.wordsRejected}</span>
          </div>
        </div>

        <p className="text-neo-white/70 text-sm">
          {t('duels.scoreToBeat')}: <span className="font-bold">{validatedScore.score}</span>
        </p>
      </AdaptiveMotion.div>
    );
  }

  // ============================================
  // PLAYING SCREEN
  // ============================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-neo-navy border-neo rounded-neo shadow-hard">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-neo-pink" />
          <h1 className="text-xl font-neo-display font-bold text-neo-white">
            {t('duels.playDuel')}
          </h1>
        </div>

        {/* Timer + Opponent Info */}
        <div className="flex items-center gap-4">
          {/* G4: Countdown timer */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-neo border-neo font-neo-display font-bold',
            timeRemaining <= 30 ? 'bg-red-500 text-neo-white animate-pulse' :
            timeRemaining <= 60 ? 'bg-neo-pink text-neo-black' :
            'bg-neo-lime text-neo-black'
          )}>
            <Clock className="w-4 h-4" />
            <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neo-white/70 text-sm">{t('duels.vs')}</span>
            <span className="text-neo-white font-bold">{duelData.opponentName}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Board Grid */}
        <div>
          <h2 className="text-lg font-neo-display font-bold text-neo-white mb-4">
            {t('duels.findWords')}
          </h2>
          <div
            className="grid grid-cols-4 gap-2 p-4 bg-neo-navy border-neo-thick rounded-neo shadow-hard"
            data-testid="duel-board-grid"
          >
            {duelData.boardState.flat().map((letter, idx) => (
              <div
                key={`cell-${idx}-${letter}`}
                className="aspect-square flex items-center justify-center bg-neo-lime text-neo-black font-neo-display font-bold text-2xl rounded-neo border-neo shadow-hard-sm"
                data-testid={`board-letter-${idx}`}
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
              className="flex-1 px-4 py-2 bg-neo-navy text-neo-white border-neo rounded-neo shadow-hard focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
            />
            <button
              onClick={handleAddWord}
              aria-disabled={currentWordEmpty}
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
              {wordsFound.length === 0 ? (
                <p className="text-neo-white/50 text-sm text-center py-8">
                  {t('duels.typeWord')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {wordsFound.map((word, idx) => (
                    <AdaptiveMotion.div
                      key={`word-${idx}-${word}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="px-3 py-1 bg-neo-cyan text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard-sm"
                    >
                      {word}
                    </AdaptiveMotion.div>
                  ))}
                </div>
              )}
            </AdaptiveAnimatePresence>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitScore}
            disabled={wordsFound.length === 0 || phase === 'submitting'}
            className="w-full px-6 py-3 bg-neo-pink text-neo-white font-neo-display font-bold text-lg rounded-neo border-neo-thick shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === 'submitting' ? t('duels.loading') : t('duels.submitScore')}
          </button>
        </div>
      </div>
    </div>
  );
}
