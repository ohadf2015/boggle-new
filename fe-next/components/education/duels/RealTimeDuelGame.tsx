'use client';

/**
 * RealTimeDuelGame — orchestrator for a live 1v1 duel.
 *
 * Phases: waiting → playing → completed.
 *
 * What changed in this round (the duel had timer pressure but no payoff):
 * - every word used to be worth the same regardless of pace. The SERVER now
 *   chains words inside a combo window and pays a flat additive bonus; this
 *   screen renders that chain (DuelComboMeter) from the numbers the server
 *   sends — it never recomputes points (Class 3: one owner per number).
 * - "am I winning?" is now answered in words by DuelSwingBar, live.
 * - the end was a silent trophy badge. It is now DuelRevealScreen: the mascot's
 *   champion/defeat clip, confetti + fanfare for the winner, coins that fly
 *   into a counter, and a REMATCH that carries a best-of-3 tally.
 *
 * The layout is a locked column — the play panel owns the single scroll region,
 * so no page scroll on a phone.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '@/hooks/useSafeTimeout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { useImeText } from '@/hooks/useImeText';
import { useDuelCombo } from '@/hooks/useDuelCombo';
import { useDuelRematch } from '@/hooks/useDuelRematch';
import type {
  DuelStartedData,
  WordAcceptedData,
  WordRejectedData,
  OpponentProgressData,
  OpponentDisconnectedData,
  DuelCompletedData,
} from '@/hooks/useDuelSocket.types';
import { awardGameCoins } from '@/utils/coinManager';
import {
  duelSeriesKey,
  readDuelSeries,
  recordDuelSeriesResult,
  duelSeriesStatus,
  clearDuelSeries,
  type DuelSeries,
} from '@/lib/education/duelSeries';
import { Loader } from '@/components/ui/Loader';
import { DuelDisconnectOverlay } from './DuelDisconnectOverlay';
import { ForfeitConfirmDialog } from './ForfeitConfirmDialog';
import { DuelPlayPanel, type DuelWordStatus } from './DuelPlayPanel';
import { DuelRevealScreen, type DuelOutcome } from './DuelRevealScreen';

export interface RealTimeDuelGameProps {
  duelId: string;
  studentId: string;
  opponentName: string;
  opponentId?: string;
  lessonId?: string;
  onBackToLobby?: () => void;
}

type GamePhase = 'waiting' | 'playing' | 'completed';

const EMPTY_SERIES: DuelSeries = { mine: 0, theirs: 0, games: 0 };

export function RealTimeDuelGame({
  duelId,
  studentId,
  opponentName,
  opponentId,
  lessonId,
  onBackToLobby,
}: RealTimeDuelGameProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, playCountdownBeep, setGameActive } =
    useSoundEffects();
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
    onDuelCreated,
    onError,
  } = useDuelSocket();

  const combo = useDuelCombo();

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [boardState, setBoardState] = useState<string[][]>([]);
  const [startTime, setStartTime] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<number>(180);
  const [timeRemaining, setTimeRemaining] = useState<number>(180);
  const {
    isEmpty: currentWordEmpty,
    getValue: getCurrentWord,
    reset: resetCurrentWord,
    inputProps: wordInputProps,
  } = useImeText<HTMLInputElement>();
  const [words, setWords] = useState<DuelWordStatus[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentStreak, setOpponentStreak] = useState(0);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState(30);
  const [showForfeitDialog, setShowForfeitDialog] = useState(false);
  const [result, setResult] = useState<DuelCompletedData | null>(null);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [series, setSeries] = useState<DuelSeries>(EMPTY_SERIES);

  /**
   * A duel completes exactly once. The server can legitimately re-emit
   * duel:completed on a reconnect, and the tally must not count that as a
   * second game (Class 2: stale state across a round boundary).
   */
  const completionRecorded = useRef(false);
  const peakStreakRef = useRef(0);
  peakStreakRef.current = Math.max(peakStreakRef.current, combo.peakStreak);

  const seriesKey = opponentId && lessonId ? duelSeriesKey(opponentId, lessonId) : null;

  /**
   * A rematch stays inside the /education/duels/[duelId] segment, so React
   * reuses this instance and every ref/state below would carry game 1 into
   * game 2: the podium would still be up, and `completionRecorded` would block
   * the best-of-3 tally from ever counting another game (Class 2 — stale
   * mutable state across a round boundary). One unconditional reset, keyed on
   * the duel, beats remembering to clear six things.
   */
  const previousDuelId = useRef(duelId);
  if (previousDuelId.current !== duelId) {
    previousDuelId.current = duelId;
    completionRecorded.current = false;
    peakStreakRef.current = 0;
    setPhase('waiting');
    setResult(null);
    setWords([]);
    setMyScore(0);
    setOpponentScore(0);
    setOpponentStreak(0);
    setCoinsAwarded(0);
    setIsDisconnected(false);
    setStartTime('');
    combo.reset();
  }

  // Sound gate follows the live phase
  useEffect(() => {
    const isPlaying = phase === 'playing';
    setGameActive(isPlaying);
    return () => setGameActive(false);
  }, [phase, setGameActive]);

  useEffect(() => {
    if (phase === 'playing' && timeRemaining <= 10 && timeRemaining > 0) {
      playCountdownBeep(timeRemaining);
    }
  }, [timeRemaining, phase, playCountdownBeep]);

  useInterval(
    () => {
      const start = new Date(startTime).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setTimeRemaining(Math.max(0, timeLimit - elapsed));
    },
    phase === 'playing' && startTime ? 100 : null
  );

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
      // Streak + bonus are the SERVER's numbers; the meter only renders them.
      combo.registerAccepted(data.comboStreak ?? 0, data.comboBonus ?? 0);
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
      combo.registerRejected(data.comboStreak ?? 0);
      playWordRejectedSound();
    });

    const cleanupOpponentProgress = onOpponentProgress((data: OpponentProgressData) => {
      setOpponentScore(data.totalScore);
      setOpponentStreak(data.comboStreak ?? 0);
    });

    const cleanupDisconnected = onOpponentDisconnected((data: OpponentDisconnectedData) => {
      setIsDisconnected(true);
      setGracePeriodSeconds(data.gracePeriodSeconds);
    });

    const cleanupReconnected = onOpponentReconnected(() => setIsDisconnected(false));

    const cleanupCompleted = onDuelCompleted((data: DuelCompletedData) => {
      setResult(data);
      setPhase('completed');

      if (completionRecorded.current) return;
      completionRecorded.current = true;

      const isWinner = data.winnerId === studentId;
      const isDraw = data.winnerId === null;
      const finalScore = isWinner
        ? Math.max(data.challengerScore, data.opponentScore)
        : Math.min(data.challengerScore, data.opponentScore);

      const award = awardGameCoins(duelId, 'multiplayer', finalScore, isWinner ? 1 : 2, 2);
      setCoinsAwarded(award?.awarded ?? 0);

      if (seriesKey) {
        setSeries(recordDuelSeriesResult(seriesKey, isDraw ? 'draw' : isWinner ? 'win' : 'loss'));
      }
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
    // combo callbacks are stable useCallback handles
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    seriesKey,
  ]);

  const handleSubmitWord = useCallback(() => {
    const raw = getCurrentWord();
    if (!raw) return;

    const word = raw.toUpperCase();
    if (words.find((w) => w.word === word)) {
      resetCurrentWord();
      return;
    }

    setWords((prev) => [...prev, { word, status: 'pending' }]);
    submitWord(duelId, word);
    resetCurrentWord();
  }, [getCurrentWord, resetCurrentWord, duelId, submitWord, words]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') handleSubmitWord();
    },
    [handleSubmitWord]
  );

  const handleForfeit = useCallback(() => {
    forfeitDuel(duelId);
    setShowForfeitDialog(false);
  }, [duelId, forfeitDuel]);

  const status = duelSeriesStatus(series);

  // A decided series starts over on the next duel rather than piling up a 4th.
  const handleBeforeRematch = useCallback(() => {
    if (seriesKey && status !== 'open') clearDuelSeries(seriesKey);
  }, [seriesKey, status]);

  const {
    pending: rematchPending,
    canRematch,
    requestRematch,
  } = useDuelRematch({
    socket: duelSocket,
    opponentId,
    lessonId,
    onDuelCreated,
    onError,
    onBeforeRequest: handleBeforeRematch,
  });

  // ---------- waiting ----------
  if (phase === 'waiting') {
    return (
      <div
        className="flex min-h-[400px] items-center justify-center"
        data-testid="realtime-duel-game"
      >
        <Loader size="lg" />
        <p className="ms-4 text-neo-white">{t('duels.waitingForOpponent')}</p>
      </div>
    );
  }

  // ---------- completed ----------
  if (phase === 'completed' && result) {
    const isWinner = result.winnerId === studentId;
    const isDraw = result.winnerId === null;
    const outcome: DuelOutcome = isDraw ? 'draw' : isWinner ? 'win' : 'loss';
    const xp = isWinner ? result.xpAwarded.winner : result.xpAwarded.loser;

    return (
      <div data-testid="realtime-duel-game">
        <DuelRevealScreen
          outcome={outcome}
          myScore={myScore}
          opponentScore={opponentScore}
          myName={t('duels.you')}
          opponentName={opponentName}
          xp={xp}
          coins={coinsAwarded}
          peakStreak={peakStreakRef.current}
          series={series}
          seriesStatus={status}
          onRematch={canRematch ? requestRematch : undefined}
          rematchPending={rematchPending}
          onBackToLobby={onBackToLobby}
        />
      </div>
    );
  }

  // ---------- playing ----------
  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden"
      data-testid="realtime-duel-game"
    >
      <DuelPlayPanel
        boardState={boardState}
        words={words}
        myScore={myScore}
        opponentScore={opponentScore}
        opponentName={opponentName}
        myName={t('duels.you')}
        comboStreak={combo.streak}
        comboBonus={combo.bonus}
        opponentStreak={opponentStreak}
        timeRemaining={timeRemaining}
        wordInputProps={wordInputProps as unknown as Record<string, unknown>}
        currentWordEmpty={currentWordEmpty}
        onSubmitWord={handleSubmitWord}
        onKeyDown={handleKeyPress}
        onForfeit={() => setShowForfeitDialog(true)}
      />

      {isDisconnected && (
        <DuelDisconnectOverlay
          opponentName={opponentName}
          gracePeriodSeconds={gracePeriodSeconds}
        />
      )}

      <ForfeitConfirmDialog
        open={showForfeitDialog}
        onConfirm={handleForfeit}
        onCancel={() => setShowForfeitDialog(false)}
      />
    </div>
  );
}
