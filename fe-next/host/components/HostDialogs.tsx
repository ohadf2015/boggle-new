import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaQrcode, FaTrophy } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import ResultsPlayerCard from '../../components/results/ResultsPlayerCard';
import TournamentStandings from '../../components/TournamentStandings';
import { getJoinUrl } from '../../utils/share';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { cn } from '../../lib/utils';
import type { Socket } from 'socket.io-client';
import type { PlayerResult, WordToVote } from '@/types/components';
import type { TournamentStanding, WordDetail } from '@/shared/types/game';

// ==================== QR Code Dialog ====================

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export const QRCodeDialog: React.FC<QRCodeDialogProps> = ({
  open,
  onOpenChange,
  gameCode,
  t
}): React.ReactElement => {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-cyan-500/30">
      <DialogHeader>
        <DialogTitle className="text-center text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-2">
          <FaQrcode />
          {t('hostView.qrCode')}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" />
        </div>
        <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{gameCode}</h4>
        <p className="text-sm text-center text-slate-500 dark:text-slate-400">
          {t('hostView.scanQr')} {gameCode}
        </p>
        <p className="text-xs text-center text-slate-500">
          {getJoinUrl(gameCode)}
        </p>
      </div>
      <DialogFooter>
        <Button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
        >
          {t('hostView.close')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

// ==================== Validation Modal ====================

interface PlayerWordData {
  username: string;
  words: Array<{
    word: string;
    autoValidated?: boolean;
    inDictionary?: boolean;
  }>;
}

interface ValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerWords: PlayerWordData[];
  validations: Record<string, boolean>;
  onToggleValidation: (playerId: string | null, word: string) => void;
  onSubmit: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  open,
  onOpenChange,
  playerWords,
  validations,
  onToggleValidation,
  onSubmit,
  t,
}): React.ReactElement => {
  // Memoized handler for word validation toggle
  const handleToggleWord = useCallback((word: string, isDuplicate: boolean) => {
    if (!isDuplicate) {
      onToggleValidation(null, word);
    }
  }, [onToggleValidation]);

  // Collect unique words and count duplicates
  const getUniqueWords = () => {
    const uniqueWordsMap = new Map<string, {
      word: string;
      playerCount: number;
      players: string[];
      autoValidated: boolean;
      inDictionary?: boolean;
    }>();

    playerWords.forEach(player => {
      player.words.forEach(wordObj => {
        const word = wordObj.word;
        if (!uniqueWordsMap.has(word)) {
          uniqueWordsMap.set(word, {
            word: word,
            playerCount: 1,
            players: [player.username],
            autoValidated: wordObj.autoValidated || false,
            inDictionary: wordObj.inDictionary
          });
        } else {
          const existing = uniqueWordsMap.get(word)!;
          existing.playerCount++;
          existing.players.push(player.username);
        }
      });
    });

    const uniqueWords = Array.from(uniqueWordsMap.values());
    uniqueWords.sort((a, b) => a.word.localeCompare(b.word));
    return uniqueWords;
  };

  const uniqueWords = getUniqueWords();
  const nonAutoVerifiedWords = uniqueWords.filter(item => !item.autoValidated);
  const autoVerifiedWords = uniqueWords.filter(item => item.autoValidated);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border-cyan-500/40">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-center text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {t('hostView.validation')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            {/* Words to validate - Grid layout */}
            <div className="flex-1 overflow-auto min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
                {nonAutoVerifiedWords.map((item, index) => {
                  const isDuplicate = item.playerCount > 1;
                  const isValid = validations[item.word] !== undefined ? validations[item.word] : true;

                  return (
                    <motion.button
                      key={`word-${item.word}`}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      onClick={() => handleToggleWord(item.word, isDuplicate)}
                      disabled={isDuplicate}
                      className={cn(
                        "p-3 rounded-lg text-center transition-all border-2 cursor-pointer",
                        isDuplicate
                          ? "bg-orange-900/40 border-orange-500/50 opacity-50 cursor-not-allowed"
                          : isValid
                            ? "bg-gradient-to-br from-cyan-600/80 to-teal-600/80 border-cyan-400/60 hover:border-cyan-300 shadow-lg shadow-cyan-500/20"
                            : "bg-slate-800/80 border-slate-600/50 hover:border-slate-500"
                      )}
                    >
                      <span className={cn(
                        "text-xl font-bold block",
                        isDuplicate ? "line-through text-orange-300/60" :
                        isValid ? "text-white" : "text-slate-500"
                      )}>
                        {applyHebrewFinalLetters(item.word).toUpperCase()}
                      </span>
                      {isDuplicate && (
                        <span className="text-xs text-orange-400 mt-1 block">
                          {item.playerCount} {t('joinView.players')}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Auto-validated summary */}
            {autoVerifiedWords.length > 0 && (
              <div className="flex-shrink-0 py-2 px-3 bg-teal-900/30 rounded-lg border border-teal-500/40 text-center">
                <span className="text-sm text-teal-300">
                  ✓ {autoVerifiedWords.length} {t('hostView.wordsAutoValidated') || 'auto-validated'}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-3 border-t border-cyan-500/30">
          <Button
            onClick={onSubmit}
            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 text-white"
          >
            {t('hostView.submitValidation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Final Scores Modal ====================

interface TournamentData {
  currentRound: number;
  totalRounds: number;
  isComplete: boolean;
  standings?: TournamentStanding[];
}

interface FinalScoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalScores: PlayerResult[];
  tournamentData: TournamentData | null;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  onStartNewGame: () => void;
  onNextRound: () => void;
  socket: Socket | null;
}

export const FinalScoresModal: React.FC<FinalScoresModalProps> = ({
  open,
  onOpenChange,
  finalScores,
  tournamentData,
  username,
  t,
  onStartNewGame,
  onNextRound,
  socket,
}): React.ReactElement => {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <DialogHeader>
        <DialogTitle className="text-center text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center gap-3">
          <FaTrophy className="text-yellow-500" />
          {tournamentData ? t('hostView.tournamentRound') + ' ' + tournamentData.currentRound : t('hostView.finalScores')}
          <FaTrophy className="text-yellow-500" />
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Tournament Mode: Show both round results AND tournament standings */}
        {tournamentData && (
          <>
            {/* Current Round Results */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center text-purple-600 dark:text-purple-300">
                Round {tournamentData.currentRound} Results
              </h3>
              {finalScores && finalScores.length > 0 && (
                <div className="space-y-3 max-w-3xl mx-auto">
                  {finalScores.map((player, index) => {
                    const allPlayerWords: Record<string, WordDetail[]> = {};
                    finalScores.forEach(p => {
                      allPlayerWords[p.username] = p.allWords || [];
                    });
                    return (
                      <ResultsPlayerCard
                        key={player.username}
                        player={player}
                        index={index}
                        allPlayerWords={allPlayerWords}
                        currentUsername={username}
                        isWinner={index === 0}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Overall Tournament Standings */}
            {tournamentData.standings && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-center text-amber-600 dark:text-amber-300">
                  Tournament Standings (After Round {tournamentData.currentRound})
                </h3>
                <div className="max-w-3xl mx-auto">
                  <TournamentStandings
                    standings={tournamentData.standings}
                    currentRound={tournamentData.currentRound}
                    totalRounds={tournamentData.totalRounds}
                    isComplete={tournamentData.isComplete}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Regular Game Mode: Show only game results */}
        {!tournamentData && finalScores && finalScores.length > 0 && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {finalScores.map((player, index) => {
              const allPlayerWords: Record<string, WordDetail[]> = {};
              finalScores.forEach(p => {
                allPlayerWords[p.username] = p.allWords || [];
              });
              return (
                <ResultsPlayerCard
                  key={player.username}
                  player={player}
                  index={index}
                  allPlayerWords={allPlayerWords}
                  currentUsername={username}
                  isWinner={index === 0}
                />
              );
            })}
          </div>
        )}
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        {tournamentData && !tournamentData.isComplete && (
          <Button
            onClick={onNextRound}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500"
          >
            🏁 {t('hostView.nextRound')}
          </Button>
        )}
        {(!tournamentData || tournamentData.isComplete) && (
          <Button
            onClick={onStartNewGame}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
          >
            🎮 {t('hostView.startNewGame')}
          </Button>
        )}
        <Button onClick={handleClose} variant="outline" className="w-full">
          {t('hostView.close')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

// ==================== Exit Confirmation Dialog ====================

interface ExitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  t
}): React.ReactElement => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-slate-900 dark:text-white">
          {t('hostView.confirmExit')}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
          {t('hostView.exitWarning')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
          {t('common.cancel')}
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
        >
          {t('common.confirm')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// ==================== Cancel Tournament Dialog ====================

interface CancelTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export const CancelTournamentDialog: React.FC<CancelTournamentDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  t
}): React.ReactElement => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-slate-900 dark:text-white">
          {t('hostView.confirmCancelTournament') || 'Cancel Tournament?'}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
          {t('hostView.cancelTournamentWarning') || 'Are you sure you want to cancel the tournament? All progress will be lost and this cannot be undone.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
          {t('common.cancel')}
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
        >
          {t('common.confirm')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
