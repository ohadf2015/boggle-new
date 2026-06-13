import React, { memo, useCallback, useMemo } from 'react';
import { m } from 'framer-motion';
import { QrCode, Trophy, Share2, Bot } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import ResultsPlayerCard from '../../components/results/ResultsPlayerCard';
import WordHuntResultsSummary from '../../components/results/WordHuntResultsSummary';
import TournamentStandings from '../../components/TournamentStandings';
import { getJoinUrl, copyJoinUrl } from '../../utils/share';
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

export const QRCodeDialog: React.FC<QRCodeDialogProps> = memo(function QRCodeDialog({
  open,
  onOpenChange,
  gameCode,
  t
}: QRCodeDialogProps): React.ReactElement {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent noDescription className="sm:max-w-md bg-white text-neo-black dark:bg-neo-navy dark:text-white border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-center text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-2">
            <QrCode />
            {t('hostView.qrCode')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" />
          </div>
          <h4 className="text-3xl font-black text-neo-cyan">{gameCode}</h4>
          <p className="text-sm text-center text-slate-500 dark:text-slate-300">
            {t('hostView.scanQr')} {gameCode}
          </p>
          <p className="text-xs text-center text-slate-500">
            {getJoinUrl(gameCode)}
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={handleClose}
            className="w-full bg-neo-cyan text-neo-black font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
          >
            {t('hostView.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

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

export const ValidationModal: React.FC<ValidationModalProps> = memo(function ValidationModal({
  open,
  onOpenChange,
  playerWords,
  validations,
  onToggleValidation,
  onSubmit,
  t,
}) {
  // Memoized handler for word validation toggle
  const handleToggleWord = useCallback((word: string, isDuplicate: boolean) => {
    if (!isDuplicate) {
      onToggleValidation(null, word);
    }
  }, [onToggleValidation]);

  // Collect unique words and count duplicates
  const uniqueWords = useMemo(() => {
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

    const words = Array.from(uniqueWordsMap.values());
    words.sort((a, b) => a.word.localeCompare(b.word));
    return words;
  }, [playerWords]);
  const nonAutoVerifiedWords = uniqueWords.filter(item => !item.autoValidated);
  const autoVerifiedWords = uniqueWords.filter(item => item.autoValidated);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent noDescription className="max-w-2xl max-h-[85vh] flex flex-col bg-neo-navy text-white border-cyan-500/40">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="text-center text-2xl font-black text-neo-cyan">
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
                    <m.button
                      key={`word-${item.word}`}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 26, delay: Math.min(index * 0.02, 0.3) }}
                      onClick={() => handleToggleWord(item.word, isDuplicate)}
                      disabled={isDuplicate}
                      className={cn(
                        "p-3 rounded-neo text-center transition-all border-3 border-neo-black cursor-pointer",
                        isDuplicate
                          ? "bg-neo-orange/40 opacity-50 cursor-not-allowed"
                          : isValid
                            ? "bg-neo-cyan shadow-hard hover:shadow-hard-lg"
                            : "bg-neo-navy/80 hover:bg-neo-navy/60"
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
                    </m.button>
                  );
                })}
              </div>
            </div>

            {/* Auto-validated summary */}
            {autoVerifiedWords.length > 0 && (
              <div className="shrink-0 py-2 px-3 bg-teal-900/30 rounded-lg border border-teal-500/40 text-center">
                <span className="text-sm text-teal-300">
                  ✓ {autoVerifiedWords.length} {t('hostView.wordsAutoValidated')}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-cyan-500/30">
          <Button
            onClick={onSubmit}
            className="w-full h-12 text-lg font-black uppercase bg-accent text-accent-foreground border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
          >
            {t('hostView.submitValidation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// ==================== Final Scores Modal ====================

interface TournamentData {
  currentRound: number;
  totalRounds: number;
  isComplete: boolean;
  standings?: TournamentStanding[];
}

interface PlayersReadyData {
  readyCount: number;
  totalPlayers: number;
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
  playersReady?: PlayersReadyData | null;
  wordHuntSummary?: { targetWord: string; playerLives: Record<string, number>; eliminatedPlayers: string[]; targetFoundBy: string | null };
}

export const FinalScoresModal: React.FC<FinalScoresModalProps> = memo(function FinalScoresModal({
  open,
  onOpenChange,
  finalScores,
  tournamentData,
  username,
  t,
  onStartNewGame,
  onNextRound,
  socket,
  playersReady,
  wordHuntSummary,
}) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Filter out Host from results if they have 0 words (Broadcast Mode) implies they were spectating
  // Only filter if there are other players (don't hide if Host was testing alone)
  const filteredScores = useMemo(() => {
    if (!finalScores) return [];

    return finalScores.filter(p => {
      const isHostUser = p.username === username || p.isHost;
      // Check word count - handle different potential data structures
      const wordCount = p.wordsFoundCount ?? p.allWords?.length ?? 0;

      if (isHostUser && wordCount === 0 && finalScores.length > 1) {
        return false;
      }
      return true;
    });
  }, [finalScores, username]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent noDescription className="max-w-5xl max-h-[90vh] overflow-auto bg-neo-cream dark:bg-neo-navy border-4 border-neo-black shadow-hard-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl sm:text-4xl font-black text-neo-black dark:text-neo-yellow flex items-center justify-center gap-3">
            <Trophy className="text-neo-orange dark:text-neo-yellow" />
            {tournamentData ? t('hostView.tournamentRound') + ' ' + tournamentData.currentRound : t('hostView.finalScores')}
            <Trophy className="text-neo-orange dark:text-neo-yellow" />
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
                {filteredScores && filteredScores.length > 0 && (
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {filteredScores.map((player, index) => {
                      const allPlayerWords: Record<string, WordDetail[]> = {};
                      filteredScores.forEach(p => {
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

          {/* Word Hunt Results Summary */}
          {wordHuntSummary && (
            <div className="max-w-3xl mx-auto">
              <WordHuntResultsSummary
                targetWord={wordHuntSummary.targetWord}
                foundTarget={!!wordHuntSummary.targetFoundBy}
                isFirstFinder={wordHuntSummary.targetFoundBy === username}
                survivalTime={0}
                discoveryWords={0}
                playerResults={filteredScores.map((p) => ({
                  username: p.username,
                  score: p.score || 0,
                  survived: !wordHuntSummary.eliminatedPlayers.includes(p.username),
                  lifeRemaining: wordHuntSummary.playerLives[p.username] ?? 0,
                }))}
                currentUsername={username}
              />
            </div>
          )}

          {/* Regular Game Mode: Show only game results */}
          {!tournamentData && filteredScores && filteredScores.length > 0 && (
            <div className="space-y-3 max-w-3xl mx-auto">
              {filteredScores.map((player, index) => {
                const allPlayerWords: Record<string, WordDetail[]> = {};
                filteredScores.forEach(p => {
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

        {/* Players Ready Indicator - PROMINENT */}
        {playersReady && playersReady.totalPlayers > 0 && (
          <div className={cn(
            "py-4 px-5 rounded-neo border-3 border-neo-black shadow-hard text-center",
            playersReady.readyCount === playersReady.totalPlayers
              ? "bg-neo-lime"
              : "bg-neo-yellow"
          )}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-3xl">{playersReady.readyCount === playersReady.totalPlayers ? '🎉' : '⏳'}</span>
              <span className="font-black text-neo-black text-xl uppercase">
                {playersReady.readyCount}/{playersReady.totalPlayers} {t('hostView.playersReady')}
              </span>
            </div>
            {playersReady.readyCount < playersReady.totalPlayers && (
              <p className="text-neo-black/70 text-sm font-bold">
                {t('hostView.waitingForPlayersToReady')}
              </p>
            )}
            {playersReady.readyCount === playersReady.totalPlayers && (
              <p className="text-neo-black font-bold">
                {t('hostView.allPlayersReady')}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-3 pt-4">
          {/* HOST START GAME BUTTON - PROMINENT */}
          {tournamentData && !tournamentData.isComplete && (
            <Button
              onClick={onNextRound}
              className="w-full h-14 text-lg font-black uppercase bg-accent text-accent-foreground border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              🏁 {t('hostView.startNextRound')}
            </Button>
          )}
          {(!tournamentData || tournamentData.isComplete) && (
            <Button
              onClick={onStartNewGame}
              className="w-full h-14 text-lg font-black uppercase bg-accent text-accent-foreground border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              🎮 {t('hostView.startNewGame')}
            </Button>
          )}
          <Button onClick={handleClose} variant="outline" className="w-full border-2 border-neo-black">
            {t('hostView.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// ==================== Exit Confirmation Dialog ====================

interface ExitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = memo(function ExitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  t
}) { return (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="bg-white text-neo-black dark:bg-neo-navy dark:text-white border-red-500/30">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-slate-900 dark:text-white">
          {t('hostView.confirmExit')}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
          {t('hostView.exitWarning')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-neo-navy/30 dark:bg-neo-navy text-slate-900 dark:text-white border-neo-white/30 dark:border-neo-black/50">
          {t('common.cancel')}
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-neo-red text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
        >
          {t('common.confirm')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
); });

// ==================== Solo Start Confirm Dialog ====================

interface SoloStartConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  gameCode: string;
}

export const SoloStartConfirmDialog: React.FC<SoloStartConfirmDialogProps> = memo(function SoloStartConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  t,
  gameCode,
}) {
  const handleInvite = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const url = getJoinUrl(gameCode, 'solo-confirm');
      try {
        await navigator.share({
          title: t('share.inviteTitle'),
          text: t('share.inviteMessage'),
          url,
        });
      } catch { /* user cancelled */ }
    } else {
      await copyJoinUrl(gameCode, t, 'solo-confirm');
    }
  }, [gameCode, t]);

  return (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="bg-white text-neo-black dark:bg-neo-navy dark:text-white border-neo-cyan/30">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-slate-900 dark:text-white">
          {t('hostView.soloStartTitle')}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
          {t('hostView.soloStartDescription')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3">
        {/* Invite Friends — PRIMARY */}
        <AlertDialogAction
          data-testid="solo-dialog-invite"
          onClick={handleInvite}
          className="w-full bg-accent text-accent-foreground font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          {t('hostView.inviteFriends')}
        </AlertDialogAction>
        {/* Skip & Play with bots — SECONDARY (cyan tier; bot iconography) */}
        <AlertDialogAction
          data-testid="solo-dialog-bots"
          onClick={onConfirm}
          className="w-full bg-neo-cyan-muted text-neo-black font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed flex items-center justify-center gap-2"
        >
          <Bot className="w-4 h-4" aria-hidden="true" />
          {t('hostView.soloStartConfirm')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
); });

// ==================== Cancel Tournament Dialog ====================

interface CancelTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export const CancelTournamentDialog: React.FC<CancelTournamentDialogProps> = memo(function CancelTournamentDialog({
  open,
  onOpenChange,
  onConfirm,
  t
}) { return (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="bg-white text-neo-black dark:bg-neo-navy dark:text-white border-red-500/30">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-slate-900 dark:text-white">
          {t('hostView.confirmCancelTournament')}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
          {t('hostView.cancelTournamentWarning')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-neo-navy/30 dark:bg-neo-navy text-slate-900 dark:text-white border-neo-white/30 dark:border-neo-black/50">
          {t('common.cancel')}
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-neo-red text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
        >
          {t('common.confirm')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
); });
