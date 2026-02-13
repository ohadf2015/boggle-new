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

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Check, X, Trophy, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDuelById } from '@/lib/supabase/education/duels';
import { useDuelSocket, type DuelCompletedData, type ScoreSubmittedData } from '@/hooks/useDuelSocket';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';

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
  opponentAvatar: string | null;
  opponentId: string;
}

// ============================================
// COMPONENT
// ============================================

export function DuelGameView({ duelId, studentId, onBackToLobby }: DuelGameViewProps) {
  const { t } = useLanguage();
  const { submitScore, onDuelCompleted, onScoreSubmitted, onError } = useDuelSocket();

  // State
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [duelData, setDuelData] = useState<DuelData | null>(null);
  const [currentWord, setCurrentWord] = useState('');
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [validatedScore, setValidatedScore] = useState<ScoreSubmittedData | null>(null);
  const [result, setResult] = useState<DuelCompletedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch duel data on mount
  useEffect(() => {
    async function loadDuel() {
      setPhase('loading');
      const { data, error } = await getDuelById(duelId);

      if (error || !data) {
        setError(error?.message || 'Failed to load duel');
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
        opponentAvatar: opponent.avatar_url,
        opponentId: isChallenger ? data.opponent_id : data.challenger_id,
      });

      setPhase('playing');
    }

    loadDuel();
  }, [duelId, studentId]);

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
    if (!currentWord.trim()) return;

    const word = currentWord.trim().toUpperCase();
    if (!wordsFound.includes(word)) {
      setWordsFound((prev) => [...prev, word]);
    }
    setCurrentWord('');
  }, [currentWord, wordsFound]);

  const handleSubmitScore = useCallback(() => {
    if (wordsFound.length === 0) return;

    setPhase('submitting');
    submitScore(duelId, wordsFound);
  }, [duelId, wordsFound, submitScore]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" />
        <p className="ml-4 text-neo-white">{t('duels.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <X className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-neo-white text-lg" data-testid="duel-error">
          {error}
        </p>
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[500px] text-center p-8"
      >
        {/* Result Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={cn(
            'mb-6 p-6 rounded-neo border-neo-thick shadow-hard',
            isDraw ? 'bg-yellow-500 border-neo-black' : isWinner ? 'bg-neo-yellow border-neo-black' : 'bg-red-500 border-neo-black'
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
            <p className="text-3xl font-bold">
              {isWinner || isDraw ? result.challengerScore : result.opponentScore}
            </p>
          </div>
          <div className="text-neo-white text-3xl">vs</div>
          <div className="text-neo-white">
            <p className="text-sm opacity-70">{duelData.opponentName}</p>
            <p className="text-3xl font-bold">
              {isWinner || isDraw ? result.opponentScore : result.challengerScore}
            </p>
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
  // WAITING SCREEN (Score submitted, waiting for opponent)
  // ============================================

  if (phase === 'waiting' && validatedScore) {
    return (
      <motion.div
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
            <span className="text-neo-yellow font-bold">{validatedScore.wordsValidated}</span>
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
      </motion.div>
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
          <Swords className="w-6 h-6 text-neo-orange" />
          <h1 className="text-xl font-neo-display font-bold text-neo-white">
            {t('duels.playDuel')}
          </h1>
        </div>

        {/* Opponent Info */}
        <div className="flex items-center gap-2">
          <span className="text-neo-white/70 text-sm">{t('duels.vs')}</span>
          <span className="text-neo-white font-bold">{duelData.opponentName}</span>
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
                key={idx}
                className="aspect-square flex items-center justify-center bg-neo-yellow text-neo-black font-neo-display font-bold text-2xl rounded-neo border-neo shadow-hard-sm"
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
              value={currentWord}
              onChange={(e) => setCurrentWord(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('duels.typeWord')}
              className="flex-1 px-4 py-2 bg-neo-navy text-neo-white border-neo rounded-neo shadow-hard focus:outline-none focus:ring-2 focus:ring-neo-cyan"
            />
            <button
              onClick={handleAddWord}
              disabled={!currentWord.trim()}
              className="px-4 py-2 bg-neo-yellow text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('duels.addWord')}
            </button>
          </div>

          {/* Found Words List */}
          <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-4 mb-4 min-h-[200px] max-h-[300px] overflow-y-auto">
            <AnimatePresence>
              {wordsFound.length === 0 ? (
                <p className="text-neo-white/50 text-sm text-center py-8">
                  {t('duels.typeWord')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {wordsFound.map((word, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="px-3 py-1 bg-neo-cyan text-neo-black font-neo-body font-bold rounded-neo border-neo shadow-hard-sm"
                    >
                      {word}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitScore}
            disabled={wordsFound.length === 0 || phase === 'submitting'}
            className="w-full px-6 py-3 bg-neo-orange text-neo-white font-neo-display font-bold text-lg rounded-neo border-neo-thick shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === 'submitting' ? t('duels.loading') : t('duels.submitScore')}
          </button>
        </div>
      </div>
    </div>
  );
}
